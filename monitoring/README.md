# Catchablepro - Grafana Cloud Telemetry Setup

This directory connects Catchablepro to your **Grafana Cloud Free Forever** stack (`ap-south-1`).

## 1. Start the Collector

From your terminal, run:

```bash
docker compose -f monitoring/docker-compose.monitoring.yml up -d
```

This launches a lightweight Prometheus agent that:
1. Scrapes `http://host.docker.internal:3000/metrics` every 15 seconds.
2. Forwards all metrics via `remote_write` to your Grafana Cloud instance (`https://prometheus-prod-43-prod-ap-south-1.grafana.net`).

## 2. Verify in Grafana Cloud

1. Log into your Grafana Cloud dashboard at [https://grafana.com](https://grafana.com).
2. Open **Explore** (compass icon on the left menu).
3. Select your Prometheus data source: `grafanacloud-catchablepro-prom`.
4. Enter any of these PromQL queries to see live data:
   - `up{app="catchablepro"}` (Returns `1` when app is healthy)
   - `http_requests_total{app="catchablepro"}` (Request volume)
   - `process_uptime_seconds{app="catchablepro"}` (Server uptime)
   - `active_job_postings{app="catchablepro"}` (Current active postings)
   - `auto_apply_candidates{app="catchablepro"}` (Auto-apply candidate count)
