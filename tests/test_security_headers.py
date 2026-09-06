"""Browser-facing safeguards that should accompany every rendered page."""


def test_home_response_includes_baseline_security_headers(client):
    response = client.get("/")

    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert "frame-ancestors 'none'" in response.headers["content-security-policy"]


def test_error_responses_carry_the_headers_too(client):
    """A 500 is still HTML in a browser — and the page most worth protecting.

    Unhandled exceptions never return through the middleware, so these headers
    have to come from the exception handler or they are simply absent.
    """
    from app import main as mainmod

    @mainmod.app.get("/_boom_for_tests")
    def _boom():
        raise RuntimeError("intentional")

    with __import__("fastapi").testclient.TestClient(
        mainmod.app, raise_server_exceptions=False
    ) as api:
        response = api.get("/_boom_for_tests")

    assert response.status_code == 500
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert "frame-ancestors 'none'" in response.headers["content-security-policy"]


def test_loopback_stays_allowed_without_a_public_url(monkeypatch):
    """TRUSTED_HOSTS alone must not lock out the container's own healthcheck.

    The Docker HEALTHCHECK calls localhost. If the allow-list omits it the probe
    gets a 400, the container is marked unhealthy, and it restarts forever.
    """
    import importlib

    monkeypatch.setenv("TRUSTED_HOSTS", "jobs.example.com")
    monkeypatch.delenv("PUBLIC_URL", raising=False)

    from app import main as mainmod

    importlib.reload(mainmod)
    try:
        assert "jobs.example.com" in mainmod.TRUSTED_HOSTS
        assert "localhost" in mainmod.TRUSTED_HOSTS
        assert "127.0.0.1" in mainmod.TRUSTED_HOSTS
    finally:
        monkeypatch.undo()
        importlib.reload(mainmod)
