"""Server-side admin tasks.

Admin rights are deliberately NOT self-service — there is no signup path and no
in-app promotion. Granting them requires shell access to the deployment:

    python manage.py create-admin you@example.com
    python manage.py make-admin you@example.com
    python manage.py revoke-admin you@example.com
    python manage.py list-admins
    python manage.py backup /path/to/backup.db
"""
from __future__ import annotations

import getpass
import sys
import sqlite3
from pathlib import Path

from app import audit, auth
from app.db import DB_PATH, _connect, init_db


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


def _backup(destination: str) -> int:
    """Make a transactionally consistent SQLite backup without stopping users."""
    init_db()
    target = Path(destination).expanduser()
    if target.resolve() == DB_PATH.resolve():
        print("Refusing to overwrite the live database with a backup.")
        return 1
    if not target.parent.exists():
        print(f"Backup directory does not exist: {target.parent}")
        return 1

    source = _connect()
    backup = sqlite3.connect(target)
    try:
        source.backup(backup)
        backup.commit()
    finally:
        backup.close()
        source.close()
    print(f"Backup written to {target.resolve()}")
    return 0


def _create_admin(email: str) -> int:
    """Create a verified admin account without going through signup.

    The bootstrap problem: a fresh deployment has no accounts, and the signup
    flow needs a working mailer to deliver the verification link. Before an
    email provider is configured that link goes to the container log, which is
    a miserable way to make your first account. This creates one directly, with
    email_verified already set, because someone with shell access to the
    database has no verifying left to do.
    """
    init_db()
    email = email.strip().lower()
    if "@" not in email:
        print(f"That does not look like an email address: {email!r}")
        return 1

    conn = _connect()
    try:
        if conn.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone():
            print(f"{email} already exists. Use make-admin to grant it admin rights.")
            return 1

        # getpass, so the password is not echoed and does not reach the shell
        # history the way a command-line argument would.
        password = getpass.getpass("Password: ")
        if password != getpass.getpass("Repeat password: "):
            print("Passwords did not match.")
            return 1
        problem = auth.validate_password(password)
        if problem:
            print(problem)
            return 1

        conn.execute(
            "INSERT INTO users (email, password_hash, role, name, email_verified, is_admin) "
            "VALUES (?, ?, 'employer', ?, 1, 1)",
            (email, auth.hash_password(password), email.split("@")[0]),
        )
        conn.commit()
        audit.record(
            conn,
            "admin.create",
            actor_email="manage.py (server)",
            target_type="user",
            target_id=conn.execute(
                "SELECT id FROM users WHERE email = ?", (email,)
            ).fetchone()["id"],
            target_label=email,
        )
        conn.commit()
    finally:
        conn.close()

    print(f"Created {email} as a verified admin. Sign in at your public URL.")
    return 0


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print(__doc__)
        return 1
    command = argv[1]
    if command == "list-admins":
        return _list_admins()
    if command == "backup":
        if len(argv) < 3:
            print("Usage: python manage.py backup <destination.db>")
            return 1
        return _backup(argv[2])
    if command == "create-admin":
        if len(argv) < 3:
            print("Usage: python manage.py create-admin <email>")
            return 1
        return _create_admin(argv[2])
    if command in ("make-admin", "revoke-admin"):
        if len(argv) < 3:
            print(f"Usage: python manage.py {command} <email>")
            return 1
        return _set_admin(argv[2], 1 if command == "make-admin" else 0)
    print(__doc__)
    return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
