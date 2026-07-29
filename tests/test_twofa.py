"""Two-factor auth: TOTP algorithm, enrolment, the login challenge, recovery."""
import base64
import sqlite3

import pytest

from app import db as dbmod, totp


# --------------------------------------------------------------------------- #
# TOTP algorithm (RFC 6238)
# --------------------------------------------------------------------------- #
def test_rfc6238_vector():
    # RFC 6238 SHA1 vector; authenticator apps use the low 6 digits.
    secret = base64.b32encode(b"12345678901234567890").decode().rstrip("=")
    assert totp.code_at(secret, 59) == "287082"
    assert totp.code_at(secret, 1111111109) == "081804"


def test_verify_accepts_current_and_adjacent_windows():
    s = totp.generate_secret()
    now = 1_000_000
    assert totp.verify(s, totp.code_at(s, now), now)
    assert totp.verify(s, totp.code_at(s, now - 30), now)   # clock drift back
    assert totp.verify(s, totp.code_at(s, now + 30), now)   # drift forward
    assert not totp.verify(s, totp.code_at(s, now - 120), now)  # too far off


def test_verify_rejects_garbage():
    s = totp.generate_secret()
    for bad in ("", "abc", "12345", "1234567", "000000"):
        assert not totp.verify(s, bad)


def test_recovery_code_hash_is_normalised():
    assert totp.hash_recovery_code("AB12-cd34") == totp.hash_recovery_code("ab12cd34")


# --------------------------------------------------------------------------- #
# Enrolment
# --------------------------------------------------------------------------- #
def _secret_of(email: str) -> str:
    conn = sqlite3.connect(dbmod.DB_PATH)
    row = conn.execute("SELECT totp_secret FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()
    return row[0]


def test_setup_then_enable_with_valid_code(client, register, post):
    register("tfa@x.io", "candidate")
    assert "Set up two-factor" in client.get("/account/2fa/setup").text
    secret = _secret_of("tfa@x.io")
    assert secret  # a pending secret was stored

    r = post("/account/2fa/enable", data={"code": totp.code_at(secret)})
    assert r.status_code == 200
    assert "recovery" in r.text.lower()          # codes shown once
    # Account now reports 2FA on.
    assert "2FA is ON" in client.get("/account").text


def test_enable_rejects_a_wrong_code(client, register, post):
    register("tfa2@x.io", "candidate")
    client.get("/account/2fa/setup")
    r = post("/account/2fa/enable", data={"code": "000000"})
    assert r.status_code == 400
    assert "Check your authenticator" in r.text
    # Still disabled.
    conn = sqlite3.connect(dbmod.DB_PATH)
    enabled = conn.execute(
        "SELECT totp_enabled FROM users WHERE email = 'tfa2@x.io'").fetchone()[0]
    conn.close()
    assert enabled == 0


# --------------------------------------------------------------------------- #
# Login challenge
# --------------------------------------------------------------------------- #
def _enable_2fa(client, register, post, email):
    register(email, "candidate")
    client.get("/account/2fa/setup")
    secret = _secret_of(email)
    post("/account/2fa/enable", data={"code": totp.code_at(secret)})
    post("/logout")
    return secret


def test_login_with_2fa_requires_a_code(client, register, post):
    secret = _enable_2fa(client, register, post, "gate@x.io")

    # Password alone lands on the challenge, not the dashboard.
    r = post("/login", data={"email": "gate@x.io", "password": "password123"})
    assert r.status_code == 303
    assert r.headers["location"] == "/2fa"
    # Not yet authenticated.
    assert client.get("/candidate", follow_redirects=False).headers["location"] == "/login"

    # Wrong code is refused.
    assert post("/2fa", data={"code": "000000"}).status_code == 401
    # Correct code completes login.
    r = post("/2fa", data={"code": totp.code_at(secret)})
    assert r.status_code == 303
    assert client.get("/candidate").status_code == 200


def test_2fa_page_is_unreachable_without_a_pending_login(client):
    assert client.get("/2fa", follow_redirects=False).headers["location"] == "/login"


def test_recovery_code_logs_in_and_is_single_use(client, register, post):
    register("rec@x.io", "candidate")
    client.get("/account/2fa/setup")
    secret = _secret_of("rec@x.io")
    enable = post("/account/2fa/enable", data={"code": totp.code_at(secret)})
    # Pull a recovery code out of the one-time page.
    import re
    codes = re.findall(r'recovery-code">([0-9a-f]{4}-[0-9a-f]{4})<', enable.text)
    assert len(codes) == 10
    post("/logout")

    post("/login", data={"email": "rec@x.io", "password": "password123"})
    r = post("/2fa", data={"code": codes[0]})
    assert r.status_code == 303
    assert client.get("/candidate").status_code == 200

    # The same code cannot be reused.
    post("/logout")
    post("/login", data={"email": "rec@x.io", "password": "password123"})
    assert post("/2fa", data={"code": codes[0]}).status_code == 401


# --------------------------------------------------------------------------- #
# Disable
# --------------------------------------------------------------------------- #
def test_disable_requires_password(client, register, post):
    register("off@x.io", "candidate")
    client.get("/account/2fa/setup")
    secret = _secret_of("off@x.io")
    post("/account/2fa/enable", data={"code": totp.code_at(secret)})

    # Wrong password keeps it on.
    r = post("/account/2fa/disable", data={"current_password": "wrongpass1"})
    assert r.status_code == 400
    assert "2FA is ON" in client.get("/account").text

    # Correct password turns it off and clears the secret + recovery codes.
    r = post("/account/2fa/disable", data={"current_password": "password123"})
    assert r.status_code == 303
    assert "Set up 2FA" in client.get("/account").text
    assert _secret_of("off@x.io") == ""
    conn = sqlite3.connect(dbmod.DB_PATH)
    left = conn.execute(
        "SELECT COUNT(*) FROM recovery_codes WHERE user_id = "
        "(SELECT id FROM users WHERE email='off@x.io')").fetchone()[0]
    conn.close()
    assert left == 0


def test_2fa_enable_and_disable_are_audited(client, register, post):
    register("aud2fa@x.io", "candidate")
    client.get("/account/2fa/setup")
    secret = _secret_of("aud2fa@x.io")
    post("/account/2fa/enable", data={"code": totp.code_at(secret)})
    post("/account/2fa/disable", data={"current_password": "password123"})

    conn = sqlite3.connect(dbmod.DB_PATH)
    actions = [r[0] for r in conn.execute(
        "SELECT action FROM audit_log WHERE actor_email = 'aud2fa@x.io' ORDER BY id")]
    conn.close()
    assert actions == ["security.2fa_enable", "security.2fa_disable"]
