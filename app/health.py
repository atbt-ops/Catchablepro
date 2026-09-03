"""Health probes.

A platform asks two different questions, and answering both with the same
endpoint is how a service ends up lying about itself:

* **Liveness** (``/healthz``) — "is this process wedged? should I restart it?"
* **Readiness** (``/readyz``) — "are its dependencies working? should I send it
  traffic?"

Liveness deliberately exercises nothing external. If the database is gone,
restarting the process does not bring it back; it only takes the instance down
and, during a rollout, can cascade across every replica at once. A dependency
failure should pull an instance out of the load balancer, not into a restart
loop — which is what readiness is for.

Readiness therefore touches every dependency a request actually needs: the
SQLite database (open it and read the schema) and the uploads directory (write
a byte and delete it). Both probes are read-only with respect to application
state: the database is opened in SQLite's read-only URI mode, and the disk
probe removes the file it wrote.
"""
from __future__ import annotations

import os
import sqlite3
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from . import db as dbmod

# A probe that hangs is a probe that says nothing. Fail fast instead and let
# the caller see a locked database as "not ready".
DB_PROBE_TIMEOUT = 2.0

# Per-process name, so replicas sharing a volume cannot collide on it.
_PROBE_FILENAME = f".readyz-probe-{os.getpid()}"


@dataclass(frozen=True)
class Check:
    """One dependency probe and how it went."""

    name: str
    ok: bool
    latency_ms: float
    error: str = ""

    def as_dict(self) -> dict:
        out: dict = {"ok": self.ok, "latency_ms": self.latency_ms}
        if not self.ok:
            out["error"] = self.error
        return out


def _elapsed_ms(started: float) -> float:
    return round((time.perf_counter() - started) * 1000, 2)


def _describe(exc: BaseException) -> str:
    """Short, path-free description of a failure.

    Probe output is public, so this never echoes filesystem paths back to the
    caller. The exception class plus the OS or SQLite message is still enough
    to tell a missing database from a full disk.
    """
    if isinstance(exc, OSError) and exc.strerror:
        return f"{type(exc).__name__}: {exc.strerror}"
    return f"{type(exc).__name__}: {exc}"


def check_database() -> Check:
    """Open the database read-only and read from a table the app depends on.

    Reading beyond the file header matters: a database whose file exists but
    whose schema was never created answers "yes" to a connection attempt and
    fails on the first real query. Read-only URI mode also stops the probe
    itself from conjuring an empty database when the file has gone missing,
    which is exactly the outage the probe exists to report.
    """
    started = time.perf_counter()
    try:
        uri = f"{Path(dbmod.DB_PATH).as_uri()}?mode=ro"
        conn = sqlite3.connect(uri, uri=True, timeout=DB_PROBE_TIMEOUT)
        try:
            conn.execute("SELECT 1 FROM users LIMIT 1").fetchone()
        finally:
            conn.close()
    except Exception as exc:  # sqlite3.Error, OSError, ValueError on a bad path
        return Check("database", False, _elapsed_ms(started), _describe(exc))
    return Check("database", True, _elapsed_ms(started))


def check_uploads() -> Check:
    """Write and remove a probe file in the resume upload directory.

    Candidates upload resumes to local disk, so an unmounted volume, a
    read-only remount or a full filesystem all break real requests. Only an
    actual write catches the last one: ``os.access`` answers a question about
    permissions, and a full disk is perfectly writable by that measure.
    """
    started = time.perf_counter()
    probe = Path(dbmod.UPLOAD_DIR) / _PROBE_FILENAME
    try:
        probe.write_bytes(b"ok")
        probe.unlink()
    except Exception as exc:
        return Check("uploads", False, _elapsed_ms(started), _describe(exc))
    return Check("uploads", True, _elapsed_ms(started))


# Every dependency a request can touch. Add to this and both the endpoint and
# its status code follow automatically.
CHECKS: tuple[Callable[[], Check], ...] = (check_database, check_uploads)


def readiness() -> dict:
    """Run every dependency check and summarise it.

    Checks always all run — a report that stops at the first failure hides the
    second one, and the second one is usually the interesting one.
    """
    results = [check() for check in CHECKS]
    return {
        "status": "ok" if all(r.ok for r in results) else "degraded",
        "checks": {r.name: r.as_dict() for r in results},
    }
