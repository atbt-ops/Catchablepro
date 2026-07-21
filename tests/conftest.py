"""Shared pytest fixtures: an app client backed by a throwaway SQLite DB."""
import importlib

import pytest
from fastapi.testclient import TestClient


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


def _register(client, email, role, **extra):
    data = {"email": email, "password": "password123", "role": role, "name": email.split("@")[0]}
    data.update(extra)
    return client.post("/register", data=data, follow_redirects=False)
