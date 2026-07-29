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
- Candidates see their current stage on their own dashboard as a **graphical
  progress bar** — a five-step stepper (Applied → Shortlisted → Interview →
  Offered → Hired) with completed steps filled and the current one highlighted.
  *On hold* and *Rejected* render as their own coloured end states.
- **Notifying the candidate is opt-in per change** — tick *Email the candidate*
  when moving a stage. Nothing is ever sent automatically, so a rejection can't
  go out by accident.

Every action is ownership-checked: an employer can only view or modify
applications belonging to their own jobs.

### Admin console

A moderation surface at `/admin`, gated to accounts with the admin flag:

- **Overview** — platform counts (candidates, employers, jobs, applications) and
  the newest accounts and postings.
- **Users** — search and filter by role; **suspend / reinstate** any non-admin
  account with an optional reason.
- **Jobs** — filter by status; **take a posting down** (sets it to Closed).

Suspending an account takes effect immediately and everywhere: sign-in is
refused, any **live session is ended on the next request**, the employer's jobs
disappear from candidate search, and a suspended candidate drops out of matches
and Auto-Apply. Nothing is deleted — it is fully reversible.

**Admin is never self-service.** There is no signup path, no in-app promotion,
and the signup form ignores an `is_admin` field. Rights are granted only from
the server:

```bash
python manage.py make-admin you@example.com
python manage.py list-admins
python manage.py revoke-admin you@example.com
```

Guard rails: an admin cannot suspend themselves or another admin, so the
platform can never be locked out of its own console.

**Audit log** (`/admin/audit`) — an append-only record of every moderation
action: suspensions, reinstatements, job takedowns, and admin grants (including
those made from `manage.py`). The app only inserts and reads these rows — there
is no edit or delete path. Each entry snapshots who acted, the target's
email/title *at the time*, the reason, and the actor's IP, so history stays
accurate even after the referenced account or job changes. Filterable by action
and paginated.

### Pagination

Every list view is paged, with the page number in the query string so links are
shareable and the back button works. Existing filters (work mode, employment
type, pipeline stage) are preserved across pages, and an out-of-range `?page=`
clamps to a valid page rather than erroring.

| View | Per page | Paged in |
|------|----------|----------|
| Candidate job list | 10 | memory (after match ranking) |
| Candidate applications | 10 | SQL |
| Employer job list | 10 | SQL |
| Job matches | 20 | memory (after match ranking) |
| Applicants pipeline | 20 | SQL |

The two ranked lists sort by match %, which isn't a stored column, so every
candidate row is scored before slicing — that bounds the HTML rendered, not the
rows scanned. Moving matching into SQL is the next step if those tables get
large.

Counts shown in headings, stage tiles and the right-rail stats reflect the
**whole** result set, not just the visible page. All paged queries carry a
deterministic tiebreaker (`… , id DESC`); without it, rows sharing a timestamp
could repeat on one page and vanish from another.

### How matching works (semantic)

Every required skill is scored 0–1 against the candidate's skills, and the
average becomes the match percentage:

```
match % = Σ(best score per required skill) / |required skills| × 100
```

| Signal | Score | Example |
|--------|-------|---------|
| Exact / alias | **1.0** | `k8s` → `kubernetes`, `JS` → `javascript`, `postgres` → `postgresql` |
| Related skill | **0.35–0.9** | `react` earns 0.6 toward `javascript`; `postgresql` earns 0.8 toward `sql` |
| Near-identical | **~0.85** | `kubernets` → `kubernetes` (typo) |
| Unrelated | **0** | `java` vs `javascript` — deliberately *not* a match |

Partial credit is shown to both sides as an amber chip explaining where it came
from (`javascript ≈ react`), so nobody has to guess why a score is what it is.

**Why not an LLM or embeddings?** Matching runs for every candidate × job pair
on every page render. The knowledge graph in `app/semantics.py` scores a pair in
~36 µs (≈7 ms for a 200-candidate page) with no API key, no network call and no
per-request cost — and it's deterministic, so scores are reproducible and
testable. An embedding or LLM backend could slot in behind `score_skill()` later
if the vocabulary outgrows a curated graph; it would need precomputed vectors
and caching to keep page renders fast.

With no aliases, related skills or typos involved the formula reduces to plain
keyword overlap, so previously-computed scores are unchanged.

A candidate profile "is sent to the employer" by surfacing on that job's
**Matches** page, ranked highest-first.

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

157 tests cover the matching logic (`parse_skills`, `match_pct`, `extract_skills`)
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

### Two-factor authentication (TOTP)

Any user can enable app-based 2FA from **Account settings**:

1. **Setup** shows a QR code (and a typeable secret) to add to Google
   Authenticator, Authy, 1Password, etc.
2. Enabling requires a valid code, which proves the authenticator is working
   before 2FA is switched on, and issues **10 single-use recovery codes** shown
   once.
3. After that, password login is only step one — it redirects to a **code
   challenge** at `/2fa`; the session isn't established until a valid TOTP or
   recovery code is entered. Code attempts are rate-limited.
4. **Disabling requires the password**, and enabling/disabling is written to the
   audit log.

The TOTP algorithm (RFC 6238) is implemented on the stdlib in `app/totp.py` —
no crypto dependency — and is checked against the RFC test vectors. Only the QR
image uses a third-party library (`segno`, pure-Python). Recovery codes are
stored hashed, like password-reset tokens.

**Not yet implemented:** SSO/OAuth and session revocation across devices.
See `app/auth.py`, `app/totp.py`, and `app/ratelimit.py`.

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
