"""Small in-process rate limiter (fixed window).

Used to slow down login guessing, password-reset spam and outbound email.

Caveat: state lives in this process, so with multiple workers or instances each
one keeps its own counters. That is fine for the single-process SQLite
deployment this app targets; a shared store (Redis) would be needed to scale out.
"""
from __future__ import annotations

import threading
import time
from typing import Dict, Tuple

_lock = threading.Lock()
# key -> (window_started_at, count)
_hits: Dict[str, Tuple[float, int]] = {}


def check(key: str, limit: int, window_seconds: int) -> Tuple[bool, int]:
    """Record an attempt against ``key``.

    Returns ``(allowed, retry_after_seconds)``. ``retry_after`` is 0 when
    allowed.
    """
    now = time.time()
    with _lock:
        started, count = _hits.get(key, (now, 0))
        if now - started >= window_seconds:
            started, count = now, 0
        count += 1
        _hits[key] = (started, count)
        if count > limit:
            return False, max(1, int(window_seconds - (now - started)))
        return True, 0


def peek(key: str, limit: int, window_seconds: int) -> Tuple[bool, int]:
    """Report whether ``key`` is currently blocked, without counting a hit."""
    now = time.time()
    with _lock:
        started, count = _hits.get(key, (now, 0))
        if now - started >= window_seconds:
            return True, 0
        if count > limit:
            return False, max(1, int(window_seconds - (now - started)))
        return True, 0


def reset(key: str) -> None:
    """Clear a key (e.g. after a successful login)."""
    with _lock:
        _hits.pop(key, None)


def clear_all() -> None:
    """Test helper."""
    with _lock:
        _hits.clear()
