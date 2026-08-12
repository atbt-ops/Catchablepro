"""Append-only audit trail for sensitive actions.

Records who did what to whom. The app only ever inserts and reads these rows —
there is no update or delete path — so the log is tamper-evident by convention.
Actor email, target label and the reason are snapshotted at write time so a
record stays meaningful even if the referenced account or job changes later.
"""
from __future__ import annotations

import sqlite3
from typing import Optional

# Known action verbs, exposed so the admin view can offer a filter dropdown.
ACTIONS = {
    "user.suspend": "Account suspended",
    "user.reinstate": "Account reinstated",
    "job.takedown": "Job taken down",
    "job.autoexpire": "Job auto-closed (expired)",
    "admin.grant": "Admin granted",
    "admin.revoke": "Admin revoked",
    "security.2fa_enable": "2FA enabled",
    "security.2fa_disable": "2FA disabled",
}


def action_label(action: str) -> str:
    return ACTIONS.get(action, action)


def record(
    db: sqlite3.Connection,
    action: str,
    *,
    actor: Optional[sqlite3.Row] = None,
    actor_email: str = "",
    target_type: str = "",
    target_id: Optional[int] = None,
    target_label: str = "",
    detail: str = "",
    ip: str = "",
) -> None:
    """Append one audit entry. Never raises into the caller's request path."""
    a_id = actor["id"] if actor is not None else None
    a_email = actor_email or (actor["email"] if actor is not None else "system")
    try:
        db.execute(
            "INSERT INTO audit_log "
            "(actor_id, actor_email, action, target_type, target_id, target_label, "
            " detail, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (a_id, a_email, action, target_type, target_id,
             target_label[:200], detail[:500], ip[:64]),
        )
        db.commit()
    except sqlite3.Error:
        # Auditing must not break the action being audited; swallow storage
        # errors rather than surfacing them to the user.
        pass
