"""Unit tests for the email backends (nothing is ever actually sent)."""
import pytest

from app import mailer


@pytest.fixture(autouse=True)
def clean_outbox(monkeypatch):
    monkeypatch.setenv("EMAIL_BACKEND", "console")
    mailer.outbox.clear()
    yield
    mailer.outbox.clear()


def test_console_backend_captures_message():
    ok, err = mailer.send_email("a@b.com", "Hello", "Body text", reply_to="hr@x.io")
    assert ok and err is None
    assert len(mailer.outbox) == 1
    sent = mailer.outbox[0]
    assert sent.to == "a@b.com"
    assert sent.subject == "Hello"
    assert sent.reply_to == "hr@x.io"


def test_console_backend_is_not_considered_configured():
    assert mailer.is_configured() is False


def test_invalid_recipient_rejected():
    ok, err = mailer.send_email("not-an-email", "Hi", "Body")
    assert not ok
    assert "Invalid recipient" in err
    assert mailer.outbox == []


def test_empty_subject_rejected():
    ok, err = mailer.send_email("a@b.com", "   ", "Body")
    assert not ok
    assert "Subject is required" in err


def test_smtp_backend_requires_host(monkeypatch):
    monkeypatch.setenv("EMAIL_BACKEND", "smtp")
    monkeypatch.delenv("SMTP_HOST", raising=False)
    ok, err = mailer.send_email("a@b.com", "Hi", "Body")
    assert not ok
    assert "SMTP_HOST" in err


def test_sendgrid_backend_requires_api_key(monkeypatch):
    monkeypatch.setenv("EMAIL_BACKEND", "sendgrid")
    monkeypatch.delenv("SENDGRID_API_KEY", raising=False)
    ok, err = mailer.send_email("a@b.com", "Hi", "Body")
    assert not ok
    assert "SENDGRID_API_KEY" in err


def test_smtp_backend_is_configured_when_host_set(monkeypatch):
    monkeypatch.setenv("EMAIL_BACKEND", "smtp")
    monkeypatch.setenv("SMTP_HOST", "smtp.sendgrid.net")
    assert mailer.is_configured() is True


def test_smtp_send_uses_smtplib(monkeypatch):
    """The SMTP path builds a proper message and hands it to smtplib."""
    monkeypatch.setenv("EMAIL_BACKEND", "smtp")
    monkeypatch.setenv("SMTP_HOST", "smtp.example.com")
    monkeypatch.setenv("SMTP_PORT", "587")
    monkeypatch.setenv("SMTP_USER", "apikey")
    monkeypatch.setenv("SMTP_PASSWORD", "secret")
    monkeypatch.setenv("EMAIL_FROM", "no-reply@acme.io")

    captured = {}

    class FakeSMTP:
        def __init__(self, host, port, timeout=None):
            captured["host"], captured["port"] = host, port

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def ehlo(self):
            pass

        def starttls(self, context=None):
            captured["tls"] = True

        def login(self, user, password):
            captured["login"] = (user, password)

        def send_message(self, msg):
            captured["msg"] = msg

    monkeypatch.setattr(mailer.smtplib, "SMTP", FakeSMTP)

    ok, err = mailer.send_email("cand@x.io", "Role", "Hello", reply_to="hr@acme.io")
    assert ok and err is None
    assert captured["host"] == "smtp.example.com"
    assert captured["port"] == 587
    assert captured["tls"] is True
    assert captured["login"] == ("apikey", "secret")
    msg = captured["msg"]
    assert msg["To"] == "cand@x.io"
    assert msg["From"] == "no-reply@acme.io"
    assert msg["Reply-To"] == "hr@acme.io"


def test_provider_failure_is_reported_not_raised(monkeypatch):
    monkeypatch.setenv("EMAIL_BACKEND", "smtp")
    monkeypatch.setenv("SMTP_HOST", "smtp.example.com")

    def boom(*a, **k):
        raise OSError("connection refused")

    monkeypatch.setattr(mailer.smtplib, "SMTP", boom)
    ok, err = mailer.send_email("a@b.com", "Hi", "Body")
    assert not ok
    assert "connection refused" in err
