# Week 1, Day 1 — Baseline and operability audit

**Date:** 2026-07-31

## What I did

Got Catchablepro running locally and audited it for operability rather than
features — the first real DevOps skill.

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/pytest -q          # 157 passed — baseline established
cp .env.example .env
.venv/bin/python seed.py
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## What I learned

**Establish a baseline before changing anything.** Running the tests first means
that when something breaks later, I know whether I broke it. Without a baseline,
a pre-existing failure costs hours of debugging.

**`127.0.0.1` vs `0.0.0.0`.** Loopback vs all interfaces. Binding to loopback
inside a container makes the app unreachable from outside it, because the
container's loopback is not the host's. Most common cause of "the container is
running but I can't reach it."

**`git check-ignore -v <file>`** shows exactly which `.gitignore` rule is
matching a file. Fastest way to debug "why won't git track this?"

**Dependency ranges are a latent outage.** `fastapi>=0.111` resolved to 0.141.1
today; a fresh build next month could resolve to something else and break
silently. Pinning is a Week 2 task.

## Operability audit

The application code is clean — 157 tests, real features. It is badly
*operable*, which is a completely different axis. That gap is the job.

| Concern | Current state | Consequence |
|---|---|---|
| State | SQLite, in-process | One replica forever. No failover, no backup, no pool |
| Uploads | Local disk `data/uploads` | Two replicas = resumes disappear half the time |
| Schema | `CREATE TABLE IF NOT EXISTS` | No migrations, no versioning, no rollback |
| Health | `/healthz` returns hardcoded `{"status":"ok"}` | Returns 200 with the DB down — a confident lie |
| Readiness | Only one endpoint | "Restart me?" and "send me traffic?" are different questions |
| Logging | Only `mailer.py`, plain text | No request IDs, no correlation, no searchability |
| Container user | root (no `USER`) | Container escape means root on the node |
| Container health | No `HEALTHCHECK` | Docker can't distinguish running from working |
| Image | Single stage | Build tools shipped to production; larger attack surface |
| CI | Tests + `docker build` | Image is built then discarded. No lint, types, coverage, or scans |
| Metrics | None | Cannot answer "is it slow?" |

**Most instructive finding: the `/healthz` endpoint.** It looks correct, returns
200, and would pass code review. It is worse than having no health check,
because it produces confident false negatives — Kubernetes would keep routing
traffic to a pod whose database is gone. A health check must exercise its
dependencies. Rewriting this is a Day 7 task.

## What broke

Nothing yet. Two constraints found instead:

1. **Branch protection was unavailable** — private repo on a free GitHub org
   returns 403. Also capped Actions at 2,000 min/month, which the Week 2
   pipeline would burn through. Fixed by making the repo public after scanning
   all 20 commits for secrets (clean — `.env` was never committed).
2. **Commits are split across two author identities**
   (`thrilochan.pakkapoti@gmail.com` and `weblogic.xml@gmail.com`), so the
   contribution graph is fragmented.

## Next

Day 2 — Linux and networking through this app: processes, ports, signals,
exit codes, DNS, TLS, log streams.
