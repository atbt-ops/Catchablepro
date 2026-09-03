"""Health probe tests: liveness stays up, readiness tells the truth."""
import sqlite3

from app import db as dbmod


def test_healthz_is_ok(client):
    resp = client.get("/healthz")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_readyz_reports_every_dependency(client):
    resp = client.get("/readyz")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert set(body["checks"]) == {"database", "uploads"}
    assert all(c["ok"] for c in body["checks"].values())
    assert all("error" not in c for c in body["checks"].values())


def test_readyz_503_when_database_file_is_gone(client):
    dbmod.DB_PATH.unlink()

    resp = client.get("/readyz")
    assert resp.status_code == 503
    body = resp.json()
    assert body["status"] == "degraded"
    assert body["checks"]["database"]["ok"] is False
    assert body["checks"]["uploads"]["ok"] is True


def test_readyz_does_not_recreate_a_missing_database(client):
    """The probe opens the DB read-only, so it cannot mask the outage."""
    dbmod.DB_PATH.unlink()

    client.get("/readyz")

    assert not dbmod.DB_PATH.exists()


def test_readyz_503_when_schema_is_missing(client):
    """A file that exists but has no schema is not a working database."""
    conn = sqlite3.connect(dbmod.DB_PATH)
    conn.execute("DROP TABLE users")
    conn.commit()
    conn.close()

    resp = client.get("/readyz")
    assert resp.status_code == 503
    assert resp.json()["checks"]["database"]["ok"] is False


def test_readyz_503_when_uploads_are_unwritable(client):
    for path in dbmod.UPLOAD_DIR.iterdir():
        path.unlink()
    dbmod.UPLOAD_DIR.rmdir()

    resp = client.get("/readyz")
    assert resp.status_code == 503
    body = resp.json()
    assert body["checks"]["uploads"]["ok"] is False
    assert body["checks"]["database"]["ok"] is True


def test_readyz_errors_do_not_leak_filesystem_paths(client):
    dbmod.DB_PATH.unlink()
    for path in dbmod.UPLOAD_DIR.iterdir():
        path.unlink()
    dbmod.UPLOAD_DIR.rmdir()

    body = client.get("/readyz").json()

    reported = " ".join(c.get("error", "") for c in body["checks"].values())
    assert reported
    assert str(dbmod.DB_PATH) not in reported
    assert str(dbmod.UPLOAD_DIR) not in reported


def test_healthz_stays_up_when_dependencies_are_down(client):
    """Liveness must not restart the process over a failed dependency."""
    dbmod.DB_PATH.unlink()

    assert client.get("/healthz").status_code == 200
    assert client.get("/readyz").status_code == 503
