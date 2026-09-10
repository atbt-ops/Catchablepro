"""Shared web layer for the Catchablepro app.

Templates (+ Jinja globals), config, CSRF, security headers, and the request
helpers and domain helpers used by the route modules. Imported by app/main.py
and (later) app/routes/*. Must not import from app.main or app.routes.
"""
from __future__ import annotations

import hashlib
import logging
import os
import re
import secrets
import sqlite3
import threading
import time
from functools import lru_cache
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.parse import urlencode, urlparse
from typing import Optional

from fastapi import HTTPException, Request, UploadFile
from fastapi.responses import RedirectResponse, Response
from fastapi.templating import Jinja2Templates
from markupsafe import Markup

from html import escape

from . import ai, audit, auth, mailer, pricing, totp
from .richtext import sanitize_html
from .db import AUTO_APPLY_MIN_MATCH, EMPLOYER_MATCH_THRESHOLD, UPLOAD_DIR
from .matching import match_detail, match_pct


# --- Resume uploads --------------------------------------------------------- #
# A resume is a document, not a payload. Without a ceiling one upload can fill
# the disk or exhaust memory, and with a single instance that is the whole site.
MAX_RESUME_BYTES = 5 * 1024 * 1024   # 5 MB
RESUME_CHUNK_BYTES = 64 * 1024       # streamed, so peak memory is one chunk
ALLOWED_RESUME_SUFFIXES = {".pdf", ".docx", ".txt", ".md", ".text"}

# --- Page sizes ------------------------------------------------------------- #
JOBS_PER_PAGE = 10        # candidate's ranked job list
MY_APPS_PER_PAGE = 10     # candidate's own applications
EMPLOYER_JOBS_PER_PAGE = 10
MATCHES_PER_PAGE = 20     # ranked candidates for a job
APPLICANTS_PER_PAGE = 20  # applicants in the hiring pipeline

BASE_DIR = Path(__file__).resolve().parent
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# --------------------------------------------------------------------------- #
# Environment / security config
# --------------------------------------------------------------------------- #
IS_PROD = os.environ.get("ENV", "dev").lower() == "production"
_DEV_SECRET = "dev-secret-change-me"
SECRET_KEY = os.environ.get("SECRET_KEY", _DEV_SECRET)
if IS_PROD and SECRET_KEY == _DEV_SECRET:
    raise RuntimeError(
        "SECRET_KEY must be set to a strong random value when ENV=production."
    )

# A job portal that cannot send email cannot onboard anyone: verification gates
# applying and posting, and a password reset link that only reaches the log
# leaves the user locked out. The console backend is the right default for
# development precisely because it sends nothing — which in production is a
# silent failure that looks exactly like a working deploy. So production has to
# say out loud that it wants it.
ALLOW_CONSOLE_EMAIL = os.environ.get("ALLOW_CONSOLE_EMAIL", "").strip().lower() in (
    "1", "true", "yes",
)
if IS_PROD and not ALLOW_CONSOLE_EMAIL and not mailer.is_configured():
    raise RuntimeError(
        f"Email is not deliverable (EMAIL_BACKEND={mailer.backend()!r}) but "
        "ENV=production. Signup verification and password resets would go to "
        "the log instead of to users. Configure EMAIL_BACKEND=smtp or "
        "sendgrid with its credentials, or set ALLOW_CONSOLE_EMAIL=1 to run a "
        "demo deploy that knowingly sends no mail."
    )


def _public_url_from_env() -> str:
    """Return the canonical public origin, if the host has configured one.

    Email links must never be assembled from a client-controlled Host header on
    a public deployment. ``PUBLIC_URL`` fixes that while preserving the simple
    request-derived links used by local development and existing deployments.
    """
    value = os.environ.get("PUBLIC_URL", "").strip().rstrip("/")
    if not value:
        return ""
    parsed = urlparse(value)
    if (
        parsed.scheme != "https"
        or not parsed.netloc
        or parsed.path not in ("", "/")
        or parsed.params
        or parsed.query
        or parsed.fragment
    ):
        raise RuntimeError(
            "PUBLIC_URL must be an HTTPS site origin, for example "
            "https://jobs.example.com (with no path, query, or fragment)."
        )
    return value


PUBLIC_URL = _public_url_from_env()


def _configured_hosts() -> list[str]:
    """Build a narrow production Host allow-list when one is configured."""
    explicit = [
        host.strip() for host in os.environ.get("TRUSTED_HOSTS", "").split(",")
        if host.strip()
    ]
    if PUBLIC_URL:
        public_host = urlparse(PUBLIC_URL).netloc
        if public_host not in explicit:
            explicit.append(public_host)
    if explicit:
        # Docker's health probe and the loopback-only operator endpoint need to
        # remain valid without opening the app to a LAN or Internet host. This
        # applies whenever an allow-list is active at all: setting TRUSTED_HOSTS
        # without PUBLIC_URL used to reject the container's own HEALTHCHECK,
        # which marks it unhealthy and restarts it forever.
        explicit.extend(["localhost", "127.0.0.1"])
    return list(dict.fromkeys(explicit))


TRUSTED_HOSTS = _configured_hosts()


def public_base_url(request: Request) -> str:
    """Prefer the configured external origin for password and verification mail."""
    return PUBLIC_URL or str(request.base_url).rstrip("/")


# --------------------------------------------------------------------------- #
# CSRF protection (double-submit token stored in the signed session)
# --------------------------------------------------------------------------- #
def get_csrf(request: Request) -> str:
    token = request.session.get("csrf")
    if not token:
        token = secrets.token_urlsafe(32)
        request.session["csrf"] = token
    return token


def csrf_field(request: Request) -> Markup:
    """Hidden <input> carrying the session CSRF token, for use inside forms."""
    return Markup(
        f'<input type="hidden" name="csrf_token" value="{get_csrf(request)}">'
    )


async def verify_csrf(request: Request) -> None:
    """Dependency for state-changing routes: reject a missing/mismatched token."""
    form = await request.form()
    submitted = form.get("csrf_token")
    expected = request.session.get("csrf")
    if not expected or not submitted or not secrets.compare_digest(str(submitted), expected):
        raise HTTPException(status_code=403, detail="Invalid or missing CSRF token.")


templates.env.globals["csrf_field"] = csrf_field


# --------------------------------------------------------------------------- #
# Display helpers (exposed to templates)
# --------------------------------------------------------------------------- #
ONBOARDING_DONE = 3  # step 1 = company details, 2 = first job, 3 = complete

# Salary is captured in lakhs per annum (LPA). These bounds reject values typed
# in rupees (e.g. 800000) instead of lakhs (8).
SALARY_MIN_LPA = 0.5
SALARY_MAX_LPA = 100.0

# --- Rate limits: (max attempts, window in seconds) ------------------------- #
LOGIN_LIMIT = (8, 15 * 60)        # per email — slows password guessing
RESET_REQUEST_LIMIT = (5, 60 * 60)  # per email — stops reset-mail spam
CONTACT_EMAIL_LIMIT = (30, 60 * 60)  # per employer — stops mass mailing


VERIFY_RESEND_LIMIT = (5, 60 * 60)  # per user — stops verification-mail spam
TWOFA_LIMIT = (10, 15 * 60)         # per user — slows 2FA code guessing


def _login_success(request: Request, db: sqlite3.Connection, user):
    """Finish login, or divert to the 2FA challenge when it's enabled."""
    if user["totp_enabled"]:
        # No user_id yet — a pending marker cannot access anything behind _require.
        request.session["pending_2fa"] = user["id"]
        return RedirectResponse("/2fa", status_code=303)
    request.session["user_id"] = user["id"]
    return RedirectResponse(_post_login_url(db, user), status_code=303)


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _send_verification_email(request: Request, db: sqlite3.Connection, user) -> None:
    token = auth.create_verification_token(db, user["id"])
    link = public_base_url(request) + f"/verify-email?token={token}"
    mailer.send_email(
        to=user["email"],
        subject="Confirm your Catchablepro email address",
        body=(
            f"Hi {user['name'] or 'there'},\n\n"
            f"Please confirm your email address to activate your Catchablepro "
            f"account. This link is valid for {auth.VERIFY_TOKEN_TTL_HOURS} hours:\n\n"
            f"{link}\n\n"
            f"If you didn't create this account, you can ignore this email.\n"
        ),
    )
COMPANY_SIZES = [
    "1-10 employees", "11-50 employees", "51-200 employees",
    "201-500 employees", "501-1000 employees", "1000+ employees",
]

# --- Applicant tracking pipeline ------------------------------------------- #
# Ordered progression, then the two off-track outcomes.
PIPELINE_STAGES = ["applied", "shortlisted", "interview", "offered", "hired"]
OTHER_STAGES = ["on_hold", "rejected"]
APPLICATION_STAGES = PIPELINE_STAGES + OTHER_STAGES
STAGE_LABELS = {
    "applied": "Applied",
    "shortlisted": "Shortlisted",
    "interview": "Interview",
    "offered": "Offered",
    "hired": "Hired",
    "on_hold": "On hold",
    "rejected": "Rejected",
}

EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Internship", "Freelance"]
WORK_MODES = ["On-site", "Hybrid", "Remote"]
INDIA_LOCATIONS = [
    "Bengaluru", "Chennai", "Hyderabad", "Pune", "Mumbai", "Delhi NCR",
    "Gurugram", "Noida", "Kolkata", "Ahmedabad", "Jaipur", "Remote",
]
EDUCATION_LEVELS = ["Any", "Diploma", "Graduate", "Post Graduate", "Doctorate"]
DEPARTMENTS = [
    "Engineering", "Data Science", "Product", "Design", "Sales", "Marketing",
    "Human Resources", "Finance", "Operations", "Customer Support", "Other",
]

# Job-search facets with fixed buckets (the labels double as the query values).
EXPERIENCE_BUCKETS = ["0-1 yrs", "1-3 yrs", "3-6 yrs", "6-10 yrs", "10+ yrs"]
SALARY_BUCKETS = ["0-3 LPA", "3-6 LPA", "6-10 LPA", "10-15 LPA", "15+ LPA"]
DATE_POSTED = ["Last 24 hours", "Last 3 days", "Last 7 days"]
_POSTED_DAYS = {"Last 24 hours": 1, "Last 3 days": 3, "Last 7 days": 7}


def _bucket_low(label: str) -> float:
    """Leading number of a '3-6 yrs' / '10+ LPA' style bucket label."""
    m = re.match(r"\s*(\d+(?:\.\d+)?)", label)
    return float(m.group(1)) if m else 0.0


def fmt_salary(job) -> str:
    """'₹8–12 LPA', '₹8 LPA', or 'Not disclosed'."""
    if job["hide_salary"]:
        return "Not disclosed"
    lo, hi = job["salary_min"] or 0, job["salary_max"] or 0
    if not lo and not hi:
        return "Not disclosed"
    if lo and hi:
        return f"₹{lo:g}–{hi:g} LPA"
    return f"₹{(lo or hi):g} LPA"


def fmt_exp(job) -> str:
    """'Fresher', '3 yrs', or '3–6 yrs'."""
    lo, hi = job["exp_min"] or 0, job["exp_max"] or 0
    if not lo and not hi:
        return "Fresher"
    if lo == hi:
        return f"{lo} yr" if lo == 1 else f"{lo} yrs"
    return f"{lo}–{hi} yrs"


def posted_ago(value: str) -> str:
    """'Just posted', 'Posted 3d ago', 'Posted 30+ days ago' from a UTC timestamp."""
    if not value:
        return ""
    try:
        when = datetime.fromisoformat(str(value)).replace(tzinfo=timezone.utc)
    except ValueError:
        return ""
    secs = (datetime.now(timezone.utc) - when).total_seconds()
    if secs < 3600:
        return "Just posted"
    if secs < 86400:
        hrs = int(secs // 3600)
        return f"Posted {hrs}h ago"
    days = int(secs // 86400)
    if days == 1:
        return "Posted 1 day ago"
    if days <= 30:
        return f"Posted {days} days ago"
    return "Posted 30+ days ago"


def description_html(value: str) -> Markup:
    """Render a job description safely.

    Newer descriptions are sanitized HTML from the editor; older ones are plain
    text. Either way the output is re-sanitized (or escaped) before display.
    """
    if not value:
        return Markup("")
    if "<" in value and ">" in value:
        return Markup(sanitize_html(value))
    return Markup(escape(value).replace("\n", "<br>"))


@lru_cache(maxsize=32)
def _asset_fingerprint(name: str) -> str:
    """Short content hash for a /static file, or '' if it cannot be read.

    Appended to the asset URL so a deploy that changes style.css or forms.js
    also changes their URL — the browser (and Cloudflare) fetch the new file
    instead of serving a cached copy for up to the edge TTL.
    """
    try:
        data = (BASE_DIR / "static" / name).read_bytes()
    except OSError:
        return ""
    return hashlib.md5(data).hexdigest()[:10]


def static_url(name: str) -> str:
    """URL for a /static asset, fingerprinted so caches refresh on change."""
    fp = _asset_fingerprint(name)
    return f"/static/{name}?v={fp}" if fp else f"/static/{name}"


templates.env.globals["fmt_salary"] = fmt_salary
templates.env.globals["fmt_exp"] = fmt_exp
templates.env.globals["posted_ago"] = posted_ago
templates.env.globals["description_html"] = description_html
templates.env.globals["stage_label"] = lambda s: STAGE_LABELS.get(s, s.title())
templates.env.globals["audit_label"] = audit.action_label
templates.env.globals["pipeline_stages"] = PIPELINE_STAGES
templates.env.globals["static_url"] = static_url
#: The header job-search bar renders on every page, so its location list has to
#: be reachable without every route passing it in.
templates.env.globals["india_locations"] = INDIA_LOCATIONS


def page_url(request: Request, page: int, param: str = "page") -> str:
    """Current URL with ``param`` set to ``page``, preserving other filters."""
    params = dict(request.query_params)
    params[param] = str(page)
    return f"{request.url.path}?{urlencode(params)}"


def with_query(request: Request, **overrides: object) -> str:
    """Current URL with the given params set (or dropped when the value is falsy)."""
    params = dict(request.query_params)
    for key, value in overrides.items():
        if value in (None, "", False):
            params.pop(key, None)
        else:
            params[key] = str(value)
    query = urlencode(params)
    return f"{request.url.path}?{query}" if query else request.url.path


templates.env.globals["page_url"] = page_url
templates.env.globals["with_query"] = with_query

access_log = logging.getLogger("catchablepro.access")

# A request id is echoed back so a user can quote it, and accepted from a proxy
# so one trace spans hops. It is still user input: anything that could smuggle
# a newline into a log line is replaced rather than trusted.
#: script-src carries no 'unsafe-inline': every script is a file under
#: /static, so an injected <script> is refused by the browser rather than
#: merely prevented from loading something external. That is the difference
#: between a CSP that stops the common XSS and one that only looks like it
#: does, and it is why the theme toggle and the job editor were moved out of
#: their templates.
#:
#: style-src still allows it. Twenty-six inline style= attributes remain across
#: twelve templates, one of them computed per request
#: (style="width: {{ score }}%"), so tightening it is its own piece of work.
#: Left honest rather than quietly claimed.
CONTENT_SECURITY_POLICY = (
    "default-src 'self'; base-uri 'self'; form-action 'self'; "
    "frame-ancestors 'none'; object-src 'none'; connect-src 'self'; "
    "font-src 'self' data:; img-src 'self' data:; "
    "script-src 'self'; style-src 'self' 'unsafe-inline'"
)


def apply_security_headers(response: Response) -> Response:
    """Attach the browser-facing safeguards every response should carry."""
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), geolocation=(), microphone=()"
    response.headers["Content-Security-Policy"] = CONTENT_SECURITY_POLICY
    if IS_PROD:
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )
    return response


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _dashboard_url(role: str) -> str:
    return "/employer" if role == "employer" else "/candidate"


def _post_login_url(db: sqlite3.Connection, user: sqlite3.Row) -> str:
    """Employers with unfinished onboarding land in the wizard, not the dashboard."""
    if user["role"] == "employer":
        company = _company(db, user["id"])
        if company["onboarding_step"] < ONBOARDING_DONE:
            return "/employer/onboarding"
        return "/employer"
    return "/candidate"


def _require(request: Request, db: sqlite3.Connection, role: Optional[str] = None):
    """Return the current user or a RedirectResponse to send the caller away."""
    user = auth.current_user(request, db)
    if user is None:
        return None, RedirectResponse("/login", status_code=303)
    if user["is_suspended"]:
        # A suspension takes effect immediately, mid-session.
        request.session.clear()
        return None, RedirectResponse("/login?suspended=1", status_code=303)
    if role and user["role"] != role:
        return None, RedirectResponse(_dashboard_url(user["role"]), status_code=303)
    return user, None


def _require_admin(request: Request, db: sqlite3.Connection):
    """Admin-only guard. Non-admins are bounced to their own dashboard."""
    user, redirect = _require(request, db)
    if redirect:
        return None, redirect
    if not user["is_admin"]:
        return None, RedirectResponse(_dashboard_url(user["role"]), status_code=303)
    return user, None


def _profile(db: sqlite3.Connection, user_id: int) -> sqlite3.Row:
    row = db.execute(
        "SELECT * FROM candidate_profiles WHERE user_id = ?", (user_id,)
    ).fetchone()
    if row is None:
        db.execute("INSERT INTO candidate_profiles (user_id) VALUES (?)", (user_id,))
        db.commit()
        row = db.execute(
            "SELECT * FROM candidate_profiles WHERE user_id = ?", (user_id,)
        ).fetchone()
    return row


def _company(db: sqlite3.Connection, user_id: int) -> sqlite3.Row:
    """Return the employer's company profile row, creating it on first access."""
    row = db.execute(
        "SELECT * FROM company_profiles WHERE user_id = ?", (user_id,)
    ).fetchone()
    if row is None:
        db.execute("INSERT INTO company_profiles (user_id) VALUES (?)", (user_id,))
        db.commit()
        row = db.execute(
            "SELECT * FROM company_profiles WHERE user_id = ?", (user_id,)
        ).fetchone()
    return row


# --------------------------------------------------------------------------- #
# On-demand pricing: billing transitions and the auto-expiry sweep
# --------------------------------------------------------------------------- #
def _set_job_status(db: sqlite3.Connection, job: sqlite3.Row, new_status: str) -> None:
    """Change a job's status, moving the pricing meter accordingly.

    Going active starts a fresh billing spell; leaving active banks the elapsed
    time into billable_seconds so cumulative cost survives close/reopen.
    """
    old = job["status"]
    if new_status == "active" and old != "active":
        # Fresh billing spell — a reopened job gets a new free week.
        db.execute(
            "UPDATE jobs SET status = 'active', active_since = datetime('now'), "
            "billable_seconds = 0 WHERE id = ?",
            (job["id"],),
        )
    elif old == "active" and new_status != "active":
        db.execute(
            "UPDATE jobs SET status = ?, active_since = '' WHERE id = ?",
            (new_status, job["id"]),
        )
    else:
        db.execute("UPDATE jobs SET status = ? WHERE id = ?", (new_status, job["id"]))
    db.commit()


#: How often the lazy sweep may actually run. Expiring a job is bookkeeping
#: against a 30-day cap, not part of rendering any page, and it costs
#: O(active jobs) of pure Python. Doing that inside every list view is what
#: turns 0.7 ms at one user into 37 ms at four — Python threads doing CPU work
#: contend for the GIL rather than running side by side. Once a minute is as
#: timely as a daily cap can possibly need.
SWEEP_MIN_INTERVAL_SECONDS = 60.0

_last_sweep_at = 0.0
#: Guards the interval check, so concurrent requests cannot all decide to sweep
#: at once. That also closes an existing hole: two requests sweeping the same
#: expired job in parallel would each close and each audit it.
_sweep_gate = threading.Lock()


def _sweep_is_due(force: bool) -> bool:
    """Claim the right to sweep, at most one caller per interval."""
    global _last_sweep_at
    now = time.monotonic()
    with _sweep_gate:
        if not force and now - _last_sweep_at < SWEEP_MIN_INTERVAL_SECONDS:
            return False
        _last_sweep_at = now
        return True


def sweep_expired_jobs(db: sqlite3.Connection, *, force: bool = False) -> int:
    """Auto-close any active job that has passed the pricing cap.

    Called lazily on the busy list views so expiry happens without a scheduler,
    but throttled to SWEEP_MIN_INTERVAL_SECONDS: a page render should not pay
    for bookkeeping it does not need. Pass ``force`` when the answer has to be
    current right now. Returns the number closed — 0 when the sweep was skipped.
    Each closure is audited and the employer emailed.
    """
    if not _sweep_is_due(force):
        return 0
    active = db.execute(
        "SELECT id, employer_id, title, billable_seconds, active_since "
        "FROM jobs WHERE status = 'active' AND active_since != ''"
    ).fetchall()
    closed = 0
    for job in active:
        state = pricing.cost_state(job["billable_seconds"], job["active_since"])
        if not state.expired:
            continue
        db.execute(
            "UPDATE jobs SET status = 'closed', active_since = '' WHERE id = ?",
            (job["id"],),
        )
        db.commit()
        audit.record(
            db, "job.autoexpire", actor_email="system (pricing)",
            target_type="job", target_id=job["id"], target_label=job["title"],
            detail=f"Reached the {pricing.CAP_DAYS}-day cap; accrued {state.accrued_display}.",
        )
        emp = db.execute(
            "SELECT email, name, company_name FROM users WHERE id = ?",
            (job["employer_id"],),
        ).fetchone()
        if emp:
            mailer.send_email(
                to=emp["email"],
                subject=f"Your job '{job['title']}' was auto-closed",
                body=(
                    f"Hi {emp['name'] or 'there'},\n\n"
                    f"Your posting '{job['title']}' reached the "
                    f"{pricing.CAP_DAYS}-day limit and was automatically closed to "
                    f"keep listings fresh. Total holding cost: {state.accrued_display}.\n\n"
                    f"If you're still hiring for this role, you can reopen it from "
                    f"your dashboard — it starts a new free week.\n"
                ),
            )
        closed += 1
    return closed


def _auto_apply_candidate_to_all_jobs(db: sqlite3.Connection, candidate_id: int) -> int:
    """Apply this candidate to every sufficiently-matching job. Returns count added."""
    prof = _profile(db, candidate_id)
    if not prof["auto_apply"]:
        return 0
    owner = db.execute(
        "SELECT email_verified FROM users WHERE id = ?", (candidate_id,)
    ).fetchone()
    if owner is None or not owner["email_verified"]:
        return 0  # unverified accounts never auto-apply
    # Only live postings — drafts and closed roles are not applied to.
    jobs = db.execute(
        "SELECT id, required_skills FROM jobs WHERE status = 'active'"
    ).fetchall()
    added = 0
    for job in jobs:
        pct = match_pct(prof["skills"], job["required_skills"])
        if pct < AUTO_APPLY_MIN_MATCH:
            continue
        cur = db.execute(
            "INSERT OR IGNORE INTO applications "
            "(job_id, candidate_id, match_pct, source, status) "
            "VALUES (?, ?, ?, 'auto', 'applied')",
            (job["id"], candidate_id, pct),
        )
        added += cur.rowcount
    db.commit()
    return added


def _auto_apply_all_candidates_to_job(db: sqlite3.Connection, job_id: int) -> None:
    """When a job goes live, apply every auto-apply candidate that matches."""
    job = db.execute(
        "SELECT required_skills, status FROM jobs WHERE id = ?", (job_id,)
    ).fetchone()
    if job is None or job["status"] != "active":
        return
    candidates = db.execute(
        "SELECT p.user_id, p.skills FROM candidate_profiles p "
        "JOIN users u ON u.id = p.user_id "
        "WHERE p.auto_apply = 1 AND u.email_verified = 1 "
        "AND u.is_suspended = 0"
    ).fetchall()
    for cand in candidates:
        pct = match_pct(cand["skills"], job["required_skills"])
        if pct < AUTO_APPLY_MIN_MATCH:
            continue
        db.execute(
            "INSERT OR IGNORE INTO applications "
            "(job_id, candidate_id, match_pct, source, status) "
            "VALUES (?, ?, ?, 'auto', 'applied')",
            (job_id, cand["user_id"], pct),
        )
    db.commit()


def _consume_recovery_code(db: sqlite3.Connection, user_id: int, code: str) -> bool:
    """Spend a single-use recovery code; returns True if one matched."""
    if not code:
        return False
    row = db.execute(
        "SELECT id FROM recovery_codes WHERE user_id = ? AND code_hash = ? AND used = 0",
        (user_id, totp.hash_recovery_code(code)),
    ).fetchone()
    if row is None:
        return False
    db.execute("UPDATE recovery_codes SET used = 1 WHERE id = ?", (row["id"],))
    db.commit()
    return True


# --------------------------------------------------------------------------- #
# Account & password management (shared by both roles)
# --------------------------------------------------------------------------- #
# --------------------------------------------------------------------------- #
# Admin / moderation. Admin is granted only via manage.py, never self-service.
# --------------------------------------------------------------------------- #
ADMIN_ROWS_PER_PAGE = 20


# --------------------------------------------------------------------------- #
# Getting your data out, and getting rid of it
# --------------------------------------------------------------------------- #
def _export_payload(db: sqlite3.Connection, user: sqlite3.Row) -> dict:
    """Everything this account holds about the person asking.

    Deliberately excludes credentials — a password hash and a TOTP secret are
    not the user's data to take away, they are the means of impersonating them.
    It also stops at the account boundary: an employer's export carries their
    company and their postings, never the candidates who applied, because that
    is somebody else's personal data.
    """
    payload: dict = {
        "exported_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "account": {
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "phone": user["phone"],
            "designation": user["designation"],
            "company_name": user["company_name"],
            "email_verified": bool(user["email_verified"]),
            "two_factor_enabled": bool(user["totp_enabled"]),
            "created_at": user["created_at"],
        },
    }

    if user["role"] == "candidate":
        profile = db.execute(
            "SELECT headline, skills, resume_filename, auto_apply, updated_at "
            "FROM candidate_profiles WHERE user_id = ?",
            (user["id"],),
        ).fetchone()
        payload["profile"] = dict(profile) if profile else {}
        payload["applications"] = [
            dict(row)
            for row in db.execute(
                "SELECT j.title AS job_title, u.company_name AS company, "
                "       a.status, a.match_pct, a.source, a.created_at "
                "FROM applications a "
                "JOIN jobs j ON j.id = a.job_id "
                "JOIN users u ON u.id = j.employer_id "
                "WHERE a.candidate_id = ? ORDER BY a.id",
                (user["id"],),
            ).fetchall()
        ]
    else:
        company = db.execute(
            "SELECT industry, size, website, about, hq_location, onboarding_step "
            "FROM company_profiles WHERE user_id = ?",
            (user["id"],),
        ).fetchone()
        payload["company_profile"] = dict(company) if company else {}
        payload["jobs_posted"] = [
            dict(row)
            for row in db.execute(
                "SELECT title, department, employment_type, work_mode, location, "
                "       required_skills, status, created_at "
                "FROM jobs WHERE employer_id = ? ORDER BY id",
                (user["id"],),
            ).fetchall()
        ]

    return payload


# --------------------------------------------------------------------------- #
# Candidate
# --------------------------------------------------------------------------- #
def _search_active_jobs(
    db: sqlite3.Connection,
    *,
    q: str = "",
    location: str = "",
    work_mode: str = "",
    employment_type: str = "",
    department: str = "",
    experience: str = "",
    salary: str = "",
    posted: str = "",
) -> list:
    """Live postings from non-suspended employers, filtered, newest first.

    Shared by the candidate dashboard (which then scores each row against the
    signed-in profile) and the public /jobs page (which does not).
    """
    sql = (
        "SELECT j.*, u.company_name FROM jobs j "
        "JOIN users u ON u.id = j.employer_id "
        "WHERE j.status = 'active' AND u.is_suspended = 0"
    )
    params: list = []
    if q:
        term = f"%{q}%"
        sql += (
            " AND (j.title LIKE ? COLLATE NOCASE OR j.description LIKE ? COLLATE NOCASE "
            "OR j.required_skills LIKE ? COLLATE NOCASE OR j.location LIKE ? COLLATE NOCASE "
            "OR u.company_name LIKE ? COLLATE NOCASE)"
        )
        params.extend([term] * 5)
    if location:
        sql += " AND j.location LIKE ? COLLATE NOCASE"
        params.append(f"%{location}%")
    if work_mode:
        sql += " AND j.work_mode = ?"
        params.append(work_mode)
    if employment_type:
        sql += " AND j.employment_type = ?"
        params.append(employment_type)
    if department:
        sql += " AND j.department = ?"
        params.append(department)
    if experience in EXPERIENCE_BUCKETS:
        # Overlap test: the candidate's band [lo, hi] against the job's
        # [exp_min, exp_max] (exp_max = 0 means "no upper bound").
        lo = _bucket_low(experience)
        hi = 100.0 if experience.endswith("+ yrs") else float(
            experience.split("-")[1].split()[0]
        )
        sql += " AND j.exp_min <= ? AND (j.exp_max >= ? OR j.exp_max = 0)"
        params.extend([hi, lo])
    if salary in SALARY_BUCKETS and _bucket_low(salary) > 0:
        floor = _bucket_low(salary)
        sql += (
            " AND j.hide_salary = 0 AND "
            "(j.salary_max >= ? OR (j.salary_max = 0 AND j.salary_min >= ?))"
        )
        params.extend([floor, floor])
    if posted in _POSTED_DAYS:
        sql += " AND j.created_at >= datetime('now', ?)"
        params.append(f"-{_POSTED_DAYS[posted]} days")
    sql += " ORDER BY j.created_at DESC, j.id DESC"
    return db.execute(sql, params).fetchall()


def _sort_by_salary(job_rows: list) -> None:
    """Order rows (each carrying a ``job``) by the top of the salary band."""
    job_rows.sort(
        key=lambda r: (r["job"]["salary_max"] or r["job"]["salary_min"] or 0),
        reverse=True,
    )


def _skill_list(raw: str, limit: int = 12) -> list:
    """Split a stored skills string into a trimmed, bounded display list."""
    return [
        s.strip() for s in (raw or "").replace("\n", ",").split(",") if s.strip()
    ][:limit]


def _search_context(sel: dict) -> dict:
    """Filter option lists + current selections for the job-search templates."""
    return {
        "work_modes": WORK_MODES,
        "employment_types": EMPLOYMENT_TYPES,
        "india_locations": INDIA_LOCATIONS,
        "departments": DEPARTMENTS,
        "experience_buckets": EXPERIENCE_BUCKETS,
        "salary_buckets": SALARY_BUCKETS,
        "date_posted": DATE_POSTED,
        "sel_q": sel.get("q", ""),
        "sel_location": sel.get("location", ""),
        "sel_work_mode": sel.get("work_mode", ""),
        "sel_employment_type": sel.get("employment_type", ""),
        "sel_department": sel.get("department", ""),
        "sel_experience": sel.get("experience", ""),
        "sel_salary": sel.get("salary", ""),
        "sel_posted": sel.get("posted", ""),
        "sel_sort": sel.get("sort", ""),
    }


def _saved_job_ids(db: sqlite3.Connection, candidate_id: int) -> set:
    return {
        r["job_id"]
        for r in db.execute(
            "SELECT job_id FROM saved_jobs WHERE candidate_id = ?", (candidate_id,)
        ).fetchall()
    }


def _safe_next(target: str, fallback: str) -> str:
    """Only follow a same-site relative path; never an absolute or scheme URL."""
    if target and target.startswith("/") and not target.startswith("//"):
        return target
    return fallback


def _slug(text: str) -> str:
    """Lowercase, hyphenated, filesystem-safe stub of a string."""
    return re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")[:60]


def _plain_to_html(text: str) -> str:
    """Turn a plain-text draft into the light HTML the job editor expects.

    Blank lines separate paragraphs; runs of '- ' lines become a bullet list.
    The server re-sanitises this before storing, so it only needs to be close.
    """
    from html import escape as _esc

    out: list[str] = []
    bullets: list[str] = []

    def _flush_bullets() -> None:
        if bullets:
            out.append("<ul>" + "".join(f"<li>{b}</li>" for b in bullets) + "</ul>")
            bullets.clear()

    for raw in (text or "").replace("\r\n", "\n").split("\n"):
        line = raw.strip()
        if not line:
            _flush_bullets()
            continue
        if line[:2] in ("- ", "* ") or line[:2] == "• ":
            bullets.append(_esc(line[2:].strip()))
        else:
            _flush_bullets()
            out.append(f"<p>{_esc(line)}</p>")
    _flush_bullets()
    return "".join(out)


async def _save_resume(upload: UploadFile, user_id: int) -> tuple[str, str]:
    """Stream an uploaded resume to disk, bounded.

    Returns ``(filename, "")`` on success or ``("", reason)`` on refusal. The
    file is written in chunks to a ``.part`` sibling and only moved into place
    once it is complete, so a refused or interrupted upload never replaces the
    resume a candidate already had.

    This bounds what the app reads and stores. It does not bound what the
    client may send: a request-body limit belongs at the proxy in front of it.
    """
    suffix = Path(upload.filename or "").suffix.lower()
    if suffix not in ALLOWED_RESUME_SUFFIXES:
        return "", "type"

    dest = UPLOAD_DIR / f"resume_{user_id}{suffix}"
    part = dest.with_name(dest.name + ".part")
    written = 0
    too_large = False
    try:
        with open(part, "wb") as fh:
            while True:
                chunk = await upload.read(RESUME_CHUNK_BYTES)
                if not chunk:
                    break
                written += len(chunk)
                if written > MAX_RESUME_BYTES:
                    too_large = True
                    break
                fh.write(chunk)
        if too_large:
            return "", "size"
        os.replace(part, dest)
    finally:
        part.unlink(missing_ok=True)
    return dest.name, ""


# --------------------------------------------------------------------------- #
# Feedback (both roles) + the admin AI digest
# --------------------------------------------------------------------------- #
FEEDBACK_CATEGORIES = [
    "General", "Bug / something broke", "Matching quality",
    "Feature request", "Design / usability", "Performance",
]
FEEDBACK_LIMIT = (6, 60 * 60)  # per user per hour
FEEDBACK_MAX_CHARS = 4000


def _job_form_fields(**f) -> dict:
    """The submitted job fields as a dict, for re-rendering the form on error."""
    return {
        "title": f["title"], "location": f["location"],
        "required_skills": f["required_skills"], "description": f["description"],
        "employment_type": f["employment_type"], "work_mode": f["work_mode"],
        "exp_min": f["exp_min"], "exp_max": f["exp_max"],
        "salary_min": f["salary_min"], "salary_max": f["salary_max"],
        "hide_salary": bool(f["hide_salary"]), "vacancies": f["vacancies"],
        "education": f["education"], "department": f["department"],
        "deadline": f["deadline"],
    }


def _validate_job(exp_min: int, exp_max: int, salary_min: float, salary_max: float):
    """Clamp the experience range and validate salary. Returns (exp_min, exp_max, errors)."""
    exp_min, exp_max = max(0, exp_min), max(0, exp_max)
    if exp_max and exp_max < exp_min:
        exp_min, exp_max = exp_max, exp_min

    errors: list[str] = []
    if salary_min <= 0 or salary_max <= 0:
        errors.append(
            "Minimum and maximum salary are required. Enter the amount in "
            "lakhs per annum (LPA) — for example 12 means ₹12,00,000 a year."
        )
    else:
        for label, value in (("Minimum", salary_min), ("Maximum", salary_max)):
            if not (SALARY_MIN_LPA <= value <= SALARY_MAX_LPA):
                errors.append(
                    f"{label} salary must be given in lakhs per annum, between "
                    f"{SALARY_MIN_LPA:g} and {SALARY_MAX_LPA:g} LPA. "
                    f"You entered {value:g} — if that was rupees, enter "
                    f"{value / 100000:g} instead."
                )
        if not errors and salary_max < salary_min:
            errors.append("Maximum salary cannot be less than the minimum salary.")
    return exp_min, exp_max, errors


def _job_form_context(request: Request, user, form: dict, errors: list) -> dict:
    return {
        "request": request,
        "user": user,
        "employment_types": EMPLOYMENT_TYPES,
        "work_modes": WORK_MODES,
        "education_levels": EDUCATION_LEVELS,
        "departments": DEPARTMENTS,
        "salary_min_lpa": SALARY_MIN_LPA,
        "salary_max_lpa": SALARY_MAX_LPA,
        "today": date.today().isoformat(),
        "pricing_rates": pricing.WEEKLY_RATES,
        "pricing_free_days": pricing.FREE_DAYS,
        "pricing_cap_days": pricing.CAP_DAYS,
        "currency": pricing.CURRENCY,
        "form": form,
        "errors": errors,
    }


_JOB_COLS = (
    "title", "location", "required_skills", "description", "employment_type",
    "work_mode", "exp_min", "exp_max", "salary_min", "salary_max", "vacancies",
    "education", "department", "deadline",
)


AI_CALL_LIMIT = (20, 60 * 60)  # per user per hour — LLM calls cost money


def _rank_candidates_by_skills(
    db: sqlite3.Connection, required_skills: str, limit: int = 25
) -> list:
    """Every non-suspended candidate scored against a skill string, best first."""
    candidates = db.execute(
        "SELECT u.id, u.name, u.email, p.headline, p.skills, p.resume_filename "
        "FROM candidate_profiles p JOIN users u ON u.id = p.user_id "
        "WHERE u.is_suspended = 0 AND p.skills != '' ORDER BY u.id"
    ).fetchall()
    rows = []
    for cand in candidates:
        pct, matched, partial, missing = match_detail(cand["skills"], required_skills)
        if pct < EMPLOYER_MATCH_THRESHOLD:
            continue
        rows.append(
            {
                "cand": cand, "pct": pct, "matched": matched,
                "partial": partial, "missing": missing,
            }
        )
    rows.sort(key=lambda r: r["pct"], reverse=True)
    return rows[:limit]


def _assistant_ctx(request: Request, user, **over) -> dict:
    ctx = {
        "request": request, "user": user,
        "ai_configured": ai.is_configured(), "ai_model": ai.model_name(),
        "jd_text": "", "brief_text": "", "result": None, "draft": None,
        "error": None, "draft_error": None,
    }
    ctx.update(over)
    return ctx


def _owned_application(db, employer_id: int, application_id: int):
    """Fetch an application only if it belongs to one of this employer's jobs."""
    return db.execute(
        "SELECT a.*, j.title AS job_title, j.id AS job_id, u.email, u.name "
        "FROM applications a "
        "JOIN jobs j ON j.id = a.job_id "
        "JOIN users u ON u.id = a.candidate_id "
        "WHERE a.id = ? AND j.employer_id = ?",
        (application_id, employer_id),
    ).fetchone()


def _contact_target(db, employer, job_id: int, candidate_id: int):
    """Return (job, candidate) only if this employer may contact them."""
    job = db.execute(
        "SELECT * FROM jobs WHERE id = ? AND employer_id = ?", (job_id, employer["id"])
    ).fetchone()
    if job is None:
        return None, None
    cand = db.execute(
        "SELECT u.id, u.name, u.email, p.headline, p.skills "
        "FROM users u JOIN candidate_profiles p ON p.user_id = u.id "
        "WHERE u.id = ? AND u.role = 'candidate'",
        (candidate_id,),
    ).fetchone()
    return job, cand
