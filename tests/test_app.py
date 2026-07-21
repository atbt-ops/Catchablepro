"""Integration tests covering the core end-to-end flows."""
from tests.conftest import _register


def test_public_pages_ok(client):
    for path in ("/", "/login", "/register"):
        assert client.get(path).status_code == 200


def test_register_logs_in_and_routes_by_role(client):
    r = _register(client, "boss@acme.io", "employer", company_name="Acme")
    assert r.status_code == 303
    assert r.headers["location"] == "/employer"
    # Session cookie is set, so the employer dashboard is reachable.
    assert client.get("/employer").status_code == 200


def test_duplicate_email_rejected(client):
    _register(client, "dup@x.io", "candidate")
    r = _register(client, "dup@x.io", "candidate")
    assert r.status_code == 400


def test_manual_apply_records_match_percentage(client):
    _register(client, "emp@x.io", "employer", company_name="X")
    client.post("/employer/jobs", data={
        "title": "Backend", "location": "Remote",
        "required_skills": "python, sql, docker, aws", "description": "",
    })
    # New candidate session.
    client.post("/logout")
    _register(client, "cand@x.io", "candidate")
    client.post("/candidate/profile", data={"headline": "", "skills": "python, sql"})
    client.post("/candidate/apply/1")
    page = client.get("/candidate").text
    assert "50%" in page  # 2 of 4 required skills


def test_auto_apply_backfills_and_covers_new_jobs(client):
    # Employer posts one job.
    _register(client, "e2@x.io", "employer", company_name="E2")
    client.post("/employer/jobs", data={
        "title": "Data Eng", "location": "", "required_skills": "python, sql", "description": "",
    })
    client.post("/logout")

    # Candidate with matching skills turns Auto-Apply ON -> backfilled to existing job.
    _register(client, "c2@x.io", "candidate")
    client.post("/candidate/profile", data={"headline": "", "skills": "python, sql"})
    client.post("/candidate/auto-apply")
    assert "My applications" in client.get("/candidate").text
    # One auto application exists now.
    assert client.get("/candidate").text.count("Auto") >= 1

    # A brand-new job posted later should also auto-apply this candidate.
    client.post("/logout")
    client.post("/login", data={"email": "e2@x.io", "password": "password123"})
    client.post("/employer/jobs", data={
        "title": "Platform", "location": "", "required_skills": "python", "description": "",
    })
    matches = client.get("/employer/jobs/2/matches").text
    assert "Auto-applied" in matches
