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
def register(post):
    """Register (and log in) a user through the right portal for their role.

    Employers go through /employer/register and land in the onboarding wizard;
    unless ``onboard=False``, the wizard is completed so tests reach the
    dashboard directly.
    """
    def _do(email, role, onboard=True, **extra):
        data = {"email": email, "password": "password123",
                "name": email.split("@")[0]}
        data.update(extra)
        if role == "employer":
            data.setdefault("company_name", "TestCo")
            resp = post("/employer/register", data=data)
            if onboard and resp.status_code == 303:
                post("/employer/onboarding/finish")
            return resp
        return post("/register", data=data)
    return _do
