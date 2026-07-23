"""Server-side admin tasks.

Admin rights are deliberately NOT self-service — there is no signup path and no
in-app promotion. Granting them requires shell access to the deployment:

    python manage.py make-admin you@example.com
    python manage.py revoke-admin you@example.com
    python manage.py list-admins
"""
from __future__ import annotations

import sys

from app import audit
from app.db import _connect, init_db


def _set_admin(email: str, value: int) -> int:
    init_db()
    conn = _connect()
    try:
        email = email.strip().lower()
        user = conn.execute(
            "SELECT id, name, role, is_admin FROM users WHERE email = ?", (email,)
        ).fetchone()
        if user is None:
            print(f"No account found for {email!r}.")
            return 1
        if user["is_admin"] == value:
            print(f"{email} is already {'an admin' if value else 'not an admin'}.")
            return 0
        conn.execute("UPDATE users SET is_admin = ? WHERE id = ?", (value, user["id"]))
        conn.commit()
        audit.record(
            conn,
            "admin.grant" if value else "admin.revoke",
            actor_email="manage.py (server)",
            target_type="user",
            target_id=user["id"],
            target_label=email,
        )
        verb = "granted to" if value else "revoked from"
        print(f"Admin {verb} {email} ({user['name'] or 'unnamed'}, {user['role']}).")
        return 0
    finally:
        conn.close()


def _list_admins() -> int:
    init_db()
    conn = _connect()
    try:
        rows = conn.execute(
            "SELECT email, name, role FROM users WHERE is_admin = 1 ORDER BY email"
        ).fetchall()
        if not rows:
            print("No admins yet. Grant one with: python manage.py make-admin <email>")
            return 0
        print(f"{len(rows)} admin(s):")
        for r in rows:
            print(f"  {r['email']:32} {r['name'] or '—':20} ({r['role']})")
        return 0
    finally:
        conn.close()


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print(__doc__)
        return 1
    command = argv[1]
    if command == "list-admins":
        return _list_admins()
    if command in ("make-admin", "revoke-admin"):
        if len(argv) < 3:
            print(f"Usage: python manage.py {command} <email>")
            return 1
        return _set_admin(argv[2], 1 if command == "make-admin" else 0)
    print(__doc__)
    return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
