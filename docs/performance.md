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

## Where the time goes

Timing the pieces of one dashboard render, against 104 active jobs:

| Component | Cost | Share of a ~22 ms request |
|---|---:|---:|
| Scoring every job against the candidate | 15.4 ms | **~70%** |
| `sweep_expired_jobs()` | 0.58 ms | <3% |
| `SELECT` active jobs | 0.34 ms | <2% |

Scoring dominated, so scoring is what got fixed. `_score_all()` and
`canonical()` are pure functions — the alias and related-skill tables are built
at import and never mutate, and an edited profile arrives as a different string
— so both are memoized. Measured on the same data: **15.67 ms → 0.19 ms**.

> An earlier version of this document listed "get the sweeps off the request
> path" as the first thing to fix. That was reasoning from what looked wasteful
> rather than from measurement, and it was wrong: the sweep is under 3% of the
> request. Measuring first changed the answer.

## Throughput and latency, before and after

Default mix (three parts `/candidate`, one `/account`, one `/healthz`), 104
active jobs, 203 candidate profiles. "Before" is the same benchmark run against
the unmemoized code.

| Users | Before | After | |
|---:|---|---|---|
| 1 | 46.5 req/s · p50 30 ms | **161.5 req/s · p50 6.9 ms** | 3.5× |
| 10 | 16.2 req/s · p50 840 ms | 20.5 req/s · p50 670 ms | 1.3× |
| 40 | 10.2 req/s · p50 3533 ms | 12.8 req/s · p50 1451 ms | 1.3× |

Zero errors at every level, before and after. It degrades into slowness rather
than failure — the better failure mode, and the harder one to notice.

**The single-user win is large and the concurrent win is not.** Removing 70% of
the per-request CPU did not fix the way this app behaves under concurrency,
which means the concurrency problem was never the scoring.

## The open question: `/candidate` does not scale, and we do not yet know why

Isolating endpoints at 10 concurrent users, after the fix:

| Target | Throughput | p50 |
|---|---:|---:|
| `/healthz` (no database) | 517 req/s | 17 ms |
| `/account` (authenticated, reads) | **284 req/s** | 30 ms |
| `/candidate` | **12.3 req/s** | 834 ms |

And `/candidate` alone, as concurrency rises:

| Users | Throughput | p50 |
|---:|---:|---:|
| 1 | 123 req/s | 7.5 ms |
| 2 | 105 req/s | 17.9 ms |
| 4 | **23 req/s** | **169 ms** |
| 10 | 12.3 req/s | 834 ms |

The cliff is between **two and four** concurrent users, and it is specific to
this one page. It is not the framework (`/healthz` serves 517 req/s), not
authentication or SQLite reads in general (`/account` serves 284 req/s), and no
longer the scoring (7.5 ms per request at one user).

That is as far as measurement has taken it. Root-causing the cliff is the next
piece of work, and it wants evidence rather than another plausible story —
candidates worth instrumenting include what the page does that `/account` does
not: it loads *every* active job, sorts them in Python, and runs
`sweep_expired_jobs()` over all of them, any of which may serialize under
contention in a way it does not in isolation.

## What to do, in the order the measurements support

1. **Root-cause the concurrency cliff** above. Until that is understood,
   everything else is guessing — as the sweeps-first ordering in the previous
   version of this document was.
2. **Then reconsider the sweeps.** Cheap in isolation, but they still do work in
   a request a user is waiting on, and they are one of the few things
   `/candidate` does that `/account` does not.
3. **Postgres before more workers.** Extra uvicorn workers cannot help while
   SQLite is the shared bottleneck, and they would break the in-process rate
   limiter, the in-process metrics counters *and* the memoization added here —
   each worker would keep its own cache.

## Caveats

- Measured on a 4-core container running the app, the load generator and the
  database together, on Python 3.11. Render's instance is smaller and load will
  arrive from outside, so treat these as **relative** figures for spotting
  regressions, not as a capacity promise.
- Single uvicorn worker, SQLite, as deployed today.
- The memoization flatters a benchmark that requests the same pages repeatedly.
  That is also what a real session does — one person reloading, paging and
  filtering re-asks identical questions — but a stream of first-time visitors
  each pay the full 15 ms once, and the cache holds 4096 pairs.
