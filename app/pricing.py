"""On-demand job-posting pricing — a holding cost that ramps up the longer a
job stays live, so employers close finished postings instead of orphaning them.

Modelled on cloud on-demand billing: pay-as-you-go, and the daily rate rises the
longer the resource (here, an active job) is left running.

    Week 1 (days 0-6):   FREE          — most real hires happen fast
    Week 2 (days 7-13):  ₹50 / day
    Week 3 (days 14-20): ₹100 / day
    Week 4 (days 21-27): ₹200 / day
    Week 5 (days 28-29): ₹400 / day
    Day 30:              auto-closed (hard cap)

The meter only runs while a job is ``active``; closing or filling it stops the
charge. Each activation is a fresh spell that starts a new free week, so
reopening an old or auto-closed job is genuinely useful (it isn't instantly
re-charged). ``billable_seconds`` lets the pure cost function also model a
carried-over balance, but the app resets it on every activation.

This is a simulated meter — no real money changes hands. It exists to shape
behaviour and to be the seam a real payment gateway would later plug into.
Everything here is pure and deterministic so it is fully testable.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

CURRENCY = "₹"
FREE_DAYS = 7
WEEKLY_RATES = [0, 50, 100, 200, 400]  # INR per day for week 1, 2, 3, 4, 5+
CAP_DAYS = 30                          # a job auto-closes once this many active days pass
SECONDS_PER_DAY = 86400


def rate_for_day(day_index: int) -> int:
    """The daily rate (INR) charged on the Nth active day (0-based)."""
    if day_index < 0 or day_index >= CAP_DAYS:
        return 0
    return WEEKLY_RATES[min(day_index // 7, len(WEEKLY_RATES) - 1)]


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse(ts: str) -> datetime:
    # SQLite datetime('now') yields 'YYYY-MM-DD HH:MM:SS' (UTC, naive).
    dt = datetime.fromisoformat(ts)
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


def active_days(billable_seconds: float, active_since: str,
                now: Optional[datetime] = None) -> float:
    """Total cumulative active time in (fractional) days."""
    now = now or _now()
    total = float(billable_seconds or 0)
    if active_since:
        total += max(0.0, (now - _parse(active_since)).total_seconds())
    return total / SECONDS_PER_DAY


@dataclass
class CostState:
    days_active: float
    accrued: int              # INR charged so far
    daily_rate: int           # INR/day right now (0 = free week or expired)
    expired: bool             # past the hard cap — should be auto-closed
    days_to_cap: float        # days left before auto-close
    next_rate: Optional[int]  # the rate after the next tier boundary (None if cap is next)
    days_to_next: Optional[float]

    @property
    def is_free(self) -> bool:
        return self.daily_rate == 0 and not self.expired

    @property
    def accrued_display(self) -> str:
        return f"{CURRENCY}{self.accrued:,}"


def cost_state(billable_seconds: float, active_since: str,
               now: Optional[datetime] = None) -> CostState:
    """Compute the current billing state for one job."""
    now = now or _now()
    days = active_days(billable_seconds, active_since, now)

    completed = min(int(days), CAP_DAYS)
    accrued = sum(rate_for_day(d) for d in range(completed))

    current_day = int(days)
    daily_rate = rate_for_day(current_day)
    expired = days >= CAP_DAYS
    days_to_cap = max(0.0, CAP_DAYS - days)

    next_rate: Optional[int] = None
    days_to_next: Optional[float] = None
    if not expired:
        boundary = (current_day // 7 + 1) * 7
        if boundary < CAP_DAYS:
            next_rate = rate_for_day(boundary)
            days_to_next = boundary - days

    return CostState(days, accrued, daily_rate, expired, days_to_cap,
                     next_rate, days_to_next)


def total_at_cap() -> int:
    """The most a single job can ever accrue (billed right up to the cap)."""
    return sum(rate_for_day(d) for d in range(CAP_DAYS))
