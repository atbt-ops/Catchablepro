"""The /metrics endpoint: what it measures, and who may read it."""
import importlib
import re

import pytest


@pytest.fixture()
def prod_client(monkeypatch, tmp_path):
    """A client whose app booted with ENV=production."""
    def _build(**env):
        from app import db as dbmod

        monkeypatch.setattr(dbmod, "DB_PATH", tmp_path / "prod.db")
        monkeypatch.setattr(dbmod, "DATA_DIR", tmp_path)
        monkeypatch.setattr(dbmod, "UPLOAD_DIR", tmp_path / "uploads")
        monkeypatch.setenv("ENV", "production")
        monkeypatch.setenv("SECRET_KEY", "a-real-secret-value-for-tests")
        monkeypatch.setenv("ALLOW_CONSOLE_EMAIL", "1")
        monkeypatch.delenv("METRICS_TOKEN", raising=False)
        for key, value in env.items():
            monkeypatch.setenv(key, value)

        from fastapi.testclient import TestClient
        from app import main as mainmod

        importlib.reload(mainmod)
        return TestClient(mainmod.app)

    yield _build

    from app import main as mainmod

    importlib.reload(mainmod)


# --------------------------------------------------------------------------- #
# What it exposes
# --------------------------------------------------------------------------- #
def test_metrics_are_exposed_in_prometheus_format(client):
    body = client.get("/metrics").text

    assert "# TYPE http_requests_total counter" in body
    assert "http_request_duration_seconds" in body


def test_requests_are_counted_by_outcome(client):
    client.get("/healthz")

    body = client.get("/metrics").text

    assert 'http_requests_total{method="GET",route="/healthz",status="200"}' in body


def test_routes_are_labelled_by_template_not_by_id(client):
    """One series per route, not one per job — the cardinality trap.

    Asserted against the route labels rather than the whole document. The
    exposition is full of floats — a process start time, request durations to
    sixteen significant digits, memory sizes — and a bare substring search over
    all of it can fail on a coincidence: any four consecutive digits anywhere
    have a one-in-ten-thousand chance of reading "4242", and a small body
    already holds a couple of hundred such windows. This exact test failed that
    way once on main. What it means to assert is that no *label* carries the id.
    """
    client.get("/candidate/apply/4242", follow_redirects=False)

    routes = set(re.findall(r'route="([^"]*)"', client.get("/metrics").text))

    assert "/candidate/apply/{job_id}" in routes
    assert not any("4242" in route for route in routes)


def test_unmatched_paths_collapse_into_one_series(client):
    client.get("/no-such-page-aaa")
    client.get("/no-such-page-bbb")

    body = client.get("/metrics").text

    assert 'route="unmatched"' in body
    assert "no-such-page" not in body


def test_the_scrape_endpoint_does_not_measure_itself(client):
    client.get("/metrics")

    body = client.get("/metrics").text

    assert 'route="/metrics"' not in body


def test_static_files_are_not_measured(client):
    client.get("/static/style.css")

    body = client.get("/metrics").text

    assert "/static" not in body


def test_duration_is_recorded(client):
    client.get("/healthz")

    body = client.get("/metrics").text

    assert 'http_request_duration_seconds_count{method="GET",route="/healthz"}' in body


# --------------------------------------------------------------------------- #
# Who may read it
# --------------------------------------------------------------------------- #
def test_development_leaves_it_open(client):
    assert client.get("/metrics").status_code == 200


def test_production_hides_it_when_no_token_is_configured(prod_client):
    assert prod_client().get("/metrics").status_code == 404


def test_production_serves_it_to_a_correct_bearer_token(prod_client):
    api = prod_client(METRICS_TOKEN="s3cret-scrape-token")

    resp = api.get("/metrics", headers={"Authorization": "Bearer s3cret-scrape-token"})

    assert resp.status_code == 200
    assert "http_requests_total" in resp.text


def test_a_wrong_token_gets_404_not_401(prod_client):
    """404 rather than 401: don't confirm the endpoint exists to a stranger."""
    api = prod_client(METRICS_TOKEN="s3cret-scrape-token")

    assert api.get("/metrics", headers={"Authorization": "Bearer wrong"}).status_code == 404
    assert api.get("/metrics").status_code == 404


# --------------------------------------------------------------------------- #
# Readiness, as something alertable
# --------------------------------------------------------------------------- #
def test_readiness_is_published_as_a_gauge(client):
    client.get("/readyz")

    body = client.get("/metrics").text

    assert "app_ready 1.0" in body


def test_each_dependency_is_published_separately(client):
    """The alert has to name which dependency broke, not just that one did."""
    client.get("/readyz")

    body = client.get("/metrics").text

    assert 'app_dependency_up{check="database"} 1.0' in body
    assert 'app_dependency_up{check="uploads"} 1.0' in body


def test_a_failing_dependency_shows_up_as_zero(client, monkeypatch, tmp_path):
    from app import db as dbmod

    monkeypatch.setattr(dbmod, "DB_PATH", tmp_path / "gone.db")

    assert client.get("/readyz").status_code == 503

    body = client.get("/metrics").text
    assert "app_ready 0.0" in body
    assert 'app_dependency_up{check="database"} 0.0' in body
    # The dependency that still works must not be dragged down with it.
    assert 'app_dependency_up{check="uploads"} 1.0' in body


def test_recovery_clears_the_gauge(client, monkeypatch, tmp_path):
    """A gauge that latches at 0 keeps paging after the outage ends."""
    from app import db as dbmod

    # Restore by hand, not with monkeypatch.undo(): the client fixture shares
    # this monkeypatch, so undo() would also unpatch the temp database it
    # depends on and the "recovery" would never happen.
    working = dbmod.DB_PATH
    monkeypatch.setattr(dbmod, "DB_PATH", tmp_path / "gone.db")
    client.get("/readyz")
    monkeypatch.setattr(dbmod, "DB_PATH", working)

    client.get("/readyz")

    assert "app_ready 1.0" in client.get("/metrics").text
