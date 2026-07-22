"""Shared pytest fixtures: an app client backed by a throwaway SQLite DB."""
import importlib
import re

import pytest
from fastapi.testclient import TestClient

_CSRF_RE = re.compile(r'name="csrf_token" value="([^"]+)"')


def csrf_token(client) -> str:
    """Fetch the current session's CSRF token from a rendered form."""
    html = client.get("/login").text
    m = _CSRF_RE.search(html)
    assert m, "no CSRF token found on /login"
    return m.group(1)


@pytest.fixture(autouse=True)
def _isolate_ratelimits():
    """Rate-limit counters live in-process; reset them between tests."""
    from app import ratelimit

    ratelimit.clear_all()
    yield
    ratelimit.clear_all()


@pytest.fixture()
def client(tmp_path, monkeypatch):
    # Point the data layer at a temp DB before the app starts up.
    from app import db as dbmod

    monkeypatch.setattr(dbmod, "DB_PATH", tmp_path / "test.db")
    monkeypatch.setattr(dbmod, "DATA_DIR", tmp_path)
    monkeypatch.setattr(dbmod, "UPLOAD_DIR", tmp_path / "uploads")

    # Reload main so its module-level UPLOAD_DIR import picks up the patched path.
    from app import main as mainmod
    importlib.reload(mainmod)

    with TestClient(mainmod.app) as c:
        yield c


@pytest.fixture()
def post(client):
    """POST helper that auto-injects the session CSRF token into the form."""
    def _post(path, data=None, follow_redirects=False, **kw):
        data = dict(data or {})
        data.setdefault("csrf_token", csrf_token(client))
        return client.post(path, data=data, follow_redirects=follow_redirects, **kw)
    return _post


@pytest.fixture()
def post_job(post):
    """Post a job, filling in the now-mandatory salary unless overridden."""
    def _do(**fields):
        data = {"title": "A Role", "required_skills": "python",
                "salary_min": 8, "salary_max": 14}
        data.update(fields)
        return post("/employer/jobs", data=data)
    return _do


def mark_verified(email: str) -> None:
    """Flip a user's email to verified, as clicking the emailed link would."""
    import sqlite3

    from app import db as dbmod

    conn = sqlite3.connect(dbmod.DB_PATH)
    conn.execute("UPDATE users SET email_verified = 1 WHERE email = ?", (email,))
    conn.commit()
    conn.close()


@pytest.fixture()
def register(post):
    """Register (and log in) a user through the right portal for their role.

    Employers go through /employer/register and land in the onboarding wizard;
    unless ``onboard=False``, the wizard is completed so tests reach the
    dashboard directly. Accounts are marked email-verified unless
    ``verified=False``, since most tests exercise fully-activated users.
    """
    def _do(email, role, onboard=True, verified=True, **extra):
        data = {"email": email, "password": "password123",
                "name": email.split("@")[0]}
        data.update(extra)
        if role == "employer":
            data.setdefault("company_name", "TestCo")
            resp = post("/employer/register", data=data)
            if onboard and resp.status_code == 303:
                post("/employer/onboarding/finish")
        else:
            resp = post("/register", data=data)
        if verified and resp.status_code == 303:
            mark_verified(email)
        return resp
    return _do
