"""Session-based auth with stdlib password hashing (no external crypto deps)."""
from __future__ import annotations

import hashlib
import hmac
import os
import secrets
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

from fastapi import Request

_PBKDF2_ROUNDS = 200_000

PASSWORD_MIN_LENGTH = 8
RESET_TOKEN_TTL_MINUTES = 60
VERIFY_TOKEN_TTL_HOURS = 48


def validate_password(password: str) -> Optional[str]:
    """Return an error message if the password is too weak, else ``None``."""
    if len(password) < PASSWORD_MIN_LENGTH:
        return f"Password must be at least {PASSWORD_MIN_LENGTH} characters."
    if password.isdigit() or password.isalpha():
        return "Password must contain both letters and numbers."
    return None


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


def _hash_token(token: str) -> str:
    """Reset tokens are stored hashed so a database leak cannot reset accounts."""
    return hashlib.sha256(token.encode()).hexdigest()


def create_reset_token(db: sqlite3.Connection, user_id: int) -> str:
    """Issue a single-use password-reset token and return the raw value."""
    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_TTL_MINUTES)
    # Any earlier tokens for this user become unusable.
    db.execute("UPDATE password_resets SET used = 1 WHERE user_id = ?", (user_id,))
    db.execute(
        "INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
        (user_id, _hash_token(token), expires.isoformat()),
    )
    db.commit()
    return token


def consume_reset_token(
    db: sqlite3.Connection, token: str
) -> Tuple[Optional[int], Optional[str]]:
    """Validate a reset token. Returns ``(user_id, error)``; marks it used."""
    if not token:
        return None, "This reset link is invalid."
    row = db.execute(
        "SELECT * FROM password_resets WHERE token_hash = ?", (_hash_token(token),)
    ).fetchone()
    if row is None:
        return None, "This reset link is invalid."
    if row["used"]:
        return None, "This reset link has already been used."
    try:
        expires = datetime.fromisoformat(row["expires_at"])
    except ValueError:
        return None, "This reset link is invalid."
    if expires < datetime.now(timezone.utc):
        return None, "This reset link has expired. Please request a new one."
    return row["user_id"], None


def mark_reset_token_used(db: sqlite3.Connection, token: str) -> None:
    db.execute(
        "UPDATE password_resets SET used = 1 WHERE token_hash = ?", (_hash_token(token),)
    )
    db.commit()


def create_verification_token(db: sqlite3.Connection, user_id: int) -> str:
    """Issue a single-use email-verification token and return the raw value."""
    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=VERIFY_TOKEN_TTL_HOURS)
    db.execute("UPDATE email_verifications SET used = 1 WHERE user_id = ?", (user_id,))
    db.execute(
        "INSERT INTO email_verifications (user_id, token_hash, expires_at) "
        "VALUES (?, ?, ?)",
        (user_id, _hash_token(token), expires.isoformat()),
    )
    db.commit()
    return token


def verify_email_token(
    db: sqlite3.Connection, token: str
) -> Tuple[Optional[int], Optional[str]]:
    """Validate and consume a verification token. Returns ``(user_id, error)``."""
    if not token:
        return None, "This verification link is invalid."
    row = db.execute(
        "SELECT * FROM email_verifications WHERE token_hash = ?", (_hash_token(token),)
    ).fetchone()
    if row is None:
        return None, "This verification link is invalid."
    if row["used"]:
        return None, "This link has already been used. Your email may already be verified."
    try:
        expires = datetime.fromisoformat(row["expires_at"])
    except ValueError:
        return None, "This verification link is invalid."
    if expires < datetime.now(timezone.utc):
        return None, "This link has expired. Request a new one from your dashboard."

    db.execute(
        "UPDATE email_verifications SET used = 1 WHERE token_hash = ?",
        (_hash_token(token),),
    )
    db.execute("UPDATE users SET email_verified = 1 WHERE id = ?", (row["user_id"],))
    db.commit()
    return row["user_id"], None


def current_user(request: Request, db: sqlite3.Connection) -> Optional[sqlite3.Row]:
    """Return the logged-in user row, or ``None``."""
    user_id = request.session.get("user_id")
    if not user_id:
        return None
    return db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
