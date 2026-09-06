"""Production refuses to start on config that would fail silently.

Both guards live at import time in app.main, so each case reloads the module
with the environment it is testing.
"""
import importlib

import pytest


def _boot(monkeypatch, **env):
    """Import app.main under the given environment; raises if a guard trips."""
    for key in (
        "ENV", "SECRET_KEY", "EMAIL_BACKEND", "SMTP_HOST",
        "SENDGRID_API_KEY", "ALLOW_CONSOLE_EMAIL", "PUBLIC_URL", "TRUSTED_HOSTS",
    ):
        monkeypatch.delenv(key, raising=False)
    for key, value in env.items():
        monkeypatch.setenv(key, value)

    from app import main as mainmod

    return importlib.reload(mainmod)


@pytest.fixture(autouse=True)
def _restore_module():
    """Leave app.main loaded under the ambient environment for other tests."""
    yield
    from app import main as mainmod

    importlib.reload(mainmod)


# --------------------------------------------------------------------------- #
# Email deliverability
# --------------------------------------------------------------------------- #
def test_production_refuses_the_console_mailer(monkeypatch):
    with pytest.raises(RuntimeError) as caught:
        _boot(monkeypatch, ENV="production", SECRET_KEY="a-real-secret-value")

    message = str(caught.value)
    assert "Email is not deliverable" in message
    assert "ALLOW_CONSOLE_EMAIL" in message  # the message names the way out


def test_production_refuses_a_backend_missing_its_credentials(monkeypatch):
    """Naming smtp without SMTP_HOST is a misconfiguration, not a provider."""
    with pytest.raises(RuntimeError):
        _boot(
            monkeypatch,
            ENV="production",
            SECRET_KEY="a-real-secret-value",
            EMAIL_BACKEND="smtp",
        )


def test_production_accepts_a_configured_provider(monkeypatch):
    _boot(
        monkeypatch,
        ENV="production",
        SECRET_KEY="a-real-secret-value",
        EMAIL_BACKEND="smtp",
        SMTP_HOST="smtp.example.com",
    )


def test_a_demo_deploy_can_opt_into_sending_nothing(monkeypatch):
    _boot(
        monkeypatch,
        ENV="production",
        SECRET_KEY="a-real-secret-value",
        ALLOW_CONSOLE_EMAIL="1",
    )


def test_development_is_unaffected(monkeypatch):
    module = _boot(monkeypatch)

    assert module.IS_PROD is False


# --------------------------------------------------------------------------- #
# Session signing key — the guard that was already there, now covered
# --------------------------------------------------------------------------- #
def test_production_refuses_the_development_secret(monkeypatch):
    with pytest.raises(RuntimeError) as caught:
        _boot(monkeypatch, ENV="production", ALLOW_CONSOLE_EMAIL="1")

    assert "SECRET_KEY" in str(caught.value)


def test_public_url_must_be_a_plain_https_origin(monkeypatch):
    with pytest.raises(RuntimeError) as caught:
        _boot(
            monkeypatch,
            ENV="production",
            SECRET_KEY="a-real-secret-value",
            EMAIL_BACKEND="smtp",
            SMTP_HOST="smtp.example.com",
            PUBLIC_URL="http://jobs.example.com/a-path",
        )

    assert "PUBLIC_URL" in str(caught.value)
