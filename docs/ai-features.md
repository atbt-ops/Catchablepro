# AI features: the employer assistant and the feedback digest

Two features call Claude. Both are **optional** — with no API key the app runs
exactly as before and both surfaces show a "not configured" notice instead of
failing. Nothing else in the product depends on an LLM; skill matching stays
deterministic (`app/semantics.py`), as
[documented in the README](../README.md#how-matching-works-semantic).

Everything lives in `app/ai.py`. The `anthropic` SDK is imported lazily inside
that module, so the app starts and the test suite runs whether or not the
package or the key is present.

---

## What they do

### 1. Employer AI assistant — `/employer/assistant`

An employer pastes a free-text job description. Claude returns a structured
`{title, seniority, skills[], summary}`; the app then runs the **existing**
deterministic matcher over every candidate profile and shows them ranked by
skill-match %, with the matched / partial / missing skills per candidate.

- It does **not** post the job, contact anyone, or write to the database.
- To actually reach the candidates the employer still posts the role — the
  match list and contact tools live on the posted job (`/employer/jobs/{id}/matches`).
- One LLM call per run. Rate-limited to 20 runs per employer per hour.

### 2. Admin feedback digest — `/admin/feedback`

An admin clicks **Generate digest**. Claude reads up to the 200 most recent
feedback entries and returns 3–7 themes, each with a summary, a severity, a
confidence, 1–3 example ids, and one concrete suggested fix. The result is
stored in `ai_digests` and rendered on the page; regenerating replaces it.

- **Advisory only.** The model reads and summarises. It does not write code,
  run commands, change data, or trigger a deploy. The suggested fixes are a
  starting point for a human to review.
- One LLM call per generation. Rate-limited with the employer assistant (shared
  `ai:{user_id}` bucket, 20/hour).

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

Add to `.env.production` (or `.env` for local):

```
ANTHROPIC_API_KEY=sk-ant-...
# optional; default is claude-opus-5. claude-sonnet-5 is ~2x cheaper.
AI_MODEL=claude-opus-5
```

Get a key at <https://console.anthropic.com/>. Then rebuild so the container
picks up the new value:

```powershell
.\scripts\day-start.ps1 -Rebuild
```

`compose.production.yaml` already passes the whole `.env.production` file into
the container, so no compose change is needed. The container stays `read_only`;
the SDK only reads the key from the environment and makes an HTTPS call — no
disk writes, no `HOME` needed.

### Verify after deploy

```powershell
# employer assistant page stops showing the "not configured" notice
curl.exe -s https://<host>/employer/assistant   # (after logging in as an employer)

# or from the container:
docker compose -f compose.production.yaml exec app `
  python -c "from app import ai; print(ai.is_configured(), ai.model_name())"
```

---

## Cost

Billed per call at [standard API rates](https://www.anthropic.com/pricing).
Rough order of magnitude with `claude-opus-5`:

| Call | Input | Output | ~Cost |
|---|---|---|---|
| JD → skills (assistant) | a job description (~1–2k tokens) | small JSON | ~$0.01–0.03 |
| Feedback digest | up to 200 items, capped at ~24k chars | a page of JSON | ~$0.05–0.15 |

The per-user hourly rate limit (20) is the main guard against a surprise bill.
Switch `AI_MODEL=claude-sonnet-5` to roughly halve it.

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

`app/ai.py` funnels every SDK error through one boundary and re-raises it as
`ai.AIUnavailable`. Routes catch that and show a notice or a `flash=ai-error`
banner — a failed or misconfigured AI call never 500s a page.

| Symptom | Cause | Fix |
|---|---|---|
| "not configured" notice / `flash=not-configured` | `ANTHROPIC_API_KEY` unset in the container | set it in `.env.production`, `day-start.ps1 -Rebuild` |
| `flash=ai-error` on the digest | bad key, network block, or an API error | check `docker compose ... logs app` for `catchablepro.ai` WARNING lines; the request id is logged |
| `flash=rate-limited` | >20 AI calls from that user this hour | wait, or raise `AI_CALL_LIMIT` in `app/main.py` |
| assistant returns "too short to analyse" | job description under 15 chars | paste the real JD |

Logs: the module logs under `catchablepro.ai` at WARNING on failure, with the
exception type and message (not the key).

---

## Tests

`tests/test_ai_feedback.py` covers feedback capture, the admin workflow, and
both AI surfaces. The Anthropic client is stubbed (`stub_ai`) — the suite never
makes a network call and needs no key.
