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


# --------------------------------------------------------------------------- #
# Email verification
# --------------------------------------------------------------------------- #
def _verify_link():
    assert mailer.outbox, "no verification email was sent"
    m = re.search(r"(http://\S*/verify-email\?token=\S+)", mailer.outbox[-1].body)
    assert m, f"no verify link in email:\n{mailer.outbox[-1].body}"
    return m.group(1)


def test_signup_sends_verification_email_and_link_verifies(client, register, post):
    mailer.outbox.clear()
    register("newbie@x.io", "candidate", verified=False)
    assert mailer.outbox, "signup should send a verification email"
    assert mailer.outbox[-1].to == "newbie@x.io"

    token = _verify_link().split("token=", 1)[1]
    page = client.get(f"/verify-email?token={token}").text
    assert "Email confirmed" in page

    # The banner is gone and applying is unlocked.
    assert "Confirm your email address" not in client.get("/candidate").text
    mailer.outbox.clear()


def test_unverified_candidate_sees_banner_and_cannot_apply(
    client, register, post, post_job
):
    register("emp-v@x.io", "employer", company_name="V")
    post_job(title="Gated Role", required_skills="python")
    post("/logout")

    register("unver@x.io", "candidate", verified=False)
    assert "Confirm your email address" in client.get("/candidate").text

    r = post("/candidate/apply/1")
    assert r.headers["location"] == "/candidate?verify_required=1"
    # No application was recorded.
    assert "My applications" in client.get("/candidate").text
    assert "Gated Role" not in client.get("/candidate").text.split("My applications")[1]


def test_unverified_candidate_cannot_enable_auto_apply(client, register, post):
    register("noauto@x.io", "candidate", verified=False)
    r = post("/candidate/auto-apply")
    assert r.headers["location"] == "/candidate?verify_required=1"
    assert "Auto-Apply is OFF" in client.get("/candidate").text


def test_unverified_employer_can_draft_but_not_publish(client, register, post, post_job):
    register("unvemp@x.io", "employer", company_name="UnvCo", verified=False)

    # Publishing is refused...
    r = post_job(title="Blocked Role", required_skills="python")
    assert r.status_code == 403
    assert "before publishing a job" in r.text

    # ...but saving a draft still works.
    r = post_job(title="Drafted Role", required_skills="python", action="draft")
    assert r.status_code == 303
    page = client.get("/employer").text
    assert "Drafted Role" in page
    assert "Blocked Role" not in page


def test_unverified_employer_cannot_publish_existing_draft(client, register, post, post_job):
    register("unvemp2@x.io", "employer", company_name="Unv2", verified=False)
    post_job(title="Sitting Draft", required_skills="python", action="draft")
    r = post("/employer/jobs/1/status", data={"status": "active"})
    assert r.headers["location"] == "/employer?verify_required=1"
    assert "Draft" in client.get("/employer").text


def test_unverified_candidate_is_skipped_by_auto_apply(client, register, post, post_job):
    """A verified employer posting a job must not pull in unverified candidates."""
    from tests.conftest import mark_verified

    register("unv-auto@x.io", "candidate", verified=False)
    post("/candidate/profile", data={"headline": "", "skills": "python"})
    # Force auto_apply on directly — the route would refuse while unverified.
    import sqlite3
    from app import db as dbmod
    conn = sqlite3.connect(dbmod.DB_PATH)
    conn.execute("UPDATE candidate_profiles SET auto_apply = 1")
    conn.commit()
    conn.close()
    post("/logout")

    register("verified-emp@x.io", "employer", company_name="VE")
    post_job(title="Auto Role", required_skills="python")
    matches = client.get("/employer/jobs/1/matches").text
    assert "Auto-applied" not in matches


def test_resend_verification(client, register, post):
    register("resend@x.io", "candidate", verified=False)
    mailer.outbox.clear()
    r = post("/resend-verification")
    assert r.status_code == 303
    assert "verification_sent=1" in r.headers["location"]
    assert len(mailer.outbox) == 1
    assert mailer.outbox[-1].to == "resend@x.io"
    mailer.outbox.clear()


def test_verification_token_is_single_use(client, register, post):
    mailer.outbox.clear()
    register("single@x.io", "candidate", verified=False)
    token = _verify_link().split("token=", 1)[1]
    assert "Email confirmed" in client.get(f"/verify-email?token={token}").text
    assert "already been used" in client.get(f"/verify-email?token={token}").text
    mailer.outbox.clear()


def test_invalid_verification_token(client):
    assert "Verification failed" in client.get("/verify-email?token=nonsense").text
