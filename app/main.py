"""SkillMatch job portal — FastAPI application.

Server-rendered (Jinja) with an in-process SQLite database. Two roles:
  * employer  — post jobs, view skill-ranked candidate matches & applications
  * candidate — build profile + upload resume, browse jobs with match %,
                apply manually, or flip the Auto-Apply toggle to never miss one.
"""
from __future__ import annotations

import os
import secrets
import sqlite3
from contextlib import asynccontextmanager
from datetime import date
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from markupsafe import Markup
from starlette.middleware.sessions import SessionMiddleware

from html import escape

from . import auth, db as dbmod, mailer, ratelimit, resume as resume_module
from .richtext import is_effectively_empty, sanitize_html
from .db import (
    AUTO_APPLY_MIN_MATCH,
    EMPLOYER_MATCH_THRESHOLD,
    UPLOAD_DIR,
    get_db,
    init_db,
)
from .matching import extract_skills, match_detail, match_pct, parse_skills

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


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _send_verification_email(request: Request, db: sqlite3.Connection, user) -> None:
    token = auth.create_verification_token(db, user["id"])
    link = str(request.base_url).rstrip("/") + f"/verify-email?token={token}"
    mailer.send_email(
        to=user["email"],
        subject="Confirm your SkillMatch email address",
        body=(
            f"Hi {user['name'] or 'there'},\n\n"
            f"Please confirm your email address to activate your SkillMatch "
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="SkillMatch Job Portal", lifespan=lifespan)
app.add_middleware(
    SessionMiddleware,
    secret_key=SECRET_KEY,
    same_site="lax",
    https_only=IS_PROD,  # Secure cookie flag when served over HTTPS in production
)
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")


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
    if role and user["role"] != role:
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
        "WHERE p.auto_apply = 1 AND u.email_verified = 1"
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
    """Liveness probe for the hosting platform."""
    return {"status": "ok"}


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
    ratelimit.reset(f"login:{email}")
    request.session["user_id"] = user["id"]
    return RedirectResponse(_post_login_url(db, user), status_code=303)


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
    if user["role"] != "employer":
        return templates.TemplateResponse(
            request,
            "employer_login.html",
            {"request": request,
             "error": "That's a candidate account — please use the candidate login."},
            status_code=403,
        )
    ratelimit.reset(f"login:{email}")
    request.session["user_id"] = user["id"]
    return RedirectResponse(_post_login_url(db, user), status_code=303)


# --------------------------------------------------------------------------- #
# Account & password management (shared by both roles)
# --------------------------------------------------------------------------- #
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
        subject="Reset your SkillMatch password",
        body=(
            f"Hi {user['name'] or 'there'},\n\n"
            f"We received a request to reset your SkillMatch password.\n"
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
    return templates.TemplateResponse(
        request,
        "account.html",
        {"request": request, "user": user, "error": None,
         "changed": request.query_params.get("changed") == "1"},
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
    db: sqlite3.Connection = Depends(get_db),
):
    user, redirect = _require(request, db, "candidate")
    if redirect:
        return redirect
    prof = _profile(db, user["id"])

    # Only live postings are visible to candidates.
    sql = (
        "SELECT j.*, u.company_name FROM jobs j "
        "JOIN users u ON u.id = j.employer_id WHERE j.status = 'active'"
    )
    params: list = []
    if work_mode:
        sql += " AND j.work_mode = ?"
        params.append(work_mode)
    if employment_type:
        sql += " AND j.employment_type = ?"
        params.append(employment_type)
    sql += " ORDER BY j.created_at DESC"
    jobs = db.execute(sql, params).fetchall()

    applied_ids = {
        r["job_id"]
        for r in db.execute(
            "SELECT job_id FROM applications WHERE candidate_id = ?", (user["id"],)
        ).fetchall()
    }
    job_rows = []
    for job in jobs:
        pct, matched, missing = match_detail(prof["skills"], job["required_skills"])
        job_rows.append(
            {
                "job": job,
                "pct": pct,
                "matched": matched,
                "missing": missing,
                "applied": job["id"] in applied_ids,
            }
        )
    job_rows.sort(key=lambda r: r["pct"], reverse=True)

    my_apps = db.execute(
        "SELECT a.*, j.title, u.company_name FROM applications a "
        "JOIN jobs j ON j.id = a.job_id "
        "JOIN users u ON u.id = j.employer_id "
        "WHERE a.candidate_id = ? ORDER BY a.created_at DESC",
        (user["id"],),
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
            "auto_min": AUTO_APPLY_MIN_MATCH,
            "work_modes": WORK_MODES,
            "employment_types": EMPLOYMENT_TYPES,
            "sel_work_mode": work_mode,
            "sel_employment_type": employment_type,
        },
    )


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
        ext = Path(resume.filename).suffix
        safe_name = f"resume_{user['id']}{ext}"
        dest = UPLOAD_DIR / safe_name
        with open(dest, "wb") as fh:
            fh.write(await resume.read())
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
def employer_dashboard(request: Request, db: sqlite3.Connection = Depends(get_db)):
    user, redirect = _require(request, db, "employer")
    if redirect:
        return redirect
    company = _company(db, user["id"])
    if company["onboarding_step"] < ONBOARDING_DONE:
        return RedirectResponse("/employer/onboarding", status_code=303)
    jobs = db.execute(
        "SELECT j.*, "
        "(SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS n_apps "
        "FROM jobs j WHERE j.employer_id = ? ORDER BY j.created_at DESC",
        (user["id"],),
    ).fetchall()
    return templates.TemplateResponse(
        request,
        "employer.html",
        {"request": request, "user": user, "jobs": jobs, "company": company},
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

    cur = db.execute(
        "INSERT INTO jobs (employer_id, title, description, required_skills, location, "
        "employment_type, work_mode, exp_min, exp_max, salary_min, salary_max, "
        "hide_salary, vacancies, education, department, deadline, status) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
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
        "SELECT id FROM jobs WHERE id = ? AND employer_id = ?", (job_id, user["id"])
    ).fetchone()
    if owned is None:
        return RedirectResponse("/employer", status_code=303)
    db.execute("UPDATE jobs SET status = ? WHERE id = ?", (status, job_id))
    db.commit()
    if status == "active":
        # Going live pulls in auto-apply candidates that match.
        _auto_apply_all_candidates_to_job(db, job_id)
    return RedirectResponse("/employer", status_code=303)


@app.get("/employer/jobs/{job_id}/matches", response_class=HTMLResponse)
def employer_job_matches(
    request: Request, job_id: int, db: sqlite3.Connection = Depends(get_db)
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
        "FROM candidate_profiles p JOIN users u ON u.id = p.user_id"
    ).fetchall()
    applied_ids = {
        r["candidate_id"]: r
        for r in db.execute(
            "SELECT candidate_id, source FROM applications WHERE job_id = ?", (job_id,)
        ).fetchall()
    }
    rows = []
    for cand in candidates:
        pct, matched, missing = match_detail(cand["skills"], job["required_skills"])
        if pct < EMPLOYER_MATCH_THRESHOLD:
            continue
        app_row = applied_ids.get(cand["id"])
        rows.append(
            {
                "cand": cand,
                "pct": pct,
                "matched": matched,
                "missing": missing,
                "applied": app_row is not None,
                "source": app_row["source"] if app_row else None,
            }
        )
    rows.sort(key=lambda r: r["pct"], reverse=True)

    return templates.TemplateResponse(
        request,
        "job_matches.html",
        {
            "request": request, "user": user, "job": job, "rows": rows,
            "sent_to": request.query_params.get("sent", ""),
        },
    )


@app.get("/employer/jobs/{job_id}/applicants", response_class=HTMLResponse)
def employer_applicants(
    request: Request,
    job_id: int,
    stage: str = "",
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

    rows = db.execute(
        "SELECT a.*, u.name, u.email, p.headline, p.skills, p.resume_filename "
        "FROM applications a "
        "JOIN users u ON u.id = a.candidate_id "
        "LEFT JOIN candidate_profiles p ON p.user_id = a.candidate_id "
        "WHERE a.job_id = ? ORDER BY a.match_pct DESC, a.created_at",
        (job_id,),
    ).fetchall()

    counts = {s: 0 for s in APPLICATION_STAGES}
    for r in rows:
        counts[r["status"]] = counts.get(r["status"], 0) + 1
    if stage in APPLICATION_STAGES:
        rows = [r for r in rows if r["status"] == stage]

    return templates.TemplateResponse(
        request,
        "applicants.html",
        {
            "request": request, "user": user, "job": job, "rows": rows,
            "counts": counts, "total": sum(counts.values()),
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
