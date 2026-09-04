"""Catchablepro job portal — FastAPI application.

Server-rendered (Jinja) with an in-process SQLite database. Two roles:
  * employer  — post jobs, view skill-ranked candidate matches & applications
  * candidate — build profile + upload resume, browse jobs with match %,
                apply manually, or flip the Auto-Apply toggle to never miss one.
"""
from __future__ import annotations

import logging
import os
import re
import secrets
import sqlite3
import time
from contextlib import asynccontextmanager
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from typing import Optional

from fastapi import Depends, FastAPI, Form, HTTPException, Request, UploadFile
from fastapi.responses import (
    FileResponse,
    HTMLResponse,
    JSONResponse,
    RedirectResponse,
    Response,
)
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from markupsafe import Markup
from starlette.middleware.sessions import SessionMiddleware

from html import escape

from . import (
    audit,
    auth,
    db as dbmod,
    health,
    logging_config,
    mailer,
    metrics,
    pricing,
    ratelimit,
    resume as resume_module,
    totp,
)
from .richtext import is_effectively_empty, sanitize_html
from .db import (
    AUTO_APPLY_MIN_MATCH,
    EMPLOYER_MATCH_THRESHOLD,
    UPLOAD_DIR,
    get_db,
    init_db,
)
from .matching import extract_skills, match_detail, match_pct, parse_skills
from .pagination import paginate

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
    link = str(request.base_url).rstrip("/") + f"/verify-email?token={token}"
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
EDUCATION_LEVELS = ["Any", "Diploma", "Graduate", "Post Graduate", "Doctorate"]
DEPARTMENTS = [
    "Engineering", "Data Science", "Product", "Design", "Sales", "Marketing",
    "Human Resources", "Finance", "Operations", "Customer Support", "Other",
]


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


templates.env.globals["fmt_salary"] = fmt_salary
templates.env.globals["fmt_exp"] = fmt_exp
templates.env.globals["description_html"] = description_html
templates.env.globals["stage_label"] = lambda s: STAGE_LABELS.get(s, s.title())
templates.env.globals["audit_label"] = audit.action_label
templates.env.globals["pipeline_stages"] = PIPELINE_STAGES


def page_url(request: Request, page: int, param: str = "page") -> str:
    """Current URL with ``param`` set to ``page``, preserving other filters."""
    params = dict(request.query_params)
    params[param] = str(page)
    return f"{request.url.path}?{urlencode(params)}"


templates.env.globals["page_url"] = page_url


@asynccontextmanager
async def lifespan(app: FastAPI):
    logging_config.configure(os.environ.get("LOG_LEVEL", "INFO").upper())
    init_db()
    yield


app = FastAPI(title="Catchablepro Job Portal", lifespan=lifespan)
app.add_middleware(
    SessionMiddleware,
    secret_key=SECRET_KEY,
    same_site="lax",
    https_only=IS_PROD,  # Secure cookie flag when served over HTTPS in production
)
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")

access_log = logging.getLogger("catchablepro.access")

# A request id is echoed back so a user can quote it, and accepted from a proxy
# so one trace spans hops. It is still user input: anything that could smuggle
# a newline into a log line is replaced rather than trusted.
_SAFE_REQUEST_ID = re.compile(r"^[A-Za-z0-9._-]{1,64}$")


@app.middleware("http")
async def request_context(request: Request, call_next):
    """Tag every request with an id, then log how it went.

    The log line is emitted in a ``finally`` so a request that raises is still
    recorded — an unlogged 500 is the one you most need to find later.
    """
    incoming = request.headers.get("x-request-id", "")
    request_id = incoming if _SAFE_REQUEST_ID.match(incoming) else secrets.token_hex(8)
    token = logging_config.request_id_var.set(request_id)
    started = time.perf_counter()
    status = 500  # stands unless a response comes back to say otherwise
    try:
        response = await call_next(request)
        status = response.status_code
        response.headers["X-Request-ID"] = request_id
        return response
    finally:
        elapsed = time.perf_counter() - started
        path = request.url.path
        if metrics.is_observable(path):
            # The route template, not the path: one series for every job's
            # applicants page rather than one per job. See app/metrics.py.
            matched = request.scope.get("route")
            metrics.observe(
                request.method,
                getattr(matched, "path", None) or metrics.UNMATCHED,
                status,
                elapsed,
            )
            access_log.info(
                "request",
                extra={
                    "method": request.method,
                    "path": path,
                    "status": status,
                    "duration_ms": round(elapsed * 1000, 2),
                    # Present only once SessionMiddleware has run; absent when a
                    # request fails before that.
                    "user_id": request.scope.get("session", {}).get("user_id"),
                },
            )
        logging_config.request_id_var.reset(token)


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


def sweep_expired_jobs(db: sqlite3.Connection) -> int:
    """Auto-close any active job that has passed the pricing cap.

    Called lazily on the busy list views so expiry happens without a scheduler.
    Returns the number closed. Each closure is audited and the employer emailed.
    """
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


# --------------------------------------------------------------------------- #
# Public / auth
# --------------------------------------------------------------------------- #
@app.get("/healthz")
def healthz():
    """Liveness: this process is up and serving requests.

    Deliberately checks nothing else. Restarting the process cannot fix a
    broken dependency, so a dependency failure belongs in /readyz, which takes
    the instance out of rotation instead of into a restart loop.
    """
    return {"status": "ok"}


@app.get("/readyz")
def readyz():
    """Readiness: every dependency a request needs is actually working.

    503 when it is not, so the platform stops routing traffic here. This is
    the endpoint a load balancer or `healthCheckPath` should point at.
    """
    report = health.readiness()
    return JSONResponse(
        report, status_code=200 if report["status"] == "ok" else 503
    )


@app.get("/metrics")
def metrics_endpoint(request: Request):
    """Prometheus scrape endpoint.

    Guarded, because the exposition leaks the shape of the service: route
    names, traffic volume and error rates. In production it is off unless
    METRICS_TOKEN is set, and a caller without that bearer token gets a 404
    rather than a 401 — there is no reason to confirm the endpoint exists to
    someone who cannot read it. Development leaves it open so a local Prometheus
    needs no setup.
    """
    expected = metrics.token()
    if IS_PROD and not expected:
        raise HTTPException(status_code=404)
    if expected and not secrets.compare_digest(
        request.headers.get("authorization", ""), f"Bearer {expected}"
    ):
        raise HTTPException(status_code=404)
    return Response(metrics.render(), media_type=metrics.CONTENT_TYPE)


@app.get("/", response_class=HTMLResponse)
def landing(request: Request, db: sqlite3.Connection = Depends(get_db)):
    user = auth.current_user(request, db)
    if user:
        return RedirectResponse(_dashboard_url(user["role"]), status_code=303)
    return templates.TemplateResponse(request, "landing.html", {"request": request})


@app.get("/register", response_class=HTMLResponse)
def register_form(request: Request):
    return templates.TemplateResponse(
        request, "register.html", {"request": request, "error": None}
    )


@app.post("/register")
def register(
    request: Request,
    _csrf: None = Depends(verify_csrf),
    email: str = Form(...),
    password: str = Form(...),
    name: str = Form(""),
    db: sqlite3.Connection = Depends(get_db),
):
    """Candidate signup. Employers register at /employer/register."""
    email = email.strip().lower()
    weak = auth.validate_password(password)
    if weak:
        return templates.TemplateResponse(
            request, "register.html", {"request": request, "error": weak}, status_code=400
        )
    if db.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone():
        return templates.TemplateResponse(
            request,
            "register.html",
            {"request": request, "error": "That email is already registered."},
            status_code=400,
        )
    cur = db.execute(
        "INSERT INTO users (email, password_hash, role, name) "
        "VALUES (?, ?, 'candidate', ?)",
        (email, auth.hash_password(password), name.strip()),
    )
    user_id = cur.lastrowid
    db.execute("INSERT INTO candidate_profiles (user_id) VALUES (?)", (user_id,))
    db.commit()
    request.session["user_id"] = user_id
    new_user = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    _send_verification_email(request, db, new_user)
    return RedirectResponse("/candidate", status_code=303)


@app.get("/login", response_class=HTMLResponse)
def login_form(request: Request):
    return templates.TemplateResponse(request, "login.html", {"request": request, "error": None})


@app.post("/login")
def login(
    request: Request,
    _csrf: None = Depends(verify_csrf),
    email: str = Form(...),
    password: str = Form(...),
    db: sqlite3.Connection = Depends(get_db),
):
    email = email.strip().lower()
    allowed, retry = ratelimit.check(f"login:{email}", *LOGIN_LIMIT)
    if not allowed:
        return templates.TemplateResponse(
            request,
            "login.html",
            {"request": request,
             "error": f"Too many failed attempts. Try again in {retry // 60 + 1} minute(s)."},
            status_code=429,
        )
    user = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if user is None or not auth.verify_password(password, user["password_hash"]):
        return templates.TemplateResponse(
            request,
            "login.html",
            {"request": request, "error": "Invalid email or password."},
            status_code=401,
        )
    if user["is_suspended"]:
        return templates.TemplateResponse(
            request,
            "login.html",
            {"request": request,
             "error": "This account has been suspended. Contact support if you "
                      "believe this is a mistake."},
            status_code=403,
        )
    ratelimit.reset(f"login:{email}")
    return _login_success(request, db, user)


# --------------------------------------------------------------------------- #
# Employer portal — separate signup/login, like a dedicated recruiter site
# --------------------------------------------------------------------------- #
@app.get("/employer/register", response_class=HTMLResponse)
def employer_register_form(request: Request):
    return templates.TemplateResponse(
        request, "employer_register.html", {"request": request, "error": None}
    )


@app.post("/employer/register")
def employer_register(
    request: Request,
    _csrf: None = Depends(verify_csrf),
    email: str = Form(...),
    password: str = Form(...),
    name: str = Form(""),
    company_name: str = Form(""),
    phone: str = Form(""),
    designation: str = Form(""),
    db: sqlite3.Connection = Depends(get_db),
):
    email = email.strip().lower()
    weak = auth.validate_password(password)
    if weak:
        return templates.TemplateResponse(
            request, "employer_register.html",
            {"request": request, "error": weak}, status_code=400,
        )
    if db.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone():
        return templates.TemplateResponse(
            request,
            "employer_register.html",
            {"request": request, "error": "That email is already registered."},
            status_code=400,
        )
    cur = db.execute(
        "INSERT INTO users (email, password_hash, role, name, company_name, phone, designation) "
        "VALUES (?, ?, 'employer', ?, ?, ?, ?)",
        (email, auth.hash_password(password), name.strip(), company_name.strip(),
         phone.strip(), designation.strip()),
    )
    user_id = cur.lastrowid
    # Start the onboarding wizard at step 1 (company details).
    db.execute(
        "INSERT INTO company_profiles (user_id, onboarding_step) VALUES (?, 1)", (user_id,)
    )
    db.commit()
    request.session["user_id"] = user_id
    new_user = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    _send_verification_email(request, db, new_user)
    return RedirectResponse("/employer/onboarding", status_code=303)


@app.get("/employer/login", response_class=HTMLResponse)
def employer_login_form(request: Request):
    return templates.TemplateResponse(
        request, "employer_login.html", {"request": request, "error": None}
    )


@app.post("/employer/login")
def employer_login(
    request: Request,
    _csrf: None = Depends(verify_csrf),
    email: str = Form(...),
    password: str = Form(...),
    db: sqlite3.Connection = Depends(get_db),
):
    email = email.strip().lower()
    allowed, retry = ratelimit.check(f"login:{email}", *LOGIN_LIMIT)
    if not allowed:
        return templates.TemplateResponse(
            request,
            "employer_login.html",
            {"request": request,
             "error": f"Too many failed attempts. Try again in {retry // 60 + 1} minute(s)."},
            status_code=429,
        )
    user = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if user is None or not auth.verify_password(password, user["password_hash"]):
        return templates.TemplateResponse(
            request,
            "employer_login.html",
            {"request": request, "error": "Invalid email or password."},
            status_code=401,
        )
    if user["is_suspended"]:
        return templates.TemplateResponse(
            request,
            "employer_login.html",
            {"request": request,
             "error": "This account has been suspended. Contact support if you "
                      "believe this is a mistake."},
            status_code=403,
        )
    if user["role"] != "employer":
        return templates.TemplateResponse(
            request,
            "employer_login.html",
            {"request": request,
             "error": "That's a candidate account — please use the candidate login."},
            status_code=403,
        )
    ratelimit.reset(f"login:{email}")
    return _login_success(request, db, user)


# --------------------------------------------------------------------------- #
# Two-factor authentication challenge (shown after password when 2FA is on)
# --------------------------------------------------------------------------- #
@app.get("/2fa", response_class=HTMLResponse)
def twofa_challenge_form(request: Request, db: sqlite3.Connection = Depends(get_db)):
    if not request.session.get("pending_2fa"):
        return RedirectResponse("/login", status_code=303)
    return templates.TemplateResponse(
        request, "twofa_challenge.html", {"request": request, "error": None}
    )


@app.post("/2fa")
def twofa_challenge(
    request: Request,
    _csrf: None = Depends(verify_csrf),
    code: str = Form(""),
    db: sqlite3.Connection = Depends(get_db),
):
    uid = request.session.get("pending_2fa")
    if not uid:
        return RedirectResponse("/login", status_code=303)

    allowed, retry = ratelimit.check(f"2fa:{uid}", *TWOFA_LIMIT)
    if not allowed:
        return templates.TemplateResponse(
            request, "twofa_challenge.html",
            {"request": request,
             "error": f"Too many attempts. Try again in {retry // 60 + 1} minute(s)."},
            status_code=429,
        )

    user = db.execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone()
    if user is None:
        request.session.pop("pending_2fa", None)
        return RedirectResponse("/login", status_code=303)

    entry = code.strip()
    ok = totp.verify(user["totp_secret"], entry) or _consume_recovery_code(db, uid, entry)
    if not ok:
        return templates.TemplateResponse(
            request, "twofa_challenge.html",
            {"request": request, "error": "Invalid code. Try again."},
            status_code=401,
        )

    ratelimit.reset(f"2fa:{uid}")
    request.session.pop("pending_2fa", None)
    request.session["user_id"] = user["id"]
    return RedirectResponse(_post_login_url(db, user), status_code=303)


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


@app.get("/admin", response_class=HTMLResponse)
def admin_home(request: Request, db: sqlite3.Connection = Depends(get_db)):
    user, redirect = _require_admin(request, db)
    if redirect:
        return redirect
    stats = db.execute(
        "SELECT "
        "(SELECT COUNT(*) FROM users WHERE role = 'candidate') AS candidates, "
        "(SELECT COUNT(*) FROM users WHERE role = 'employer') AS employers, "
        "(SELECT COUNT(*) FROM users WHERE is_suspended = 1) AS suspended, "
        "(SELECT COUNT(*) FROM users WHERE email_verified = 0) AS unverified, "
        "(SELECT COUNT(*) FROM jobs) AS jobs, "
        "(SELECT COUNT(*) FROM jobs WHERE status = 'active') AS active_jobs, "
        "(SELECT COUNT(*) FROM applications) AS applications"
    ).fetchone()
    recent_users = db.execute(
        "SELECT * FROM users ORDER BY created_at DESC, id DESC LIMIT 8"
    ).fetchall()
    recent_jobs = db.execute(
        "SELECT j.*, u.company_name FROM jobs j JOIN users u ON u.id = j.employer_id "
        "ORDER BY j.created_at DESC, j.id DESC LIMIT 8"
    ).fetchall()
    return templates.TemplateResponse(
        request,
        "admin_home.html",
        {"request": request, "user": user, "stats": stats,
         "recent_users": recent_users, "recent_jobs": recent_jobs},
    )


@app.get("/admin/users", response_class=HTMLResponse)
def admin_users(
    request: Request, role: str = "", q: str = "", page: int = 1,
    db: sqlite3.Connection = Depends(get_db),
):
    user, redirect = _require_admin(request, db)
    if redirect:
        return redirect

    where, params = "1=1", []
    if role in ("employer", "candidate"):
        where += " AND role = ?"
        params.append(role)
    if q.strip():
        where += " AND (email LIKE ? OR name LIKE ? OR company_name LIKE ?)"
        like = f"%{q.strip()}%"
        params += [like, like, like]

    total = db.execute(
        f"SELECT COUNT(*) AS n FROM users WHERE {where}", params
    ).fetchone()["n"]
    pg = paginate(total, page, ADMIN_ROWS_PER_PAGE)
    rows = db.execute(
        f"SELECT * FROM users WHERE {where} ORDER BY created_at DESC, id DESC "
        "LIMIT ? OFFSET ?",
        (*params, pg.per_page, pg.offset),
    ).fetchall()
    return templates.TemplateResponse(
        request,
        "admin_users.html",
        {"request": request, "user": user, "rows": rows, "pg": pg,
         "sel_role": role, "q": q},
    )


@app.post("/admin/users/{user_id}/suspend")
def admin_toggle_suspend(
    request: Request,
    user_id: int,
    _csrf: None = Depends(verify_csrf),
    reason: str = Form(""),
    db: sqlite3.Connection = Depends(get_db),
):
    user, redirect = _require_admin(request, db)
    if redirect:
        return redirect
    target = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if target is None:
        return RedirectResponse("/admin/users", status_code=303)
    # Guard rails: never lock yourself out, never suspend another admin.
    if target["id"] == user["id"] or target["is_admin"]:
        return RedirectResponse("/admin/users?error=protected", status_code=303)

    new_state = 0 if target["is_suspended"] else 1
    clean_reason = reason.strip()[:500] if new_state else ""
    db.execute(
        "UPDATE users SET is_suspended = ?, suspended_reason = ? WHERE id = ?",
        (new_state, clean_reason, user_id),
    )
    db.commit()
    audit.record(
        db,
        "user.suspend" if new_state else "user.reinstate",
        actor=user,
        target_type="user",
        target_id=target["id"],
        target_label=target["email"],
        detail=clean_reason,
        ip=_client_ip(request),
    )
    return RedirectResponse("/admin/users", status_code=303)


@app.get("/admin/jobs", response_class=HTMLResponse)
def admin_jobs(
    request: Request, status: str = "", page: int = 1,
    db: sqlite3.Connection = Depends(get_db),
):
    user, redirect = _require_admin(request, db)
    if redirect:
        return redirect
    where, params = "1=1", []
    if status in ("draft", "active", "closed"):
        where += " AND j.status = ?"
        params.append(status)
    total = db.execute(
        f"SELECT COUNT(*) AS n FROM jobs j WHERE {where}", params
    ).fetchone()["n"]
    pg = paginate(total, page, ADMIN_ROWS_PER_PAGE)
    rows = db.execute(
        "SELECT j.*, u.company_name, u.email AS employer_email, "
        "u.is_suspended AS employer_suspended, "
        "(SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS n_apps "
        f"FROM jobs j JOIN users u ON u.id = j.employer_id WHERE {where} "
        "ORDER BY j.created_at DESC, j.id DESC LIMIT ? OFFSET ?",
        (*params, pg.per_page, pg.offset),
    ).fetchall()
    return templates.TemplateResponse(
        request,
        "admin_jobs.html",
        {"request": request, "user": user, "rows": rows, "pg": pg,
         "sel_status": status},
    )


@app.get("/admin/audit", response_class=HTMLResponse)
def admin_audit(
    request: Request, action: str = "", page: int = 1,
    db: sqlite3.Connection = Depends(get_db),
):
    user, redirect = _require_admin(request, db)
    if redirect:
        return redirect
    where, params = "1=1", []
    if action in audit.ACTIONS:
        where += " AND action = ?"
        params.append(action)
    total = db.execute(
        f"SELECT COUNT(*) AS n FROM audit_log WHERE {where}", params
    ).fetchone()["n"]
    pg = paginate(total, page, ADMIN_ROWS_PER_PAGE)
    rows = db.execute(
        f"SELECT * FROM audit_log WHERE {where} "
        "ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?",
        (*params, pg.per_page, pg.offset),
    ).fetchall()
    return templates.TemplateResponse(
        request,
        "admin_audit.html",
        {"request": request, "user": user, "rows": rows, "pg": pg,
         "actions": audit.ACTIONS, "sel_action": action},
    )


@app.post("/admin/jobs/{job_id}/takedown")
def admin_takedown_job(
    request: Request,
    job_id: int,
    _csrf: None = Depends(verify_csrf),
    db: sqlite3.Connection = Depends(get_db),
):
    """Pull a posting out of circulation without deleting its history."""
    user, redirect = _require_admin(request, db)
    if redirect:
        return redirect
    job = db.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
    if job is None:
        return RedirectResponse("/admin/jobs", status_code=303)
    _set_job_status(db, job, "closed")  # also stops the pricing meter
    audit.record(
        db, "job.takedown", actor=user, target_type="job",
        target_id=job["id"], target_label=job["title"], ip=_client_ip(request),
    )
    return RedirectResponse("/admin/jobs", status_code=303)


@app.get("/verify-email", response_class=HTMLResponse)
def verify_email(
    request: Request, token: str = "", db: sqlite3.Connection = Depends(get_db)
):
    user_id, error = auth.verify_email_token(db, token)
    user = auth.current_user(request, db)
    return templates.TemplateResponse(
        request,
        "verify_email.html",
        {"request": request, "user": user, "error": error, "ok": error is None},
    )


@app.post("/resend-verification")
def resend_verification(
    request: Request,
    _csrf: None = Depends(verify_csrf),
    db: sqlite3.Connection = Depends(get_db),
):
    user, redirect = _require(request, db)
    if redirect:
        return redirect
    back = _dashboard_url(user["role"])
    if user["email_verified"]:
        return RedirectResponse(back, status_code=303)
    allowed, _ = ratelimit.check(f"verify:{user['id']}", *VERIFY_RESEND_LIMIT)
    if allowed:
        _send_verification_email(request, db, user)
    # Same response either way — no signal about the throttle.
    return RedirectResponse(f"{back}?verification_sent=1", status_code=303)


@app.get("/forgot-password", response_class=HTMLResponse)
def forgot_password_form(request: Request):
    return templates.TemplateResponse(
        request, "forgot_password.html", {"request": request, "sent": False, "error": None}
    )


@app.post("/forgot-password")
def forgot_password(
    request: Request,
    _csrf: None = Depends(verify_csrf),
    email: str = Form(...),
    db: sqlite3.Connection = Depends(get_db),
):
    email = email.strip().lower()
    # Always render the same confirmation so this cannot be used to discover
    # which email addresses have accounts.
    done = templates.TemplateResponse(
        request, "forgot_password.html", {"request": request, "sent": True, "error": None}
    )

    allowed, _ = ratelimit.check(f"reset:{email}", *RESET_REQUEST_LIMIT)
    if not allowed:
        return done

    user = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if user is None:
        return done

    token = auth.create_reset_token(db, user["id"])
    link = str(request.base_url).rstrip("/") + f"/reset-password?token={token}"
    mailer.send_email(
        to=user["email"],
        subject="Reset your Catchablepro password",
        body=(
            f"Hi {user['name'] or 'there'},\n\n"
            f"We received a request to reset your Catchablepro password.\n"
            f"Use the link below within {auth.RESET_TOKEN_TTL_MINUTES} minutes:\n\n"
            f"{link}\n\n"
            f"If you didn't ask for this, you can safely ignore this email — "
            f"your password will not change.\n"
        ),
    )
    return done


@app.get("/reset-password", response_class=HTMLResponse)
def reset_password_form(
    request: Request, token: str = "", db: sqlite3.Connection = Depends(get_db)
):
    _, error = auth.consume_reset_token(db, token)
    return templates.TemplateResponse(
        request,
        "reset_password.html",
        {"request": request, "token": token, "error": error, "valid": error is None},
    )


@app.post("/reset-password")
def reset_password(
    request: Request,
    _csrf: None = Depends(verify_csrf),
    token: str = Form(""),
    password: str = Form(...),
    confirm: str = Form(""),
    db: sqlite3.Connection = Depends(get_db),
):
    user_id, error = auth.consume_reset_token(db, token)
    if error:
        return templates.TemplateResponse(
            request,
            "reset_password.html",
            {"request": request, "token": token, "error": error, "valid": False},
            status_code=400,
        )
    problem = auth.validate_password(password) or (
        None if password == confirm else "Passwords do not match."
    )
    if problem:
        return templates.TemplateResponse(
            request,
            "reset_password.html",
            {"request": request, "token": token, "error": problem, "valid": True},
            status_code=400,
        )

    db.execute(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        (auth.hash_password(password), user_id),
    )
    db.commit()
    auth.mark_reset_token_used(db, token)
    # Drop any existing session so a stolen session cannot outlive the reset.
    request.session.clear()
    return RedirectResponse("/login?reset=1", status_code=303)


@app.get("/account", response_class=HTMLResponse)
def account_page(request: Request, db: sqlite3.Connection = Depends(get_db)):
    user, redirect = _require(request, db)
    if redirect:
        return redirect
    recovery_left = db.execute(
        "SELECT COUNT(*) AS n FROM recovery_codes WHERE user_id = ? AND used = 0",
        (user["id"],),
    ).fetchone()["n"]
    return templates.TemplateResponse(
        request,
        "account.html",
        {"request": request, "user": user, "error": None,
         "changed": request.query_params.get("changed") == "1",
         "twofa_off": request.query_params.get("twofa") == "off",
         "recovery_left": recovery_left},
    )


@app.post("/account/password")
def account_change_password(
    request: Request,
    _csrf: None = Depends(verify_csrf),
    current_password: str = Form(...),
    password: str = Form(...),
    confirm: str = Form(""),
    db: sqlite3.Connection = Depends(get_db),
):
    user, redirect = _require(request, db)
    if redirect:
        return redirect

    def fail(message: str):
        return templates.TemplateResponse(
            request,
            "account.html",
            {"request": request, "user": user, "error": message, "changed": False},
            status_code=400,
        )

    if not auth.verify_password(current_password, user["password_hash"]):
        return fail("Your current password is incorrect.")
    problem = auth.validate_password(password) or (
        None if password == confirm else "Passwords do not match."
    )
    if problem:
        return fail(problem)

    db.execute(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        (auth.hash_password(password), user["id"]),
    )
    db.commit()
    return RedirectResponse("/account?changed=1", status_code=303)


# --------------------------------------------------------------------------- #
# Two-factor enrolment / removal
# --------------------------------------------------------------------------- #
@app.get("/account/2fa/setup", response_class=HTMLResponse)
def twofa_setup(request: Request, db: sqlite3.Connection = Depends(get_db)):
    user, redirect = _require(request, db)
    if redirect:
        return redirect
    if user["totp_enabled"]:
        return RedirectResponse("/account", status_code=303)

    # A pending secret is stored (enabled=0) so it survives the round trip to the
    # authenticator app without being placed in a client-readable cookie. Reuse
    # an existing pending secret so refreshing the page keeps the same QR.
    secret = user["totp_secret"]
    if not secret:
        secret = totp.generate_secret()
        db.execute("UPDATE users SET totp_secret = ? WHERE id = ?", (secret, user["id"]))
        db.commit()

    return templates.TemplateResponse(
        request,
        "twofa_setup.html",
        {
            "request": request, "user": user,
            "qr": totp.qr_data_uri(secret, user["email"]),
            "secret_display": totp.format_secret(secret),
            "error": None,
        },
    )


@app.post("/account/2fa/enable", response_class=HTMLResponse)
def twofa_enable(
    request: Request,
    _csrf: None = Depends(verify_csrf),
    code: str = Form(""),
    db: sqlite3.Connection = Depends(get_db),
):
    user, redirect = _require(request, db)
    if redirect:
        return redirect
    if user["totp_enabled"] or not user["totp_secret"]:
        return RedirectResponse("/account", status_code=303)

    if not totp.verify(user["totp_secret"], code):
        return templates.TemplateResponse(
            request,
            "twofa_setup.html",
            {
                "request": request, "user": user,
                "qr": totp.qr_data_uri(user["totp_secret"], user["email"]),
                "secret_display": totp.format_secret(user["totp_secret"]),
                "error": "That code didn't match. Check your authenticator and try again.",
            },
            status_code=400,
        )

    # Confirmed: enable, then mint one-time recovery codes shown once.
    db.execute("UPDATE users SET totp_enabled = 1 WHERE id = ?", (user["id"],))
    db.execute("DELETE FROM recovery_codes WHERE user_id = ?", (user["id"],))
    codes = totp.generate_recovery_codes()
    for c in codes:
        db.execute(
            "INSERT INTO recovery_codes (user_id, code_hash) VALUES (?, ?)",
            (user["id"], totp.hash_recovery_code(c)),
        )
    db.commit()
    audit.record(db, "security.2fa_enable", actor=user, target_type="user",
                 target_id=user["id"], target_label=user["email"],
                 ip=_client_ip(request))
    return templates.TemplateResponse(
        request,
        "twofa_recovery.html",
        {"request": request, "user": user, "codes": codes},
    )


@app.post("/account/2fa/disable")
def twofa_disable(
    request: Request,
    _csrf: None = Depends(verify_csrf),
    current_password: str = Form(...),
    db: sqlite3.Connection = Depends(get_db),
):
    user, redirect = _require(request, db)
    if redirect:
        return redirect
    # Turning off a security control requires re-proving the password.
    if not auth.verify_password(current_password, user["password_hash"]):
        return templates.TemplateResponse(
            request,
            "account.html",
            {"request": request, "user": user, "changed": False,
             "error": "Your current password is incorrect."},
            status_code=400,
        )
    db.execute(
        "UPDATE users SET totp_enabled = 0, totp_secret = '' WHERE id = ?",
        (user["id"],),
    )
    db.execute("DELETE FROM recovery_codes WHERE user_id = ?", (user["id"],))
    db.commit()
    audit.record(db, "security.2fa_disable", actor=user, target_type="user",
                 target_id=user["id"], target_label=user["email"],
                 ip=_client_ip(request))
    return RedirectResponse("/account?twofa=off", status_code=303)


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


@app.get("/account/export")
def account_export(request: Request, db: sqlite3.Connection = Depends(get_db)):
    """Hand the account holder their own data as a JSON file."""
    user, redirect = _require(request, db)
    if redirect:
        return redirect
    stamp = date.today().isoformat()
    return JSONResponse(
        _export_payload(db, user),
        headers={
            "Content-Disposition":
                f'attachment; filename="catchablepro-{user["id"]}-{stamp}.json"'
        },
    )


@app.post("/account/delete")
def account_delete(
    request: Request,
    _csrf: None = Depends(verify_csrf),
    current_password: str = Form(...),
    db: sqlite3.Connection = Depends(get_db),
):
    """Erase the account and everything hanging off it, on the owner's say-so.

    Every table that references a user cascades, so one DELETE removes the
    profile, applications, jobs, recovery codes and tokens. The two things the
    database cannot reach are handled here: the resume file on disk, and the
    audit entry, which is written first so it survives — its actor_id becomes
    NULL while the snapshotted email keeps the record readable.
    """
    user, redirect = _require(request, db)
    if redirect:
        return redirect

    def fail(message: str):
        return templates.TemplateResponse(
            request,
            "account.html",
            {"request": request, "user": user, "changed": False, "error": message},
            status_code=400,
        )

    if not auth.verify_password(current_password, user["password_hash"]):
        return fail("Your current password is incorrect.")
    if user["is_admin"]:
        # Mirrors the moderation guard rails: an admin cannot remove themselves
        # and leave the platform without one. Revoke the rights first.
        return fail(
            "Admin accounts cannot be deleted from here — have another admin "
            "revoke your admin rights first (manage.py revoke-admin)."
        )

    resume_name = ""
    if user["role"] == "candidate":
        row = db.execute(
            "SELECT resume_filename FROM candidate_profiles WHERE user_id = ?",
            (user["id"],),
        ).fetchone()
        resume_name = row["resume_filename"] if row else ""

    audit.record(db, "account.delete", actor=user, target_type="user",
                 target_id=user["id"], target_label=user["email"],
                 detail=f"role={user['role']}", ip=_client_ip(request))

    db.execute("DELETE FROM users WHERE id = ?", (user["id"],))
    db.commit()

    if resume_name:
        # Best effort: the row is already gone, and a stranded file must not
        # turn a completed deletion into a 500 for the person who asked.
        try:
            (UPLOAD_DIR / resume_name).unlink(missing_ok=True)
        except OSError:
            access_log.warning("resume file left behind after account deletion")

    request.session.clear()
    return RedirectResponse("/?deleted=1", status_code=303)


@app.post("/logout")
def logout(request: Request, _csrf: None = Depends(verify_csrf)):
    request.session.clear()
    return RedirectResponse("/", status_code=303)


# --------------------------------------------------------------------------- #
# Candidate
# --------------------------------------------------------------------------- #
@app.get("/candidate", response_class=HTMLResponse)
def candidate_dashboard(
    request: Request,
    work_mode: str = "",
    employment_type: str = "",
    page: int = 1,
    apps_page: int = 1,
    db: sqlite3.Connection = Depends(get_db),
):
    user, redirect = _require(request, db, "candidate")
    if redirect:
        return redirect
    sweep_expired_jobs(db)  # drop postings that hit the pricing cap from search
    prof = _profile(db, user["id"])

    # Only live postings are visible to candidates.
    sql = (
        "SELECT j.*, u.company_name FROM jobs j "
        "JOIN users u ON u.id = j.employer_id "
        "WHERE j.status = 'active' AND u.is_suspended = 0"
    )
    params: list = []
    if work_mode:
        sql += " AND j.work_mode = ?"
        params.append(work_mode)
    if employment_type:
        sql += " AND j.employment_type = ?"
        params.append(employment_type)
    sql += " ORDER BY j.created_at DESC, j.id DESC"
    jobs = db.execute(sql, params).fetchall()

    applied_ids = {
        r["job_id"]
        for r in db.execute(
            "SELECT job_id FROM applications WHERE candidate_id = ?", (user["id"],)
        ).fetchall()
    }
    job_rows = []
    for job in jobs:
        pct, matched, partial, missing = match_detail(
            prof["skills"], job["required_skills"]
        )
        job_rows.append(
            {
                "job": job,
                "pct": pct,
                "matched": matched,
                "partial": partial,
                "missing": missing,
                "applied": job["id"] in applied_ids,
            }
        )
    # Ranking depends on every job's score, so the list is ordered in memory and
    # then sliced. This bounds what is rendered, not what is scanned.
    job_rows.sort(key=lambda r: r["pct"], reverse=True)
    jobs_page = paginate(len(job_rows), page, JOBS_PER_PAGE)
    job_rows = jobs_page.slice(job_rows)

    # Applications paginate in SQL — no ranking involved.
    apps_total = db.execute(
        "SELECT COUNT(*) AS n FROM applications WHERE candidate_id = ?", (user["id"],)
    ).fetchone()["n"]
    apps_pg = paginate(apps_total, apps_page, MY_APPS_PER_PAGE)
    my_apps = db.execute(
        "SELECT a.*, j.title, u.company_name FROM applications a "
        "JOIN jobs j ON j.id = a.job_id "
        "JOIN users u ON u.id = j.employer_id "
        "WHERE a.candidate_id = ? ORDER BY a.created_at DESC, a.id DESC LIMIT ? OFFSET ?",
        (user["id"], apps_pg.per_page, apps_pg.offset),
    ).fetchall()

    return templates.TemplateResponse(
        request,
        "candidate.html",
        {
            "request": request,
            "user": user,
            "profile": prof,
            "job_rows": job_rows,
            "my_apps": my_apps,
            "jobs_page": jobs_page,
            "apps_page": apps_pg,
            "auto_min": AUTO_APPLY_MIN_MATCH,
            "work_modes": WORK_MODES,
            "employment_types": EMPLOYMENT_TYPES,
            "sel_work_mode": work_mode,
            "sel_employment_type": employment_type,
        },
    )


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


@app.post("/candidate/profile")
async def candidate_update_profile(
    request: Request,
    _csrf: None = Depends(verify_csrf),
    headline: str = Form(""),
    skills: str = Form(""),
    resume: Optional[UploadFile] = None,
    db: sqlite3.Connection = Depends(get_db),
):
    user, redirect = _require(request, db, "candidate")
    if redirect:
        return redirect
    prof = _profile(db, user["id"])
    resume_filename = prof["resume_filename"]
    final_skills = skills.strip()

    if resume is not None and resume.filename:
        safe_name, refused = await _save_resume(resume, user["id"])
        if refused:
            return RedirectResponse(
                f"/candidate?resume_error={refused}", status_code=303
            )
        dest = UPLOAD_DIR / safe_name
        resume_filename = safe_name

        # Auto-detect skills from the resume against a vocabulary of common
        # skills plus every skill employers currently require, then merge them
        # into whatever the candidate typed (never removing manual entries).
        job_skill_rows = db.execute("SELECT required_skills FROM jobs").fetchall()
        job_vocab: set[str] = set()
        for row in job_skill_rows:
            job_vocab |= parse_skills(row["required_skills"])
        resume_text = resume_module.extract_text(dest)
        detected = extract_skills(resume_text, job_vocab)
        merged = parse_skills(final_skills) | detected
        final_skills = ", ".join(sorted(merged))

    db.execute(
        "UPDATE candidate_profiles SET headline = ?, skills = ?, resume_filename = ?, "
        "updated_at = datetime('now') WHERE user_id = ?",
        (headline.strip(), final_skills, resume_filename, user["id"]),
    )
    db.commit()
    # Skills may have changed — keep auto-apply coverage current.
    _auto_apply_candidate_to_all_jobs(db, user["id"])
    return RedirectResponse("/candidate", status_code=303)


@app.post("/candidate/auto-apply")
def candidate_toggle_auto_apply(
    request: Request,
    _csrf: None = Depends(verify_csrf),
    db: sqlite3.Connection = Depends(get_db),
):
    user, redirect = _require(request, db, "candidate")
    if redirect:
        return redirect
    prof = _profile(db, user["id"])
    new_val = 0 if prof["auto_apply"] else 1
    # Turning it ON requires a confirmed address; turning it OFF is always fine.
    if new_val and not user["email_verified"]:
        return RedirectResponse("/candidate?verify_required=1", status_code=303)
    db.execute(
        "UPDATE candidate_profiles SET auto_apply = ? WHERE user_id = ?",
        (new_val, user["id"]),
    )
    db.commit()
    if new_val:
        _auto_apply_candidate_to_all_jobs(db, user["id"])
    return RedirectResponse("/candidate", status_code=303)


@app.post("/candidate/apply/{job_id}")
def candidate_apply(
    request: Request,
    job_id: int,
    _csrf: None = Depends(verify_csrf),
    db: sqlite3.Connection = Depends(get_db),
):
    user, redirect = _require(request, db, "candidate")
    if redirect:
        return redirect
    if not user["email_verified"]:
        return RedirectResponse("/candidate?verify_required=1", status_code=303)
    prof = _profile(db, user["id"])
    job = db.execute("SELECT required_skills FROM jobs WHERE id = ?", (job_id,)).fetchone()
    if job is not None:
        pct = match_pct(prof["skills"], job["required_skills"])
        db.execute(
            "INSERT OR IGNORE INTO applications "
            "(job_id, candidate_id, match_pct, source, status) "
            "VALUES (?, ?, ?, 'manual', 'applied')",
            (job_id, user["id"], pct),
        )
        db.commit()
    return RedirectResponse("/candidate", status_code=303)


@app.get("/resume/{candidate_id}")
def download_resume(
    request: Request, candidate_id: int, db: sqlite3.Connection = Depends(get_db)
):
    user, redirect = _require(request, db)
    if redirect:
        return redirect
    # Candidates may fetch their own; employers may fetch any applicant's.
    if user["role"] == "candidate" and user["id"] != candidate_id:
        return RedirectResponse("/candidate", status_code=303)
    prof = db.execute(
        "SELECT resume_filename FROM candidate_profiles WHERE user_id = ?",
        (candidate_id,),
    ).fetchone()
    if not prof or not prof["resume_filename"]:
        return HTMLResponse("No resume on file.", status_code=404)
    path = UPLOAD_DIR / prof["resume_filename"]
    if not path.exists():
        return HTMLResponse("Resume file missing.", status_code=404)
    return FileResponse(path, filename=prof["resume_filename"])


# --------------------------------------------------------------------------- #
# Employer
# --------------------------------------------------------------------------- #
@app.get("/employer/onboarding", response_class=HTMLResponse)
def employer_onboarding(request: Request, db: sqlite3.Connection = Depends(get_db)):
    """Multi-step wizard shown after employer signup."""
    user, redirect = _require(request, db, "employer")
    if redirect:
        return redirect
    company = _company(db, user["id"])
    if company["onboarding_step"] >= ONBOARDING_DONE:
        return RedirectResponse("/employer", status_code=303)
    return templates.TemplateResponse(
        request,
        "onboarding.html",
        {
            "request": request,
            "user": user,
            "company": company,
            "step": company["onboarding_step"],
            "company_sizes": COMPANY_SIZES,
        },
    )


@app.post("/employer/onboarding/company")
def employer_onboarding_company(
    request: Request,
    _csrf: None = Depends(verify_csrf),
    company_name: str = Form(""),
    industry: str = Form(""),
    size: str = Form(""),
    website: str = Form(""),
    hq_location: str = Form(""),
    about: str = Form(""),
    db: sqlite3.Connection = Depends(get_db),
):
    """Step 1 -> 2: save company details."""
    user, redirect = _require(request, db, "employer")
    if redirect:
        return redirect
    _company(db, user["id"])
    db.execute(
        "UPDATE users SET company_name = ? WHERE id = ?",
        (company_name.strip(), user["id"]),
    )
    db.execute(
        "UPDATE company_profiles SET industry = ?, size = ?, website = ?, "
        "hq_location = ?, about = ?, onboarding_step = 2, "
        "updated_at = datetime('now') WHERE user_id = ?",
        (industry.strip(), size.strip(), website.strip(), hq_location.strip(),
         about.strip(), user["id"]),
    )
    db.commit()
    return RedirectResponse("/employer/onboarding", status_code=303)


@app.post("/employer/onboarding/finish")
def employer_onboarding_finish(
    request: Request,
    _csrf: None = Depends(verify_csrf),
    db: sqlite3.Connection = Depends(get_db),
):
    """Complete onboarding (posting the first job is optional)."""
    user, redirect = _require(request, db, "employer")
    if redirect:
        return redirect
    _company(db, user["id"])
    db.execute(
        "UPDATE company_profiles SET onboarding_step = ? WHERE user_id = ?",
        (ONBOARDING_DONE, user["id"]),
    )
    db.commit()
    return RedirectResponse("/employer", status_code=303)


@app.get("/employer", response_class=HTMLResponse)
def employer_dashboard(
    request: Request, page: int = 1, db: sqlite3.Connection = Depends(get_db)
):
    user, redirect = _require(request, db, "employer")
    if redirect:
        return redirect
    company = _company(db, user["id"])
    if company["onboarding_step"] < ONBOARDING_DONE:
        return RedirectResponse("/employer/onboarding", status_code=303)

    sweep_expired_jobs(db)  # auto-close anything past the pricing cap first

    total = db.execute(
        "SELECT COUNT(*) AS n FROM jobs WHERE employer_id = ?", (user["id"],)
    ).fetchone()["n"]
    jobs_page = paginate(total, page, EMPLOYER_JOBS_PER_PAGE)
    rows = db.execute(
        "SELECT j.*, "
        "(SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS n_apps "
        "FROM jobs j WHERE j.employer_id = ? ORDER BY j.created_at DESC, j.id DESC "
        "LIMIT ? OFFSET ?",
        (user["id"], jobs_page.per_page, jobs_page.offset),
    ).fetchall()
    # Attach the live pricing state to each job on this page.
    jobs = []
    for j in rows:
        cost = pricing.cost_state(j["billable_seconds"], j["active_since"]) \
            if j["status"] == "active" else None
        jobs.append({"job": j, "cost": cost})

    # Rail stats over every job, plus the total running bill across active jobs.
    stats = db.execute(
        "SELECT "
        "SUM(status = 'active') AS active, "
        "SUM(status = 'draft') AS drafts, "
        "(SELECT COUNT(*) FROM applications a JOIN jobs j2 ON j2.id = a.job_id "
        " WHERE j2.employer_id = ?) AS applicants "
        "FROM jobs WHERE employer_id = ?",
        (user["id"], user["id"]),
    ).fetchone()
    active_jobs = db.execute(
        "SELECT billable_seconds, active_since FROM jobs "
        "WHERE employer_id = ? AND status = 'active'",
        (user["id"],),
    ).fetchall()
    running_bill = sum(
        pricing.cost_state(a["billable_seconds"], a["active_since"]).accrued
        for a in active_jobs
    )

    return templates.TemplateResponse(
        request,
        "employer.html",
        {
            "request": request, "user": user, "jobs": jobs, "company": company,
            "jobs_page": jobs_page,
            "stat_active": stats["active"] or 0,
            "stat_drafts": stats["drafts"] or 0,
            "stat_applicants": stats["applicants"] or 0,
            "running_bill": running_bill,
            "currency": pricing.CURRENCY,
            "cap_days": pricing.CAP_DAYS,
        },
    )


@app.post("/employer/company")
def employer_update_company(
    request: Request,
    _csrf: None = Depends(verify_csrf),
    company_name: str = Form(""),
    industry: str = Form(""),
    size: str = Form(""),
    website: str = Form(""),
    hq_location: str = Form(""),
    about: str = Form(""),
    db: sqlite3.Connection = Depends(get_db),
):
    user, redirect = _require(request, db, "employer")
    if redirect:
        return redirect
    _company(db, user["id"])  # ensure the row exists
    db.execute(
        "UPDATE users SET company_name = ? WHERE id = ?",
        (company_name.strip(), user["id"]),
    )
    db.execute(
        "UPDATE company_profiles SET industry = ?, size = ?, website = ?, "
        "hq_location = ?, about = ?, updated_at = datetime('now') WHERE user_id = ?",
        (industry.strip(), size.strip(), website.strip(), hq_location.strip(),
         about.strip(), user["id"]),
    )
    db.commit()
    return RedirectResponse("/employer", status_code=303)


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


@app.get("/employer/jobs/new", response_class=HTMLResponse)
def employer_new_job_form(request: Request, db: sqlite3.Connection = Depends(get_db)):
    user, redirect = _require(request, db, "employer")
    if redirect:
        return redirect
    return templates.TemplateResponse(
        request, "job_new.html", _job_form_context(request, user, {}, [])
    )


@app.post("/employer/jobs")
def employer_create_job(
    request: Request,
    _csrf: None = Depends(verify_csrf),
    title: str = Form(...),
    location: str = Form(""),
    required_skills: str = Form(""),
    description: str = Form(""),
    employment_type: str = Form("Full-time"),
    work_mode: str = Form("On-site"),
    exp_min: int = Form(0),
    exp_max: int = Form(0),
    salary_min: float = Form(0),
    salary_max: float = Form(0),
    hide_salary: Optional[str] = Form(None),
    vacancies: int = Form(1),
    education: str = Form(""),
    department: str = Form(""),
    deadline: str = Form(""),
    action: str = Form("publish"),
    db: sqlite3.Connection = Depends(get_db),
):
    user, redirect = _require(request, db, "employer")
    if redirect:
        return redirect

    status = "draft" if action == "draft" else "active"
    # An unverified employer may draft roles but not publish them to candidates.
    if status == "active" and not user["email_verified"]:
        form = {
            "title": title, "location": location, "required_skills": required_skills,
            "description": sanitize_html(description), "employment_type": employment_type,
            "work_mode": work_mode, "exp_min": exp_min, "exp_max": exp_max,
            "salary_min": salary_min, "salary_max": salary_max,
            "hide_salary": bool(hide_salary), "vacancies": vacancies,
            "education": education, "department": department, "deadline": deadline,
        }
        return templates.TemplateResponse(
            request,
            "job_new.html",
            _job_form_context(request, user, form, [
                "Confirm your email address before publishing a job. "
                "You can still save this role as a draft — check your inbox for "
                "the verification link, or resend it from your dashboard."
            ]),
            status_code=403,
        )

    # Keep experience ranges sane rather than rejecting the whole form.
    exp_min, exp_max = max(0, exp_min), max(0, exp_max)
    if exp_max and exp_max < exp_min:
        exp_min, exp_max = exp_max, exp_min

    # Descriptions arrive as HTML from the editor — allowlist it before storing.
    description = sanitize_html(description)

    # --- Salary is mandatory and must be expressed in lakhs per annum -------- #
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

    if errors:
        form = {
            "title": title, "location": location, "required_skills": required_skills,
            "description": description, "employment_type": employment_type,
            "work_mode": work_mode, "exp_min": exp_min, "exp_max": exp_max,
            "salary_min": salary_min, "salary_max": salary_max,
            "hide_salary": bool(hide_salary), "vacancies": vacancies,
            "education": education, "department": department, "deadline": deadline,
        }
        return templates.TemplateResponse(
            request,
            "job_new.html",
            _job_form_context(request, user, form, errors),
            status_code=400,
        )

    # A job published straight away starts its pricing meter now; a draft does not.
    active_since = "datetime('now')" if status == "active" else "''"
    cur = db.execute(
        "INSERT INTO jobs (employer_id, title, description, required_skills, location, "
        "employment_type, work_mode, exp_min, exp_max, salary_min, salary_max, "
        "hide_salary, vacancies, education, department, deadline, status, active_since) "
        f"VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, {active_since})",
        (
            user["id"], title.strip(), description.strip(), required_skills.strip(),
            location.strip(), employment_type, work_mode, exp_min, exp_max,
            salary_min, salary_max, 1 if hide_salary else 0, max(1, vacancies),
            education.strip(), department.strip(), deadline.strip(), status,
        ),
    )
    db.commit()
    # Posting a job satisfies the final onboarding step.
    _company(db, user["id"])
    db.execute(
        "UPDATE company_profiles SET onboarding_step = ? WHERE user_id = ?",
        (ONBOARDING_DONE, user["id"]),
    )
    db.commit()
    # Auto-apply candidates never miss a new posting (drafts are skipped).
    _auto_apply_all_candidates_to_job(db, cur.lastrowid)
    return RedirectResponse("/employer", status_code=303)


@app.post("/employer/jobs/{job_id}/status")
def employer_set_job_status(
    request: Request,
    job_id: int,
    _csrf: None = Depends(verify_csrf),
    status: str = Form(...),
    db: sqlite3.Connection = Depends(get_db),
):
    """Publish a draft, or close / reopen a posting."""
    user, redirect = _require(request, db, "employer")
    if redirect:
        return redirect
    if status not in ("draft", "active", "closed"):
        return RedirectResponse("/employer", status_code=303)
    if status == "active" and not user["email_verified"]:
        return RedirectResponse("/employer?verify_required=1", status_code=303)
    owned = db.execute(
        "SELECT * FROM jobs WHERE id = ? AND employer_id = ?", (job_id, user["id"])
    ).fetchone()
    if owned is None:
        return RedirectResponse("/employer", status_code=303)
    _set_job_status(db, owned, status)  # moves the pricing meter too
    if status == "active":
        # Going live pulls in auto-apply candidates that match.
        _auto_apply_all_candidates_to_job(db, job_id)
    return RedirectResponse("/employer", status_code=303)


@app.get("/employer/jobs/{job_id}/matches", response_class=HTMLResponse)
def employer_job_matches(
    request: Request, job_id: int, page: int = 1,
    db: sqlite3.Connection = Depends(get_db),
):
    user, redirect = _require(request, db, "employer")
    if redirect:
        return redirect
    job = db.execute(
        "SELECT * FROM jobs WHERE id = ? AND employer_id = ?", (job_id, user["id"])
    ).fetchone()
    if job is None:
        return RedirectResponse("/employer", status_code=303)

    # Every candidate, ranked by skill match — the "profile is sent to the
    # employer based on the percentage of skills" requirement.
    candidates = db.execute(
        "SELECT u.id, u.name, u.email, p.headline, p.skills, p.resume_filename "
        "FROM candidate_profiles p JOIN users u ON u.id = p.user_id "
        "WHERE u.is_suspended = 0 ORDER BY u.id"
    ).fetchall()
    applied_ids = {
        r["candidate_id"]: r
        for r in db.execute(
            "SELECT candidate_id, source FROM applications WHERE job_id = ?", (job_id,)
        ).fetchall()
    }
    rows = []
    for cand in candidates:
        pct, matched, partial, missing = match_detail(
            cand["skills"], job["required_skills"]
        )
        if pct < EMPLOYER_MATCH_THRESHOLD:
            continue
        app_row = applied_ids.get(cand["id"])
        rows.append(
            {
                "cand": cand,
                "pct": pct,
                "matched": matched,
                "partial": partial,
                "missing": missing,
                "applied": app_row is not None,
                "source": app_row["source"] if app_row else None,
            }
        )
    # Ranked in memory (match % isn't a stored column), then sliced.
    rows.sort(key=lambda r: r["pct"], reverse=True)
    matches_page = paginate(len(rows), page, MATCHES_PER_PAGE)
    rows = matches_page.slice(rows)

    return templates.TemplateResponse(
        request,
        "job_matches.html",
        {
            "request": request, "user": user, "job": job, "rows": rows,
            "matches_page": matches_page,
            "sent_to": request.query_params.get("sent", ""),
        },
    )


@app.get("/employer/jobs/{job_id}/applicants", response_class=HTMLResponse)
def employer_applicants(
    request: Request,
    job_id: int,
    stage: str = "",
    page: int = 1,
    db: sqlite3.Connection = Depends(get_db),
):
    """Hiring pipeline for one job — everyone who actually applied."""
    user, redirect = _require(request, db, "employer")
    if redirect:
        return redirect
    job = db.execute(
        "SELECT * FROM jobs WHERE id = ? AND employer_id = ?", (job_id, user["id"])
    ).fetchone()
    if job is None:
        return RedirectResponse("/employer", status_code=303)

    # Stage tallies always cover the whole job, independent of the current page.
    counts = {s: 0 for s in APPLICATION_STAGES}
    for row in db.execute(
        "SELECT status, COUNT(*) AS n FROM applications WHERE job_id = ? "
        "GROUP BY status", (job_id,),
    ):
        counts[row["status"]] = row["n"]

    where, params = "a.job_id = ?", [job_id]
    if stage in APPLICATION_STAGES:
        where += " AND a.status = ?"
        params.append(stage)

    shown_total = db.execute(
        f"SELECT COUNT(*) AS n FROM applications a WHERE {where}", params
    ).fetchone()["n"]
    apps_page = paginate(shown_total, page, APPLICANTS_PER_PAGE)
    rows = db.execute(
        "SELECT a.*, u.name, u.email, p.headline, p.skills, p.resume_filename "
        "FROM applications a "
        "JOIN users u ON u.id = a.candidate_id "
        "LEFT JOIN candidate_profiles p ON p.user_id = a.candidate_id "
        f"WHERE {where} ORDER BY a.match_pct DESC, a.created_at, a.id "
        "LIMIT ? OFFSET ?",
        (*params, apps_page.per_page, apps_page.offset),
    ).fetchall()

    return templates.TemplateResponse(
        request,
        "applicants.html",
        {
            "request": request, "user": user, "job": job, "rows": rows,
            "counts": counts, "total": sum(counts.values()),
            "apps_page": apps_page,
            "pipeline_stages": PIPELINE_STAGES, "other_stages": OTHER_STAGES,
            "all_stages": APPLICATION_STAGES, "sel_stage": stage,
        },
    )


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


@app.post("/employer/applications/{application_id}/stage")
def employer_set_application_stage(
    request: Request,
    application_id: int,
    _csrf: None = Depends(verify_csrf),
    stage: str = Form(...),
    notify: Optional[str] = Form(None),
    db: sqlite3.Connection = Depends(get_db),
):
    user, redirect = _require(request, db, "employer")
    if redirect:
        return redirect
    app_row = _owned_application(db, user["id"], application_id)
    if app_row is None or stage not in APPLICATION_STAGES:
        return RedirectResponse("/employer", status_code=303)

    db.execute(
        "UPDATE applications SET status = ?, updated_at = datetime('now') WHERE id = ?",
        (stage, application_id),
    )
    db.commit()

    # Telling the candidate is opt-in per change — never automatic.
    if notify and user["email_verified"]:
        allowed, _ = ratelimit.check(f"contact:{user['id']}", *CONTACT_EMAIL_LIMIT)
        if allowed:
            company = user["company_name"] or "the hiring team"
            mailer.send_email(
                to=app_row["email"],
                subject=f"Update on your application for {app_row['job_title']}",
                body=(
                    f"Hi {app_row['name'] or 'there'},\n\n"
                    f"There's an update on your application for "
                    f"{app_row['job_title']} at {company}.\n\n"
                    f"Current status: {STAGE_LABELS.get(stage, stage)}\n\n"
                    f"Best regards,\n{company}\n"
                ),
                reply_to=user["email"],
            )
    return RedirectResponse(
        f"/employer/jobs/{app_row['job_id']}/applicants", status_code=303
    )


@app.post("/employer/applications/{application_id}/notes")
def employer_save_application_notes(
    request: Request,
    application_id: int,
    _csrf: None = Depends(verify_csrf),
    notes: str = Form(""),
    db: sqlite3.Connection = Depends(get_db),
):
    user, redirect = _require(request, db, "employer")
    if redirect:
        return redirect
    app_row = _owned_application(db, user["id"], application_id)
    if app_row is None:
        return RedirectResponse("/employer", status_code=303)
    db.execute(
        "UPDATE applications SET notes = ?, updated_at = datetime('now') WHERE id = ?",
        (notes.strip()[:4000], application_id),
    )
    db.commit()
    return RedirectResponse(
        f"/employer/jobs/{app_row['job_id']}/applicants", status_code=303
    )


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


@app.get("/employer/jobs/{job_id}/contact/{candidate_id}", response_class=HTMLResponse)
def employer_contact_form(
    request: Request, job_id: int, candidate_id: int,
    db: sqlite3.Connection = Depends(get_db),
):
    user, redirect = _require(request, db, "employer")
    if redirect:
        return redirect
    job, cand = _contact_target(db, user, job_id, candidate_id)
    if job is None or cand is None:
        return RedirectResponse("/employer", status_code=303)

    company = user["company_name"] or "our company"
    subject = f"Regarding your application for {job['title']} at {company}"
    body = (
        f"Hi {cand['name'] or 'there'},\n\n"
        f"We reviewed your profile for the {job['title']} role and would like "
        f"to connect.\n\n"
        f"Best regards,\n{user['name'] or ''}\n{company}"
    )
    return templates.TemplateResponse(
        request,
        "contact.html",
        {
            "request": request, "user": user, "job": job, "cand": cand,
            "subject": subject, "body": body,
            "mail_configured": mailer.is_configured(),
            "backend": mailer.backend(),
            "error": None,
        },
    )


@app.post("/employer/jobs/{job_id}/contact/{candidate_id}")
def employer_contact_send(
    request: Request,
    job_id: int,
    candidate_id: int,
    _csrf: None = Depends(verify_csrf),
    subject: str = Form(...),
    body: str = Form(...),
    db: sqlite3.Connection = Depends(get_db),
):
    user, redirect = _require(request, db, "employer")
    if redirect:
        return redirect
    job, cand = _contact_target(db, user, job_id, candidate_id)
    if job is None or cand is None:
        return RedirectResponse("/employer", status_code=303)

    if not user["email_verified"]:
        return templates.TemplateResponse(
            request,
            "contact.html",
            {
                "request": request, "user": user, "job": job, "cand": cand,
                "subject": subject, "body": body,
                "mail_configured": mailer.is_configured(),
                "backend": mailer.backend(),
                "error": "Confirm your email address before contacting candidates.",
            },
            status_code=403,
        )

    allowed, retry = ratelimit.check(f"contact:{user['id']}", *CONTACT_EMAIL_LIMIT)
    if not allowed:
        return templates.TemplateResponse(
            request,
            "contact.html",
            {
                "request": request, "user": user, "job": job, "cand": cand,
                "subject": subject, "body": body,
                "mail_configured": mailer.is_configured(),
                "backend": mailer.backend(),
                "error": (
                    f"You've sent a lot of emails recently. "
                    f"Please try again in {retry // 60 + 1} minute(s)."
                ),
            },
            status_code=429,
        )

    ok, error = mailer.send_email(
        to=cand["email"],
        subject=subject.strip(),
        body=body,
        reply_to=user["email"],  # candidate replies straight to the recruiter
    )
    if not ok:
        return templates.TemplateResponse(
            request,
            "contact.html",
            {
                "request": request, "user": user, "job": job, "cand": cand,
                "subject": subject, "body": body,
                "mail_configured": mailer.is_configured(),
                "backend": mailer.backend(),
                "error": error,
            },
            status_code=502,
        )
    return RedirectResponse(
        f"/employer/jobs/{job_id}/matches?sent={cand['email']}", status_code=303
    )
