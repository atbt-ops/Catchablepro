# SkillMatch — a skill-driven job portal

A working MVP job portal for **employers** and **candidates**, built for low latency:
FastAPI + Uvicorn, an **in-process SQLite** database (no network hop), and
**server-rendered** Jinja templates with no client-side framework (smallest payload).

## What it does

| Role | Capabilities |
|------|--------------|
| **Employer** | Register, post jobs with required skills, and see **candidates ranked by skill-match %** for each job — including who applied automatically. Download applicant resumes. |
| **Candidate** | Register, build a profile (headline + skills), **upload a resume**, browse jobs with a live **match %**, apply manually, or flip **Auto-Apply** to be applied to every matching job — now and in the future. |

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

15 tests cover the matching logic (`parse_skills`, `match_pct`, `extract_skills`)
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
job-portal/
├─ app/
│  ├─ main.py        # FastAPI app + all routes + auto-apply logic
│  ├─ db.py          # SQLite schema, connection, thresholds
│  ├─ auth.py        # PBKDF2 password hashing + session helper (stdlib only)
│  ├─ matching.py    # keyword-overlap skill match
│  ├─ templates/     # Jinja: landing, login, register, candidate, employer, matches
│  ├─ static/        # style.css (design system: light/dark themes)
│  └─ templates/     # + macros.html (SVG icons, animated match ring)
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
