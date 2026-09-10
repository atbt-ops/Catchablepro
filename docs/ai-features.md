# AI features: the employer assistant and the feedback digest

Two features use a language model. Both run against a **local
[Ollama](https://ollama.com) server you host** — no API key, no per-call cost,
nothing leaves the machine. Both are **optional**: with `AI_MODEL` unset the app
runs exactly as before and both surfaces show a "not configured" notice instead
of failing. Skill matching itself stays deterministic (`app/semantics.py`), as
[documented in the README](../README.md#how-matching-works-semantic).

Everything lives in `app/ai.py`. It talks to Ollama over HTTP with the `httpx`
already pinned in `requirements.txt` — no extra dependency.

---

## What they do

### 1. Employer AI assistant — `/employer/assistant`

Two modes, one shared rate limit (20 model calls per employer per hour):

- **Match** — paste a free-text job description. The model returns a structured
  `{title, seniority, skills[], summary}`; the app then runs the **existing**
  deterministic matcher over every candidate profile and shows them ranked by
  skill-match %, with matched / partial / missing skills per candidate.
- **Draft** — a one-line brief (`"senior react dev, fintech, remote, 5 yrs"`) →
  a full job description with the standard sections.

Either result has a **Post this role** button: it stashes the title, skills and
description in the session and opens `/employer/jobs/new` prefilled. The
employer reviews (salary and experience are never guessed) and posts.

- It does **not** post the job or contact anyone by itself.
- The match list and contact tools live on the posted job
  (`/employer/jobs/{id}/matches`).

### 2. Admin feedback digest — `/admin/feedback`

An admin clicks **Generate digest**. The model reads up to the 200 most recent
feedback entries and returns 3–7 themes, each with a summary, a severity, a
confidence, 1–3 example ids, and one concrete suggested fix. The result is
stored in `ai_digests` and rendered on the page; regenerating replaces it.

- **Advisory only.** The model reads and summarises. It does not write code,
  run commands, change data, or trigger a deploy. The suggested fixes are a
  starting point for a human to review.
- One model call per generation, shared rate limit with the assistant.

---

## Why there is no "auto-fix" agent

The original request was for an agent that reads feedback and **applies bugfixes
or hotfixes automatically**. That is not built, on purpose.

Feedback text is untrusted input — any candidate or employer can write anything
into it. An agent that pipes that text into a code-writing, deploy-capable loop
is a direct path to "submit feedback that makes the agent add a backdoor / dump
the database / disable auth, and it ships to production unreviewed." The digest
gives you the analysis without the blast radius; a person still opens the PR.

The digest's system prompt (`app/ai.py`, `_DIGEST_SYSTEM`) states plainly that
feedback items are untrusted data and that the model must never follow
instructions found inside them. `tests/test_ai_feedback.py` asserts that wording
stays in place.

---

## Enabling it

### 1. Run Ollama on the host

```powershell
# install from https://ollama.com, then:
$env:OLLAMA_HOST = "0.0.0.0:11434"   # so the container can reach it
ollama serve                          # (or just run the Ollama app)
ollama pull qwen2.5:7b                # good at following a JSON schema
```

Model picks, roughly:

| Tag | RAM (approx) | Notes |
|---|---|---|
| `qwen2.5:7b` | ~6 GB | solid JSON adherence; the default recommendation |
| `llama3.1:8b` | ~6 GB | fine alternative |
| `qwen2.5:14b` | ~10 GB | better digests if you have the memory |
| `qwen2.5:3b` | ~3 GB | works for the assistant; digests get shallow |

A GPU helps a lot but isn't required — the calls are infrequent and the app
never blocks a page waiting on one (failures become a notice).

### 2. Point the app at it

Add to `.env.production` (or `.env` locally):

```
AI_MODEL=qwen2.5:7b
# from inside Docker, reach the host this way (default):
OLLAMA_URL=http://host.docker.internal:11434
# a bare local run instead:
# OLLAMA_URL=http://127.0.0.1:11434
```

Then recreate the container so it picks up the new env — **no image rebuild
needed** for an env-only change:

```powershell
.\scripts\day-start.ps1
```

### Verify

```powershell
# host can talk to Ollama
curl.exe http://127.0.0.1:11434/api/tags

# the app sees it as configured
docker compose -f compose.production.yaml exec app `
  python -c "from app import ai; print(ai.is_configured(), ai.model_name())"

# end to end (uses the model — takes a few seconds)
docker compose -f compose.production.yaml exec app python -c "from app import ai; print(ai.extract_job_requirements('Senior backend engineer, strong Python, FastAPI, PostgreSQL, AWS.'))"
```

---

## Cost

None. It runs on your hardware. The only budget is time: a 7B model on CPU
answers the assistant in a few seconds and a full digest in 10–30s; a GPU cuts
that to under a second / a few seconds. The per-user rate limit (20/hour,
`AI_CALL_LIMIT` in `app/main.py`) is really just a guard against a stuck loop.

---

## Data

Two tables, both created on startup by `CREATE TABLE IF NOT EXISTS` in
`app/db.py` — no migration step.

`feedback`
: one row per submission. `user_id` is `ON DELETE SET NULL`; `role` and `email`
  are snapshotted so the row survives account deletion (same pattern as
  `audit_log`). `status` is `new` → `reviewed` → `actioned`, or `dismissed`.

`ai_digests`
: one row per generated digest. `kind` is `'feedback'`. `content` is the JSON
  payload from `ai.summarize_feedback`. `covered_to` is the highest feedback id
  the digest saw, so the admin page can flag "new feedback since".

Generating a digest also writes an `audit_log` entry (`ai.feedback_digest`).

---

## Failure behaviour

`app/ai.py` funnels every error (Ollama down, model not pulled, bad JSON,
timeout) through one boundary and re-raises it as `ai.AIUnavailable`. Routes
catch that and show a notice or a `flash=ai-error` banner — a failed or
misconfigured call never 500s a page.

| Symptom | Cause | Fix |
|---|---|---|
| "not configured" notice / `flash=not-configured` | `AI_MODEL` unset in the container | set it in `.env.production`, `day-start.ps1` |
| `flash=ai-error` on the digest / assistant errors | Ollama unreachable, model not pulled, or it returned bad JSON | `docker compose ... logs app \| Select-String catchablepro.ai` for the exception; check `curl http://127.0.0.1:11434/api/tags` and `ollama list` |
| connection refused from the container | Ollama bound to `127.0.0.1` only | restart it with `OLLAMA_HOST=0.0.0.0:11434` |
| digest is thin / ignores the schema | model too small | use `qwen2.5:7b` or larger |
| `flash=rate-limited` | >20 calls from that user this hour | wait, or raise `AI_CALL_LIMIT` |

Logs: the module logs under `catchablepro.ai` at WARNING on failure with the
exception type and message.

---

## Tests

`tests/test_ai_feedback.py` covers feedback capture, the admin workflow, and
both AI surfaces. `ai._chat_json` is stubbed (`stub_ai`) — the suite never makes
an HTTP call and needs no Ollama server.
