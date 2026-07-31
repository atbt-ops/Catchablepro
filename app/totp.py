"""Time-based one-time passwords (RFC 6238) and recovery codes.

Implemented on the stdlib (hmac/hashlib/base64/struct) so two-factor auth needs
no crypto dependency and interoperates with Google Authenticator, Authy, 1Password,
etc. Only the QR image uses a third-party library (segno, pure-Python).
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
import struct
import time
from typing import List, Optional
from urllib.parse import quote

DIGITS = 6
PERIOD = 30          # seconds per code
SKEW_STEPS = 1       # accept the adjacent windows to tolerate clock drift
ISSUER = "Catchablepro"


def generate_secret(n_bytes: int = 20) -> str:
    """Return a fresh base32 TOTP secret (no padding, as authenticators expect)."""
    return base64.b32encode(secrets.token_bytes(n_bytes)).decode("ascii").rstrip("=")


def _hotp(secret: str, counter: int) -> str:
    key = base64.b32decode(secret + "=" * (-len(secret) % 8))
    mac = hmac.new(key, struct.pack(">Q", counter), hashlib.sha1).digest()
    offset = mac[-1] & 0x0F
    binary = struct.unpack(">I", mac[offset:offset + 4])[0] & 0x7FFFFFFF
    return str(binary % (10 ** DIGITS)).zfill(DIGITS)


def code_at(secret: str, timestamp: Optional[float] = None) -> str:
    """The current TOTP code — used by tests to act as an authenticator app."""
    ts = time.time() if timestamp is None else timestamp
    return _hotp(secret, int(ts // PERIOD))


def verify(secret: str, code: str, timestamp: Optional[float] = None) -> bool:
    """Constant-time check of a submitted code across the skew window."""
    if not secret or not code:
        return False
    code = code.strip().replace(" ", "")
    if len(code) != DIGITS or not code.isdigit():
        return False
    ts = time.time() if timestamp is None else timestamp
    counter = int(ts // PERIOD)
    for delta in range(-SKEW_STEPS, SKEW_STEPS + 1):
        if hmac.compare_digest(_hotp(secret, counter + delta), code):
            return True
    return False


def provisioning_uri(secret: str, account: str) -> str:
    """otpauth:// URI encoded into the enrolment QR code."""
    label = quote(f"{ISSUER}:{account}")
    params = (
        f"secret={secret}&issuer={quote(ISSUER)}"
        f"&algorithm=SHA1&digits={DIGITS}&period={PERIOD}"
    )
    return f"otpauth://totp/{label}?{params}"


def qr_data_uri(secret: str, account: str) -> str:
    """Inline SVG data URI of the provisioning QR, or '' if segno is missing."""
    try:
        import segno
    except ImportError:  # pragma: no cover
        return ""
    return segno.make(provisioning_uri(secret, account), error="m").svg_data_uri(
        scale=5, border=2
    )


def format_secret(secret: str) -> str:
    """Group the secret in fours for easier manual entry."""
    return " ".join(secret[i:i + 4] for i in range(0, len(secret), 4))


# --------------------------------------------------------------------------- #
# Recovery codes — single-use fallbacks stored hashed.
# --------------------------------------------------------------------------- #
def generate_recovery_codes(n: int = 10) -> List[str]:
    return [f"{secrets.token_hex(2)}-{secrets.token_hex(2)}" for _ in range(n)]


def hash_recovery_code(code: str) -> str:
    normalized = code.strip().lower().replace("-", "").replace(" ", "")
    return hashlib.sha256(normalized.encode()).hexdigest()
