# Monitoring

The app exposes `/metrics`. This is the other half: something that scrapes it,
something that alerts on it, and a dashboard for the questions an alert makes
you ask next.

Everything lives in `ops/` and is validated in CI, so a typo in an alert
expression fails a pull request rather than a 2am page.

## Start it

```bash
# The scrape credential — the same METRICS_TOKEN the app is deployed with.
# A file, not an environment variable: env vars show up in `docker inspect`.
printf '%s' "$METRICS_TOKEN" > ops/prometheus/metrics_token   # gitignored

# Point Prometheus at the deployment
$EDITOR ops/prometheus/prometheus.yml     # replace REPLACE-ME.onrender.com

docker compose -f ops/docker-compose.monitoring.yml up -d
```

- Prometheus — <http://localhost:9090> (targets at `/targets`, rules at `/rules`)
- Alertmanager — <http://localhost:9093>
- Grafana — <http://localhost:3000>, `admin` / `$GRAFANA_PASSWORD`

**Run this somewhere other than the app.** Monitoring that shares a fate with
the thing it monitors reports nothing about the outage you actually care about.
Your laptop is a fine start while you are small; it is not one once someone
else depends on the answer.

## The scrape

`/metrics` is off in production unless `METRICS_TOKEN` is set, and returns
**404** — not 401 — to a caller without the right bearer token. That is
deliberate (no reason to confirm the endpoint exists to a stranger) and it has
one operational consequence worth knowing before you meet it at speed:

> A misconfigured token looks exactly like the app being down. `up` goes to 0
> and `CatchableproDown` fires, on a service that is happily serving users.

So the first thing to check when that alert fires is `/healthz` with a plain
curl. If that answers 200, the problem is this file, not the app.

## What is measured

| Metric | Why it exists |
|---|---|
| `http_requests_total{method,route,status}` | Rate and errors, by route template |
| `http_request_duration_seconds{method,route}` | Duration, as a histogram, so percentiles are real |
| `app_ready` | The last readiness verdict — 0 means out of rotation |
| `app_dependency_up{check}` | Which dependency failed: `database` or `uploads` |
| `process_*`, `python_*` | Memory, CPU, GC, start time — free from `prometheus_client` |

`route` is the **route template**: `/candidate/apply/{job_id}` is one series no
matter how many jobs exist, and paths matching no route collapse into
`unmatched`. Labels with unbounded values are how a service quietly kills its
own metrics backend, and a stranger probing random URLs must not be able to
mint series.

The two readiness gauges are refreshed **by the `/readyz` endpoint itself**, not
on a timer inside the app: the probe opens the database and writes to disk, and
running it on a schedule as well as on every platform health check would make
the measurement into a load of its own. In the deployed setup Render calls
`/readyz` continuously, so they stay fresh. If nothing calls it, they go stale
rather than wrong — which is why the alert on them uses `min_over_time` instead
of trusting one sample.

## The alerts

Five, and no more. Each names one fault and points at the runbook section that
says what to do.

| Alert | Fires when | Severity | Runbook |
|---|---|---|---|
| `CatchableproDown` | No successful scrape for 2m | page | §2 It will not start |
| `CatchableproDependencyDown` | `app_dependency_up{check} == 0` for 2m | page | §3 database / §5 uploads |
| `CatchableproErrorRateHigh` | >5% 5xx for 10m | page | §4 Find the request |
| `CatchableproLatencyHigh` | p95 > 2s for 15m | ticket | `performance.md` |
| `CatchableproRestarted` | The process started in the last 15m | ticket | §3.3 No backup |

**page** means wake someone. **ticket** means look in the morning. That split is
section 9 of the runbook, and it is the whole point: an alert that fires for
everything trains you to ignore it, which is worse than no alert.

Three deliberate omissions:

- **No "no traffic" alert.** A quiet night is not an incident, and the error
  rate expression divides by total requests — which is `0/0`, `NaN`, and never
  satisfies a comparison. A service nobody is using cannot page you.
- **No per-route error alerts.** One page per fault. The dashboard breaks it
  down once you are already awake.
- **No CPU or memory alert.** Neither has ever been this app's problem; the
  wall is per-request Python work under the GIL, and latency catches that.

### `CatchableproRestarted` will annoy you, on purpose

On Render's free plan there is no persistent disk, so **every restart destroys
the database and every uploaded resume**. This alert is not "a process
restarted", it is "the data is gone". It will fire on every idle spin-down,
which is a fair measurement of how unsuitable that plan is for real users.

Delete the rule the day a disk is attached, when a restart becomes a non-event.

## Prove the alerts deliver

As shipped, `ops/alertmanager/alertmanager.yml` sends **nothing** — the default
receiver is empty. A fake destination that silently swallows pages is worse than
no monitoring, because it looks like monitoring. Fill in a Slack webhook or SMTP
block, then prove it end to end:

```bash
# Fire a synthetic alert straight at Alertmanager
curl -sS -X POST http://localhost:9093/api/v2/alerts \
  -H 'Content-Type: application/json' \
  -d '[{"labels":{"alertname":"TestPage","severity":"page"},
        "annotations":{"summary":"Ignore me — testing the pipeline"}}]'
```

If your phone does not buzz, you do not have alerting. Do this again after any
change to the receiver, and once more before you tell anyone the product is
live.

## The dashboard

`ops/grafana/dashboards/catchablepro.json`, provisioned from git with
`allowUiUpdates: false` — edits made in the UI are overwritten on restart. Change
the JSON and commit it, so the dashboard survives the machine it runs on.

Top row answers "is anything wrong": ready, throughput, error rate, p95, uptime.
Below that, rate and errors by route, latency percentiles, p95 per route, the
dependency checks, memory, and restarts.

The panel to watch as you grow is **latency percentiles**. p50 staying flat
while p99 climbs is the concurrency cliff in `performance.md` arriving: ranking
is `O(active jobs)` of pure Python per render, and Python cannot do that work in
parallel.

## What this still does not give you

Metrics tell you *that* something is wrong and roughly where. They do not give
you the stack trace, and one exception affecting one user shows up here as a
single 5xx and nothing else.

- **Error tracking** (Sentry or equivalent) — the missing piece. Metrics say
  "0.4% of requests failed"; Sentry says which line.
- **Uptime checks from outside** — everything here is scraped from one place. A
  network path that is broken only for your users looks perfectly healthy from
  the scraper.
- **Log aggregation** — logs are JSON on stdout with a `request_id` per line,
  which is grep on whatever the platform retains. §4 of the runbook assumes you
  can get at them.
- **Retention beyond 30 days** — Prometheus is configured for 30 days on local
  disk. It is not a system of record, and it is not backed up.
