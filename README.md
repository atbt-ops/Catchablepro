# SkillMatch — a skill-driven job portal

A working MVP job portal for **employers** and **candidates**, built for low latency:
FastAPI + Uvicorn, an **in-process SQLite** database (no network hop), and
**server-rendered** Jinja templates with no client-side framework (smallest payload).

## What it does

| Role | Capabilities |
|------|--------------|
| **Employer** | Register, maintain a **company profile** (industry, size, website, about), post detailed jobs, and see **candidates ranked by skill-match %** for each job — including who applied automatically. Download applicant resumes. |
| **Candidate** | Register, build a profile (headline + skills), **upload a resume**, browse jobs with a live **match %**, apply manually, or flip **Auto-Apply** to be applied to every matching job — now and in the future. |

### Employer portal (separate from the candidate side)

Employers get their own entry points, like a dedicated recruiter site:

| Route | Purpose |
|-------|---------|
| `/employer/register` | Recruiter signup — name, designation, company, phone, work email |
| `/employer/login` | Employer login (rejects candidate accounts with a clear message) |
| `/employer/onboarding` | Multi-step setup wizard |

`/register` and `/login` are the **candidate** side. The landing page offers both
paths ("Find a job" vs "Hire talent").

**Onboarding wizard** — new employers are routed through it and the dashboard stays
gated until it's finished:

1. **Account created** — done at signup
2. **Company details** — name, industry, size, HQ location, website, about
3. **Post your first job** — or skip; posting a job also completes onboarding

Progress is stored per employer (`company_profiles.onboarding_step`), so it resumes
where they left off.

### Job posting (Naukri-style)

Employers post from a dedicated page (`/employer/jobs/new`) with:

- **Role basics** — title, department, employment type (Full-time/Part-time/Contract/
  Internship/Freelance), work mode (On-site/Hybrid/Remote), location, vacancies
- **Skills & experience** — required skills (drives matching), min/max years,
  minimum education, application deadline
- **Compensation** — min/max salary in ₹ LPA, with a *hide salary* option that
  shows candidates "Not disclosed"
- **Description** — free-text role details

**Job lifecycle:** `Draft → Active → Closed` (reopenable). Only **Active** jobs are
visible to candidates or eligible for Auto-Apply, so drafts stay private.

Candidates can filter the job list by **work mode** and **employment type**.

### Applicant tracking

Each job has an **Applicants** page (`/employer/jobs/{id}/applicants`) — the
hiring pipeline for people who actually applied, as opposed to **Matches**,
which ranks every candidate whose skills overlap.

```
Applied → Shortlisted → Interview → Offered → Hired      (+ On hold, Rejected)
```

- Pipeline tiles show a count per stage and double as filters.
- **Private notes** per applicant, visible only to the employer.
- Candidates see their current stage on their own dashboard.
- **Notifying the candidate is opt-in per change** — tick *Email the candidate*
  when moving a stage. Nothing is ever sent automatically, so a rejection can't
  go out by accident.

Every action is ownership-checked: an employer can only view or modify
applications belonging to their own jobs.

### How matching works (keyword overlap)

```
match % = |candidate_skills ∩ job_required_skills| / |job_required_skills| × 100
```

Skills are comma-separated, case-insensitive. A candidate profile "is sent to the
employer" by surfacing on that job's **Matches** page, ranked highest-first.

### Auto-Apply

When a candidate turns Auto-Apply **ON**:
- they are immediately applied to every existing job they share at least one skill with, and
- whenever an employer posts a **new** job, matching auto-apply candidates are applied automatically.

So a candidate never misses a single opportunity. Applications are tagged `Auto` vs `Manual`.

## UI / UX

Server-rendered with a self-contained design system (no external CSS/JS/CDN — keeps
payloads tiny and the app offline-friendly):

- **Light & dark themes** with a one-click toggle (persisted in `localStorage`, applied
  before first paint to avoid a flash).
- **Animated circular match-score rings** (inline SVG) — the match % is the visual centerpiece.
- Inline SVG icon set, avatar initials, skill chips (matched vs missing), status pills,
  a real toggle switch for Auto-Apply, friendly empty states, and a responsive layout.
- Components live in `app/templates/macros.html`; tokens/themes in `app/static/style.css`.

**Three-column app shell** (`app/templates/shell.html`) for signed-in dashboards,
so wide screens aren't mostly empty margin:

- **Left rail** — section navigation per role (jobs, profile, applications, settings).
- **Centre** — the main workspace.
- **Right rail** — contextual cards: candidate snapshot and a profile-strength
  meter, or the employer's hiring stats and quick actions.

The rails collapse away below 1180px and 900px respectively, so the layout
degrades to a single column on tablets and phones. Auth pages stay centred.

## Run it

```bash
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements.txt   # Windows
# source .venv/bin/activate && pip install -r requirements.txt  # macOS/Linux

python seed.py        # optional: demo employers, candidates, and jobs
python run.py         # serves http://127.0.0.1:8000
```

### Demo accounts (after `seed.py`) — password `password123`

- Employers: `hr@acme.io`, `talent@nimbus.dev`
- Candidates: `asha@example.com` (Auto-Apply on), `dev@example.com` (off), `sam@example.com` (on)

## Tests

```bash
pip install -r requirements-dev.txt
pytest
```

77 tests cover the matching logic (`parse_skills`, `match_pct`, `extract_skills`)
and the end-to-end flows (register/login, job posting, manual apply, CSRF
rejection, and the Auto-Apply backfill + new-job coverage). CI runs them on
every push via [GitHub Actions](.github/workflows/ci.yml).

## Docker

```bash
docker build -t skillmatch .
docker run -p 8000:8000 -e SECRET_KEY=change-me -v skillmatch-data:/app/data skillmatch
```

The SQLite DB and uploaded resumes live on the `/app/data` volume so they survive
container restarts.

## Deploy

The repo ships a [Render Blueprint](render.yaml). To go live:

1. Push this repo to GitHub (already done).
2. In [Render](https://dashboard.render.com): **New + → Blueprint** → connect this repo.
3. Render reads `render.yaml`, builds the Dockerfile, and generates a strong
   `SECRET_KEY` for you. Click **Apply**.
4. You get a public URL. Health checks hit `/healthz`.

**Persistence caveat:** the blueprint defaults to Render's **free** plan, which has
**no persistent disk** — the SQLite DB and uploaded resumes reset on every restart
or redeploy. That's fine for a demo. To keep data, change `plan: free` to
`plan: starter` in `render.yaml` and uncomment the `disk:` block (mounts at
`/app/data`).

Any Docker host works too — the image needs only `ENV=production` and a
`SECRET_KEY`, with a volume on `/app/data` for persistence.

### Production configuration

| Variable | Purpose |
|----------|---------|
| `ENV` | Set to `production` to enable `Secure` cookies. |
| `SECRET_KEY` | Session-cookie signing key. **Required** in production — the app refuses to start with the dev default. Generate: `python -c "import secrets; print(secrets.token_urlsafe(48))"` |

## Email

Employers contact candidates from **Matches → Contact**, which opens a compose
page prefilled with the candidate's address, the role, and a draft message. The
email is sent **server-side** (no dependency on the user having a mail client),
with `Reply-To` set to the recruiter so replies land in their inbox.

Pick a backend with `EMAIL_BACKEND`:

| Backend | When to use | Required variables |
|---------|-------------|--------------------|
| `console` *(default)* | Local dev and tests — **nothing is sent**, messages are logged | – |
| `smtp` | Gmail, Amazon SES, Mailgun, or SendGrid's SMTP relay | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_USE_TLS` |
| `sendgrid` | SendGrid over HTTPS — use when the host blocks SMTP ports | `SENDGRID_API_KEY` |

Set `EMAIL_FROM` to a verified sender address on your provider.

**SendGrid via SMTP** (simplest — one API key, no code change):

```bash
EMAIL_BACKEND=smtp
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey          # the literal word "apikey"
SMTP_PASSWORD=SG.xxxxx    # your SendGrid API key
EMAIL_FROM=no-reply@yourdomain.com
```

`console` is the deliberate default so a misconfigured deploy can never mail real
candidates by accident — the compose page shows a warning banner when no provider
is configured. Sending failures are surfaced in the UI rather than swallowed.

## Accounts & IAM

Shared by both roles:

| Route | Purpose |
|-------|---------|
| `/forgot-password` | Request a reset link by email |
| `/reset-password?token=…` | Set a new password from the emailed link |
| `/verify-email?token=…` | Confirm an email address from the signup link |
| `/resend-verification` | Send a fresh verification link |
| `/account` | View account details, verification status, change password |

### Email verification

Signing up sends a confirmation link (valid 48 hours, single-use). Until it's
used the account works, but the actions that carry weight are **locked** — this
is enforced server-side, not just hidden in the UI:

| Role | Blocked while unverified | Still allowed |
|------|--------------------------|---------------|
| **Employer** | Publishing a job, reopening a draft, contacting candidates | Signing in, onboarding, saving **drafts** |
| **Candidate** | Applying to jobs, enabling Auto-Apply | Signing in, editing profile, browsing jobs |

Unverified candidates are also skipped by Auto-Apply entirely, so an
unconfirmed address can never generate applications. A banner on every page
explains what's locked and offers a **Resend link** button (throttled to
5/hour).

Accounts created *before* this feature are grandfathered in as verified by the
migration, so upgrading never locks existing users out.

- **Password policy** — minimum 8 characters, must mix letters and numbers.
  Enforced on signup, reset, and change.
- **Reset tokens** — random 32-byte values, stored **hashed** (a database leak
  can't be used to reset accounts), **single-use**, and expiring after 60
  minutes. Issuing a new token invalidates earlier ones, and completing a reset
  clears the session.
- **No account enumeration** — `/forgot-password` returns the same confirmation
  whether or not the address exists.
- **Brute-force protection** — 8 failed logins per email in 15 minutes returns
  HTTP 429; a successful login clears the counter.
- **Rate limits** — password-reset requests (5/hour per email) and outbound
  contact emails (30/hour per employer) are throttled.

Counters are in-process, so with multiple workers each keeps its own; a shared
store (Redis) would be needed to scale out.

**Not yet implemented:** 2FA, SSO/OAuth, an admin role, and session revocation
across devices. See `app/auth.py` and `app/ratelimit.py`.

## Security

- **Passwords**: PBKDF2-HMAC-SHA256 with a per-user salt (stdlib only).
- **Sessions**: signed cookies with `HttpOnly` + `SameSite=Lax`, plus `Secure`
  when `ENV=production`.
- **CSRF**: every state-changing form carries a per-session token
  (`csrf_field()`); the `verify_csrf` dependency rejects any POST with a
  missing or mismatched token (HTTP 403), verified by a test.
- **Access control**: resumes are downloadable only by their owner or an employer.

## Project layout

```
.
├─ app/
│  ├─ main.py        # FastAPI app + all routes + auto-apply logic
│  ├─ db.py          # SQLite schema, migration, thresholds
│  ├─ auth.py        # PBKDF2 password hashing + session helper (stdlib only)
│  ├─ matching.py    # keyword-overlap skill match + resume skill extraction
│  ├─ resume.py      # resume text extraction (.txt/.pdf/.docx)
│  ├─ static/        # style.css (design system: light/dark themes)
│  └─ templates/     # Jinja pages + macros.html (SVG icons, match ring)
├─ tests/            # pytest: matching unit tests + app integration tests
├─ .github/workflows/ci.yml   # CI: tests + docker build
├─ data/             # portal.db + uploads/ (git-ignored)
├─ Dockerfile
├─ requirements.txt  # runtime deps
├─ requirements-dev.txt       # + pytest, httpx
├─ run.py            # uvicorn entrypoint
└─ seed.py           # demo data
```

## Configuration

- `SECRET_KEY` — session-cookie signing key (defaults to a dev value; set in production).
- Thresholds live in `app/db.py`: `AUTO_APPLY_MIN_MATCH` (min % to auto-apply) and
  `EMPLOYER_MATCH_THRESHOLD` (min % for a candidate to appear on a job's Matches page).

## Notes & next steps

- Passwords are hashed with PBKDF2-HMAC-SHA256 (stdlib). Sessions are signed cookies.
- **Resume skill auto-extraction:** on upload, the resume text (`.txt`, `.pdf`, `.docx`)
  is scanned for known skills — a base vocabulary **plus every skill employers currently
  require** — and the detected skills are merged into the candidate's profile (manual
  entries are never removed). See `app/resume.py` and `matching.extract_skills`.
- Lowest-latency production port: the same schema + logic in Go (`html/template` + SQLite)
  compiles to a single native binary for another step down in per-request latency.
