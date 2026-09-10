"""manage.py create-admin: how a fresh deployment gets its first account.

Signup needs a mailer to deliver the verification link, and a deployment that
has not configured one yet cannot complete it. This command is the way out of
that circle, so it is worth testing that it produces an account that can
actually sign in -- verified, admin, correct password -- and that it refuses
the ways it could quietly create a bad one.
"""
import pytest


@pytest.fixture()
def db_at(tmp_path, monkeypatch):
    """Point the data layer at a throwaway database."""
    from app import db as dbmod

    monkeypatch.setattr(dbmod, "DB_PATH", tmp_path / "portal.db")
    monkeypatch.setattr(dbmod, "DATA_DIR", tmp_path)
    monkeypatch.setattr(dbmod, "UPLOAD_DIR", tmp_path / "uploads")
    return dbmod


def _answer(monkeypatch, *responses):
    """Feed getpass a scripted sequence of passwords."""
    import manage

    answers = iter(responses)
    monkeypatch.setattr(manage.getpass, "getpass", lambda *_: next(answers))


def test_creates_a_verified_admin_who_can_sign_in(db_at, monkeypatch):
    import manage
    from app import auth

    _answer(monkeypatch, "correct-horse-battery", "correct-horse-battery")

    assert manage.main(["manage.py", "create-admin", "Boss@Example.com "]) == 0

    conn = db_at._connect()
    try:
        row = conn.execute(
            "SELECT email, is_admin, email_verified, password_hash, role FROM users"
        ).fetchone()
    finally:
        conn.close()

    # Lowercased and trimmed, so it matches what the login form will send.
    assert row["email"] == "boss@example.com"
    assert row["is_admin"] == 1
    # Verified without a round trip: someone holding the database has nothing
    # left to prove about owning the address.
    assert row["email_verified"] == 1
    assert auth.verify_password("correct-horse-battery", row["password_hash"])
    assert row["role"] in ("employer", "candidate")


def test_refuses_an_email_that_already_exists(db_at, monkeypatch):
    import manage

    _answer(monkeypatch, "correct-horse-battery", "correct-horse-battery")
    assert manage.main(["manage.py", "create-admin", "boss@example.com"]) == 0

    _answer(monkeypatch, "another-good-password", "another-good-password")
    assert manage.main(["manage.py", "create-admin", "boss@example.com"]) == 1

    conn = db_at._connect()
    try:
        assert conn.execute("SELECT COUNT(*) c FROM users").fetchone()["c"] == 1
    finally:
        conn.close()


def _count(dbmod):
    conn = dbmod._connect()
    try:
        return conn.execute("SELECT COUNT(*) c FROM users").fetchone()["c"]
    finally:
        conn.close()


def test_a_mismatched_repeat_asks_again_rather_than_giving_up(db_at, monkeypatch):
    """Typing blind invites typos, and the email was already entered.

    Aborting the whole run over one mistyped character means re-entering
    everything, which is where someone gives up on their own product.
    """
    import manage

    _answer(
        monkeypatch,
        "correct-horse-battery", "correct-horse-bettery",   # typo: try again
        "correct-horse-battery", "correct-horse-battery",   # right this time
    )

    assert manage.main(["manage.py", "create-admin", "boss@example.com"]) == 0
    assert _count(db_at) == 1


def test_gives_up_after_the_attempt_limit(db_at, monkeypatch):
    """A typo must never become an account nobody can sign in to."""
    import manage

    _answer(monkeypatch, *(["correct-horse-battery", "wrong-every-time"] * 3))

    assert manage.main(["manage.py", "create-admin", "boss@example.com"]) == 1
    assert _count(db_at) == 0


def test_applies_the_same_password_rules_as_signup(db_at, monkeypatch):
    """The bootstrap path must not be the weakest way in.

    A password that fails validation is rejected before the repeat is asked
    for, so each rejected attempt costs one prompt rather than two.
    """
    import manage

    _answer(monkeypatch, "x", "x", "x")

    assert manage.main(["manage.py", "create-admin", "boss@example.com"]) == 1
    assert _count(db_at) == 0


def test_rejects_something_that_is_not_an_address(db_at, monkeypatch):
    import manage

    assert manage.main(["manage.py", "create-admin", "not-an-email"]) == 1


# --------------------------------------------------------------------------- #
# send-test-email: proving the provider works before trusting it with resets
# --------------------------------------------------------------------------- #
def test_test_email_refuses_the_console_backend(db_at, monkeypatch, capsys):
    """Sending to a console backend proves nothing and must not look like proof."""
    import manage

    monkeypatch.setenv("EMAIL_BACKEND", "console")

    assert manage.main(["manage.py", "send-test-email", "you@example.com"]) == 1
    assert "console" in capsys.readouterr().out


def test_test_email_reports_a_backend_that_is_not_finished(db_at, monkeypatch, capsys):
    """EMAIL_BACKEND=smtp with no host is a half-done config, not a working one."""
    import manage

    monkeypatch.setenv("EMAIL_BACKEND", "smtp")
    monkeypatch.delenv("SMTP_HOST", raising=False)

    assert manage.main(["manage.py", "send-test-email", "you@example.com"]) == 1
    assert "SMTP_HOST" in capsys.readouterr().out


def test_test_email_surfaces_a_provider_rejection(db_at, monkeypatch, capsys):
    """A rejected message must exit non-zero: the caller removes a safety flag
    on the strength of this result."""
    import manage
    from app import mailer

    monkeypatch.setenv("EMAIL_BACKEND", "smtp")
    monkeypatch.setenv("SMTP_HOST", "smtp.example.com")
    monkeypatch.setattr(mailer, "send_email", lambda **kw: (False, "535 auth failed"))

    assert manage.main(["manage.py", "send-test-email", "you@example.com"]) == 1
    assert "535 auth failed" in capsys.readouterr().out


def test_test_email_sends_through_the_configured_backend(db_at, monkeypatch, capsys):
    import manage
    from app import mailer

    monkeypatch.setenv("EMAIL_BACKEND", "smtp")
    monkeypatch.setenv("SMTP_HOST", "smtp.example.com")
    captured = {}

    def _fake(**kwargs):
        captured.update(kwargs)
        return True, None

    monkeypatch.setattr(mailer, "send_email", _fake)

    assert manage.main(["manage.py", "send-test-email", "boss@example.com"]) == 0
    assert captured["to"] == "boss@example.com"
    # Accepted is not delivered, and the output has to say so or someone will
    # read a green result as proof the inbox received it.
    assert "spam" in capsys.readouterr().out.lower()
