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

## Why `/candidate` did not scale

Timing the handler's phases under load answered it. Same request, one user
versus four:

| Phase | 1 user | 4 users | Growth |
|---|---:|---:|---:|
| `sweep_expired_jobs()` | 0.72 ms | **37.6 ms** | 52× |
| Scoring + ranking every job | 1.33 ms | **109.5 ms** | 82× |
| The other queries | 0.19 ms | 1.77 ms | 9× |
| Template render | 1.90 ms | 2.52 ms | 1.3× |

The two phases that explode are precisely the two that loop over **every active
job in pure Python**. Rendering — also Python, but over the ten rows one page
shows — barely moves. Four times the concurrency makes that work 50–80× slower,
not 4× slower, because CPU-bound Python threads contend for the GIL instead of
running side by side.

So the cliff was never one slow thing. It is *per-request work proportional to
the number of active jobs*, in a runtime that cannot do such work in parallel.
That is why `/account` sustains 284 req/s: it has no such loop.

### Fixed: the sweep no longer runs on every render

Expiring a job is bookkeeping against a 30-day cap, not part of drawing a page,
and it cost `O(active jobs)` inside every list view. It is now throttled to at
most once a minute (`SWEEP_MIN_INTERVAL_SECONDS`), behind a lock so concurrent
requests cannot all sweep at once — which also closes an existing hole where two
parallel requests could each close *and each audit* the same expired job.

`/candidate` alone, before and after that change:

| Users | Sweep every render | Sweep throttled | |
|---:|---|---|---|
| 1 | 123 req/s · p50 7.5 ms | 128 req/s · p50 7.0 ms | — |
| 4 | 23.3 req/s · p50 169 ms | **34.1 req/s · p50 113 ms** | +46% |
| 10 | 12.3 req/s · p50 834 ms | 15.2 req/s · p50 584 ms | +24% |
| 40 | — | 8.9 req/s · p50 2767 ms | |

### Still open: ranking is O(active jobs) per render

The remaining 109 ms is the match loop. Memoizing made each score a cache
lookup, but the page still touches every active job to rank them and then shows
ten. Removing the cliff means not doing that work per request at all —
persisting scores so the page can `ORDER BY` and `LIMIT` in SQL, invalidated
when a candidate's skills or the job list change.

That is a schema change with real invalidation questions, so it is named here
rather than attempted: it is the next piece of work, and the measurements above
are the case for it.

## What to do, in the order the measurements support

1. **Persist match scores** so ranking is a SQL `ORDER BY … LIMIT` rather than
   a Python loop over every active job. That is the only change left that
   removes the cliff rather than shaving it.
2. **Postgres before more workers.** Extra uvicorn workers cannot help while
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
