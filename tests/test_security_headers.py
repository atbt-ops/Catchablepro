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
    from tests.conftest import reload_app

    monkeypatch.setenv("TRUSTED_HOSTS", "jobs.example.com")
    monkeypatch.delenv("PUBLIC_URL", raising=False)

    mainmod = reload_app()
    try:
        assert "jobs.example.com" in mainmod.TRUSTED_HOSTS
        assert "localhost" in mainmod.TRUSTED_HOSTS
        assert "127.0.0.1" in mainmod.TRUSTED_HOSTS
    finally:
        monkeypatch.undo()
        reload_app()


def test_script_src_forbids_inline_script(client):
    """The line between a CSP that stops XSS and one that only looks like it.

    With 'unsafe-inline' an injected <script> still runs; the policy only stops
    it loading something external. Every script here is a file under /static,
    so the allowance is not needed — and a template that reintroduces an inline
    script or an onclick= will fail this test rather than silently forcing the
    allowance back.
    """
    policy = client.get("/").headers["content-security-policy"]

    directives = dict(
        (part.split(" ", 1) + [""])[:2]
        for part in (p.strip() for p in policy.split(";"))
        if part
    )

    assert directives["script-src"] == "'self'"


def test_powershell_scripts_contain_only_ascii():
    """A non-ASCII character silently corrupts a .ps1 on Windows PowerShell 5.1.

    A .ps1 without a byte-order mark is read using the ANSI codepage, not UTF-8.
    An em dash becomes three CP1252 characters, the last of which is a curly
    close-quote -- and PowerShell honours those as string terminators. The
    string ends early, the rest of the file is parsed as code, and the error
    surfaces dozens of lines later pointing at something innocent. It cost an
    evening once; this makes it a failing test instead.
    """
    from pathlib import Path

    scripts = sorted(Path(__file__).resolve().parent.parent.glob("scripts/*.ps1"))
    assert scripts, "expected at least one PowerShell script to guard"

    offenders = {}
    for script in scripts:
        bad = sorted({c for c in script.read_text(encoding="utf-8") if ord(c) > 127})
        if bad:
            offenders[script.name] = bad

    assert not offenders, f"non-ASCII in PowerShell scripts: {offenders}"
