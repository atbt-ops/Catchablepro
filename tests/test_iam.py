"""IAM: password policy, reset flow, change password, and brute-force limits."""
import re

import pytest

from app import auth, mailer


def _reset_link():
    """Pull the reset URL out of the most recent console-backend email."""
    assert mailer.outbox, "no reset email was sent"
    m = re.search(r"(http://\S*/reset-password\?token=\S+)", mailer.outbox[-1].body)
    assert m, f"no reset link in email:\n{mailer.outbox[-1].body}"
    return m.group(1)


def _token_from_link(link):
    return link.split("token=", 1)[1]


# --------------------------------------------------------------------------- #
# Password policy
# --------------------------------------------------------------------------- #
@pytest.mark.parametrize("pw,ok", [
    ("password123", True),
    ("short1", False),        # too short
    ("allletters", False),    # no digits
    ("12345678", False),      # no letters
])
def test_password_policy(pw, ok):
    assert (auth.validate_password(pw) is None) is ok


def test_weak_password_rejected_at_signup(post):
    r = post("/register", data={
        "email": "weak@x.io", "password": "abcdefgh", "name": "Weak",
    })
    assert r.status_code == 400
    assert "letters and numbers" in r.text


# --------------------------------------------------------------------------- #
# Forgot / reset password
# --------------------------------------------------------------------------- #
def test_forgot_password_sends_link_and_resets(client, register, post):
    mailer.outbox.clear()
    register("forget@x.io", "candidate")
    post("/logout")

    r = post("/forgot-password", data={"email": "forget@x.io"})
    assert r.status_code == 200
    assert "Check your email" in r.text

    link = _reset_link()
    token = _token_from_link(link)
    assert client.get(f"/reset-password?token={token}").status_code == 200

    r = post("/reset-password", data={
        "token": token, "password": "brandnew123", "confirm": "brandnew123",
    })
    assert r.status_code == 303

    # Old password no longer works, new one does.
    assert post("/login", data={
        "email": "forget@x.io", "password": "password123"}).status_code == 401
    assert post("/login", data={
        "email": "forget@x.io", "password": "brandnew123"}).status_code == 303
    mailer.outbox.clear()


def test_unknown_email_does_not_reveal_account_existence(post):
    mailer.outbox.clear()
    r = post("/forgot-password", data={"email": "nobody@nowhere.io"})
    # Same confirmation as a real account, and no mail sent.
    assert r.status_code == 200
    assert "Check your email" in r.text
    assert mailer.outbox == []


def test_reset_token_is_single_use(client, register, post):
    mailer.outbox.clear()
    register("once@x.io", "candidate")
    post("/logout")
    post("/forgot-password", data={"email": "once@x.io"})
    token = _token_from_link(_reset_link())

    assert post("/reset-password", data={
        "token": token, "password": "firstpass123", "confirm": "firstpass123",
    }).status_code == 303
    # Replaying the same token must fail.
    r = post("/reset-password", data={
        "token": token, "password": "secondpass123", "confirm": "secondpass123",
    })
    assert r.status_code == 400
    assert "already been used" in r.text
    mailer.outbox.clear()


def test_invalid_reset_token_rejected(client, post):
    assert "can't be used" in client.get("/reset-password?token=garbage").text
    r = post("/reset-password", data={
        "token": "garbage", "password": "whatever123", "confirm": "whatever123",
    })
    assert r.status_code == 400


def test_reset_requires_matching_confirmation(client, register, post):
    mailer.outbox.clear()
    register("mismatch@x.io", "candidate")
    post("/logout")
    post("/forgot-password", data={"email": "mismatch@x.io"})
    token = _token_from_link(_reset_link())
    r = post("/reset-password", data={
        "token": token, "password": "newpass123", "confirm": "different123",
    })
    assert r.status_code == 400
    assert "do not match" in r.text
    mailer.outbox.clear()


# --------------------------------------------------------------------------- #
# Change password while signed in
# --------------------------------------------------------------------------- #
def test_change_password_requires_current_password(client, register, post):
    register("chg@x.io", "candidate")
    r = post("/account/password", data={
        "current_password": "wrongpass1", "password": "newpass123",
        "confirm": "newpass123",
    })
    assert r.status_code == 400
    assert "current password is incorrect" in r.text


def test_change_password_succeeds(client, register, post):
    register("chg2@x.io", "candidate")
    r = post("/account/password", data={
        "current_password": "password123", "password": "newpass456",
        "confirm": "newpass456",
    })
    assert r.status_code == 303
    post("/logout")
    assert post("/login", data={
        "email": "chg2@x.io", "password": "newpass456"}).status_code == 303


def test_account_page_requires_login(client):
    r = client.get("/account", follow_redirects=False)
    assert r.headers["location"] == "/login"


# --------------------------------------------------------------------------- #
# Brute-force protection
# --------------------------------------------------------------------------- #
def test_repeated_failed_logins_are_rate_limited(client, register, post):
    register("brute@x.io", "candidate")
    post("/logout")
    codes = [
        post("/login", data={"email": "brute@x.io", "password": "wrongpass1"}).status_code
        for _ in range(12)
    ]
    assert 429 in codes, "expected lockout after repeated failures"


def test_successful_login_clears_the_counter(client, register, post):
    register("clear@x.io", "candidate")
    post("/logout")
    for _ in range(3):
        post("/login", data={"email": "clear@x.io", "password": "wrongpass1"})
    assert post("/login", data={
        "email": "clear@x.io", "password": "password123"}).status_code == 303
    post("/logout")
    # Counter was reset, so a fresh wrong attempt is 401 (not 429).
    assert post("/login", data={
        "email": "clear@x.io", "password": "wrongpass1"}).status_code == 401
