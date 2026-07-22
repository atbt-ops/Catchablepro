"""Integration tests covering the core end-to-end flows."""


def test_public_pages_ok(client):
    for path in ("/", "/login", "/register"):
        assert client.get(path).status_code == 200


def test_register_logs_in_and_routes_by_role(client, register):
    r = register("boss@acme.io", "employer", company_name="Acme")
    assert r.status_code == 303
    assert r.headers["location"] == "/employer"
    # Session cookie is set, so the employer dashboard is reachable.
    assert client.get("/employer").status_code == 200


def test_duplicate_email_rejected(register):
    register("dup@x.io", "candidate")
    r = register("dup@x.io", "candidate")
    assert r.status_code == 400


def test_post_without_csrf_is_rejected(client):
    # No csrf_token in the body -> forbidden.
    r = client.post("/register", data={
        "email": "nocsrf@x.io", "password": "password123",
        "role": "candidate", "name": "no",
    })
    assert r.status_code == 403


def test_manual_apply_records_match_percentage(client, register, post):
    register("emp@x.io", "employer", company_name="X")
    post("/employer/jobs", data={
        "title": "Backend", "location": "Remote",
        "required_skills": "python, sql, docker, aws", "description": "",
    })
    # New candidate session.
    post("/logout")
    register("cand@x.io", "candidate")
    post("/candidate/profile", data={"headline": "", "skills": "python, sql"})
    post("/candidate/apply/1")
    page = client.get("/candidate").text
    assert "50%" in page  # 2 of 4 required skills


def test_rich_job_fields_are_saved_and_shown(client, register, post):
    register("rich@x.io", "employer", company_name="RichCo")
    post("/employer/jobs", data={
        "title": "Senior Backend Engineer", "location": "Bengaluru",
        "required_skills": "python, sql", "description": "Build APIs.",
        "employment_type": "Full-time", "work_mode": "Hybrid",
        "exp_min": 3, "exp_max": 6, "salary_min": 18, "salary_max": 32,
        "vacancies": 2, "department": "Engineering", "education": "Graduate",
    })
    page = client.get("/employer").text
    assert "Senior Backend Engineer" in page
    assert "3–6 yrs" in page          # formatted experience range
    assert "₹18–32 LPA" in page       # formatted salary range
    assert "Hybrid" in page


def test_hidden_salary_is_not_disclosed(client, register, post):
    register("hide@x.io", "employer", company_name="HideCo")
    post("/employer/jobs", data={
        "title": "Secret Pay Role", "required_skills": "python",
        "salary_min": 20, "salary_max": 40, "hide_salary": "1",
    })
    assert "Not disclosed" in client.get("/employer").text


def test_company_profile_saves(client, register, post):
    register("co@x.io", "employer", company_name="Old Name")
    post("/employer/company", data={
        "company_name": "New Name", "industry": "Fintech",
        "size": "51-200 employees", "website": "https://new.co",
        "about": "We do money things.",
    })
    page = client.get("/employer").text
    assert "New Name" in page
    assert "Fintech" in page
    assert "We do money things." in page


def test_draft_job_is_hidden_from_candidates_and_auto_apply(client, register, post):
    # Employer saves a draft rather than publishing.
    register("draft@x.io", "employer", company_name="DraftCo")
    post("/employer/jobs", data={
        "title": "Draft Role", "required_skills": "python, sql", "action": "draft",
    })
    assert "Draft" in client.get("/employer").text
    post("/logout")

    # Candidate with auto-apply on must not see or be applied to the draft.
    register("dc@x.io", "candidate")
    post("/candidate/profile", data={"headline": "", "skills": "python, sql"})
    post("/candidate/auto-apply")
    page = client.get("/candidate").text
    assert "Draft Role" not in page

    # Publishing it later makes it live and pulls the auto-apply candidate in.
    post("/logout")
    post("/login", data={"email": "draft@x.io", "password": "password123"})
    post("/employer/jobs/1/status", data={"status": "active"})
    assert "Auto-applied" in client.get("/employer/jobs/1/matches").text


def test_closed_job_disappears_for_candidates(client, register, post):
    register("cl@x.io", "employer", company_name="CloseCo")
    post("/employer/jobs", data={"title": "Closing Role", "required_skills": "python"})
    post("/employer/jobs/1/status", data={"status": "closed"})
    post("/logout")
    register("cc@x.io", "candidate")
    post("/candidate/profile", data={"headline": "", "skills": "python"})
    assert "Closing Role" not in client.get("/candidate").text


def test_candidate_can_filter_by_work_mode(client, register, post):
    register("f@x.io", "employer", company_name="FilterCo")
    post("/employer/jobs", data={
        "title": "Remote Role", "required_skills": "python", "work_mode": "Remote",
    })
    post("/employer/jobs", data={
        "title": "Onsite Role", "required_skills": "python", "work_mode": "On-site",
    })
    post("/logout")
    register("fc@x.io", "candidate")
    post("/candidate/profile", data={"headline": "", "skills": "python"})

    both = client.get("/candidate").text
    assert "Remote Role" in both and "Onsite Role" in both

    filtered = client.get("/candidate?work_mode=Remote").text
    assert "Remote Role" in filtered
    assert "Onsite Role" not in filtered


def test_auto_apply_backfills_and_covers_new_jobs(client, register, post):
    # Employer posts one job.
    register("e2@x.io", "employer", company_name="E2")
    post("/employer/jobs", data={
        "title": "Data Eng", "location": "", "required_skills": "python, sql", "description": "",
    })
    post("/logout")

    # Candidate with matching skills turns Auto-Apply ON -> backfilled to existing job.
    register("c2@x.io", "candidate")
    post("/candidate/profile", data={"headline": "", "skills": "python, sql"})
    post("/candidate/auto-apply")
    assert "My applications" in client.get("/candidate").text
    # One auto application exists now.
    assert client.get("/candidate").text.count("Auto") >= 1

    # A brand-new job posted later should also auto-apply this candidate.
    post("/logout")
    post("/login", data={"email": "e2@x.io", "password": "password123"})
    post("/employer/jobs", data={
        "title": "Platform", "location": "", "required_skills": "python", "description": "",
    })
    matches = client.get("/employer/jobs/2/matches").text
    assert "Auto-applied" in matches
