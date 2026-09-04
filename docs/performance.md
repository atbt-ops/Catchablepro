# Performance baseline

Measured, not guessed. Re-run it with `scripts/loadtest.py` whenever you change
anything on the request path, and replace the numbers below.

## How to reproduce

```bash
# Realistic volume — matching cost grows with jobs × candidates
python seed.py
python scripts/loadtest.py --generate --jobs 100 --candidates 200

# In another shell
python -m uvicorn app.main:app --port 8000

python scripts/loadtest.py --users 10 --duration 12
```

Each virtual user signs in as its own generated account. Logins are rate-limited
per email, so several users sharing one account measures the rate limiter rather
than the app — a mistake this tool made once and now prevents.

## The numbers

Default mix (three parts `/candidate`, one `/account`, one `/healthz`), against
104 active jobs and 203 candidate profiles.

| Concurrent users | Throughput | p50 | p95 | Errors |
|---:|---:|---:|---:|---:|
| 1 | 46.5 req/s | 30 ms | 35 ms | 0 |
| 5 | 23.4 req/s | 288 ms | 394 ms | 0 |
| 10 | 16.2 req/s | 840 ms | 1101 ms | 0 |
| 20 | 14.1 req/s | 1641 ms | 2360 ms | 0 |
| 40 | 10.2 req/s | 3533 ms | 4663 ms | 0 |

**p95 crosses one second at about 10 concurrent users**, and throughput *falls*
as concurrency rises. Nothing errors — it degrades into slowness rather than
failure, which is the better failure mode and also the harder one to notice.

## Where the cost is

Isolating one endpoint at a time makes the cause plain:

| Target | 1 user | 10 users |
|---|---:|---:|
| `/healthz` | — | **505 req/s**, p50 17 ms |
| `/candidate` | 30.6 req/s, p50 31 ms | **9.0 req/s**, p50 1044 ms |

The framework, the server and the event loop are not the problem: a trivial
endpoint serves 500 req/s on the same process. The candidate dashboard is,
and specifically it **does not run concurrently**. Ten simultaneous requests
each take 34× as long as one, and together deliver *less* total throughput than
a single user — so the concurrency is not just failing to help, it is costing
extra.

That shape points at serialization plus contention rather than raw slowness:

- The dashboard scores **every active job** against the signed-in candidate on
  every render. That is pure Python, so the GIL lets exactly one request do it
  at a time no matter how many threads are waiting.
- `sweep_expired_jobs()` and the auto-apply sweep run **inline in the request**,
  adding database work to a page a user is waiting on.
- Every request opens its own SQLite connection against one file.

## What to do about it, in order

Nothing here is worth doing before there is traffic — but when p95 starts
drifting, this is the order that pays:

1. **Get the sweeps off the request path.** They are the clearest waste: work
   that has nothing to do with rendering this page, done while a user waits.
2. **Stop recomputing every match on every render.** Cache per candidate and
   invalidate when their skills or the job list changes, or precompute scores
   into a table. This is the big one — it is what makes the page O(1) in the
   number of jobs instead of O(n).
3. **Only then consider more workers.** They will not help while SQLite is the
   shared bottleneck, and they would break the in-process rate limiter and the
   in-process metrics counters. Postgres first, then workers.

## Caveats

- Measured on a 4-core container running the app, the load generator and the
  database together, on Python 3.11. Render's instance is smaller and the load
  will come from outside, so treat these as **relative** figures for spotting
  regressions, not as a capacity promise.
- Single uvicorn worker, SQLite, no cache — the deployment as it stands today.
- The load generator competes with the app for the same CPUs, which flatters
  nothing: real clients would be elsewhere.
