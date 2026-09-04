"""Prometheus metrics: rate, errors, duration.

Deliberately small. Nearly every question about a web service under load is
answered by three numbers — how many requests arrived, how many failed, and how
long they took — and the fourth, resource use, comes free from the process
collectors ``prometheus_client`` registers by default.

The one decision that matters here is labelling by **route template** rather
than raw path. ``/employer/jobs/7/applicants`` and ``/employer/jobs/8/...`` are
one series, not one per job. A label whose values are unbounded — a path with an
id in it, a user's email, a search query — creates a new time series per value,
and that is how a service quietly overwhelms its own metrics backend. Requests
that match no route collapse into a single ``unmatched`` bucket for the same
reason: a scanner probing random URLs must not be able to mint series.
"""
from __future__ import annotations

import os

from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

CONTENT_TYPE = CONTENT_TYPE_LATEST

#: Requests that would only measure the observer, or the disk.
EXCLUDED_PREFIXES = ("/metrics", "/static")

#: The label used when no route matched, so 404 probes cannot create series.
UNMATCHED = "unmatched"

REQUESTS = Counter(
    "http_requests_total",
    "HTTP requests handled, by route template and outcome.",
    ("method", "route", "status"),
)

DURATION = Histogram(
    "http_request_duration_seconds",
    "Time spent producing a response, by route template.",
    ("method", "route"),
)


def is_observable(path: str) -> bool:
    """False for paths whose measurement would be noise."""
    return not path.startswith(EXCLUDED_PREFIXES)


def observe(method: str, route: str, status: int, seconds: float) -> None:
    """Record one handled request."""
    REQUESTS.labels(method=method, route=route, status=str(status)).inc()
    DURATION.labels(method=method, route=route).observe(seconds)


def render() -> bytes:
    """The current metrics, in Prometheus text exposition format."""
    return generate_latest()


def token() -> str:
    """The bearer token a scraper must present, empty when unset."""
    return os.environ.get("METRICS_TOKEN", "").strip()
