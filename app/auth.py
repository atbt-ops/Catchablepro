"""Session-based auth with stdlib password hashing (no external crypto deps)."""
from __future__ import annotations

import hashlib
import hmac
import os
import sqlite3
from typing import Optional

from fastapi import Request

_PBKDF2_ROUNDS = 200_000


def hash_password(password: str) -> str:
    """Return ``salt$hash`` using PBKDF2-HMAC-SHA256."""
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _PBKDF2_ROUNDS)
    return f"{salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt_hex, digest_hex = stored.split("$", 1)
    except ValueError:
        return False
    salt = bytes.fromhex(salt_hex)
    expected = bytes.fromhex(digest_hex)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _PBKDF2_ROUNDS)
    return hmac.compare_digest(digest, expected)


def current_user(request: Request, db: sqlite3.Connection) -> Optional[sqlite3.Row]:
    """Return the logged-in user row, or ``None``."""
    user_id = request.session.get("user_id")
    if not user_id:
        return None
    return db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
