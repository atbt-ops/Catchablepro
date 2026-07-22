"""Integration tests covering the core end-to-end flows."""


def test_public_pages_ok(client):
    for path in ("/", "/login", "/register"):
        assert client.get(path).status_code == 200


def test_employer_register_goes_to_onboarding(client, register):
    r = register("boss@acme.io", "employer", company_name="Acme", onboard=False)
    assert r.status_code == 303
    assert r.headers["location"] == "/employer/onboarding"
    # Dashboard is gated until onboarding finishes.
    assert client.get("/employer", follow_redirects=False).headers["location"] \
        == "/employer/onboarding"


def test_candidate_register_goes_to_dashboard(client, register):
    r = register("seeker@x.io", "candidate")
    assert r.status_code == 303
    assert r.headers["location"] == "/candidate"
    assert client.get("/candidate").status_code == 200


def test_onboarding_wizard_completes(client, register, post):
    register("wiz@acme.io", "employer", company_name="Wiz", onboard=False)
    page = client.get("/employer/onboarding").text
    assert "Tell us about your company" in page

    # Step 1 -> 2: company details saved, wizard advances.
    post("/employer/onboarding/company", data={
        "company_name": "Wizard Corp", "industry": "Fintech",
        "size": "51-200 employees", "website": "https://wiz.co",
        "hq_location": "Bengaluru", "about": "We wiz.",
    })
    step2 = client.get("/employer/onboarding").text
    assert "Post your first job" in step2

    # Skipping finishes onboarding and unlocks the dashboard.
    post("/employer/onboarding/finish")
    dash = client.get("/employer")
    assert dash.status_code == 200
    assert "Wizard Corp" in dash.text
    assert "Fintech" in dash.text


def test_posting_first_job_completes_onboarding(client, register, post, post_job):
    register("job1@acme.io", "employer", company_name="J1", onboard=False)
    post("/employer/onboarding/company", data={"company_name": "J1 Corp"})
    post_job(**{"title": "First Role", "required_skills": "python"})
    # Onboarding is done, so /employer renders instead of redirecting.
    assert client.get("/employer").status_code == 200


def test_employer_login_rejects_candidate_account(client, register, post):
    register("cand2@x.io", "candidate")
    post("/logout")
    r = post("/employer/login", data={"email": "cand2@x.io", "password": "password123"})
    assert r.status_code == 403


def test_candidate_cannot_register_as_employer_via_candidate_form(client, register, post):
    # The candidate form has no role field; passing one must not grant employer.
    post("/register", data={
        "email": "sneaky@x.io", "password": "password123",
        "name": "Sneaky", "role": "employer",
    })
    # Employer area stays out of reach; they are routed to the candidate side.
    assert client.get("/employer", follow_redirects=False).headers["location"] == "/candidate"


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


def test_manual_apply_records_match_percentage(client, register, post, post_job):
    register("emp@x.io", "employer", company_name="X")
    post_job(**{
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


def test_rich_job_fields_are_saved_and_shown(client, register, post, post_job):
    register("rich@x.io", "employer", company_name="RichCo")
    post_job(**{
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


def test_hidden_salary_is_not_disclosed(client, register, post, post_job):
    register("hide@x.io", "employer", company_name="HideCo")
    post_job(**{
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


def test_draft_job_is_hidden_from_candidates_and_auto_apply(client, register, post, post_job):
    # Employer saves a draft rather than publishing.
    register("draft@x.io", "employer", company_name="DraftCo")
    post_job(**{
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


def test_closed_job_disappears_for_candidates(client, register, post, post_job):
    register("cl@x.io", "employer", company_name="CloseCo")
    post_job(**{"title": "Closing Role", "required_skills": "python"})
    post("/employer/jobs/1/status", data={"status": "closed"})
    post("/logout")
    register("cc@x.io", "candidate")
    post("/candidate/profile", data={"headline": "", "skills": "python"})
    assert "Closing Role" not in client.get("/candidate").text


def test_candidate_can_filter_by_work_mode(client, register, post, post_job):
    register("f@x.io", "employer", company_name="FilterCo")
    post_job(**{
        "title": "Remote Role", "required_skills": "python", "work_mode": "Remote",
    })
    post_job(**{
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


def test_auto_apply_backfills_and_covers_new_jobs(client, register, post, post_job):
    # Employer posts one job.
    register("e2@x.io", "employer", company_name="E2")
    post_job(**{
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
    post_job(**{
        "title": "Platform", "location": "", "required_skills": "python", "description": "",
    })
    matches = client.get("/employer/jobs/2/matches").text
    assert "Auto-applied" in matches


def test_salary_is_mandatory(client, register, post):
    register("nosal@x.io", "employer", company_name="NoSal")
    r = post("/employer/jobs", data={"title": "No Salary", "required_skills": "python"})
    assert r.status_code == 400
    assert "lakhs per annum" in r.text
    # The job must not have been created.
    assert "No Salary" not in client.get("/employer").text


def test_salary_entered_in_rupees_is_rejected(client, register, post):
    register("rupees@x.io", "employer", company_name="Rup")
    r = post("/employer/jobs", data={
        "title": "Rupee Role", "required_skills": "python",
        "salary_min": 800000, "salary_max": 1200000,
    })
    assert r.status_code == 400
    # The error tells them the lakhs equivalent of what they typed.
    assert "if that was rupees, enter 8 instead" in r.text
    assert "Rupee Role" not in client.get("/employer").text


def test_salary_max_below_min_is_rejected(register, post):
    register("badrange@x.io", "employer", company_name="BR")
    r = post("/employer/jobs", data={
        "title": "Bad Range", "required_skills": "python",
        "salary_min": 20, "salary_max": 10,
    })
    assert r.status_code == 400
    assert "cannot be less than" in r.text


def test_rejected_form_preserves_entered_values(register, post):
    register("keep@x.io", "employer", company_name="Keep")
    r = post("/employer/jobs", data={
        "title": "Kept Title", "required_skills": "python, sql",
        "location": "Pune", "salary_min": 0, "salary_max": 0,
    })
    assert r.status_code == 400
    assert "Kept Title" in r.text     # title survived the round trip
    assert "Pune" in r.text


def test_description_formatting_is_kept_but_scripts_are_stripped(
    client, register, post, post_job
):
    import re

    register("rt@x.io", "employer", company_name="RT")
    post_job(
        title="Formatted Role", required_skills="python",
        description='<p>We need <strong>Python</strong></p><ul><li>APIs</li></ul>'
                    '<script>alert("xss")</script><img src=x onerror=alert(2)>',
    )
    post("/logout")
    register("rtc@x.io", "candidate")
    post("/candidate/profile", data={"headline": "", "skills": "python"})

    page = client.get("/candidate").text
    # Inspect only the rendered description block, not the whole page (the
    # layout has its own legitimate <script> for the theme toggle).
    block = re.search(r'<div class="row-desc jobdesc">(.*?)</div>', page, re.S)
    assert block, "job description block not rendered"
    desc = block.group(1)

    assert "<strong>Python</strong>" in desc   # bold survives
    assert "<li>APIs</li>" in desc             # bullets survive
    assert "<script" not in desc               # script tag stripped
    assert "alert(\"xss\")" not in desc        # and not executable
    assert "onerror" not in desc               # event handler stripped


def test_stored_description_is_sanitized_in_db(client, register, post_job, tmp_path):
    register("dbrt@x.io", "employer", company_name="DBRT")
    post_job(
        title="Sanitized Role", required_skills="python",
        description='<p>Hi <b>there</b></p><script>alert(1)</script>',
    )
    from app import db as dbmod
    import sqlite3
    conn = sqlite3.connect(dbmod.DB_PATH)
    desc = conn.execute(
        "SELECT description FROM jobs WHERE title = 'Sanitized Role'"
    ).fetchone()[0]
    conn.close()
    assert "<b>there</b>" in desc      # formatting preserved
    assert "<script>" not in desc      # script tag removed


def test_contact_form_prefills_candidate_and_sends(client, register, post, post_job):
    from app import mailer
    mailer.outbox.clear()

    register("hire@acme.io", "employer", company_name="Acme", name="Priya")
    post_job(title="Backend Engineer", required_skills="python, sql")
    post("/logout")
    register("asha@example.com", "candidate", name="Asha Verma")
    post("/candidate/profile", data={"headline": "", "skills": "python, sql"})
    post("/logout")
    post("/employer/login", data={"email": "hire@acme.io", "password": "password123"})

    # The matches page links to the compose page, not a mailto.
    matches = client.get("/employer/jobs/1/matches").text
    assert "asha@example.com" in matches
    assert "/employer/jobs/1/contact/" in matches

    # Compose page is prefilled for that candidate and role.
    form = client.get("/employer/jobs/1/contact/2").text
    assert "asha@example.com" in form
    assert "Backend Engineer" in form
    assert "Hi Asha Verma" in form

    # Sending delivers to the candidate, with replies routed to the employer.
    r = post("/employer/jobs/1/contact/2", data={
        "subject": "About the Backend Engineer role", "body": "Hi Asha, let's talk.",
    })
    assert r.status_code == 303
    assert len(mailer.outbox) == 1
    sent = mailer.outbox[0]
    assert sent.to == "asha@example.com"
    assert sent.subject == "About the Backend Engineer role"
    assert sent.reply_to == "hire@acme.io"
    mailer.outbox.clear()


def test_employer_cannot_contact_through_another_employers_job(client, register, post, post_job):
    from app import mailer
    mailer.outbox.clear()

    # Employer A owns job 1.
    register("a@x.io", "employer", company_name="A")
    post_job(title="A Role", required_skills="python")
    post("/logout")
    register("cand9@x.io", "candidate")
    post("/candidate/profile", data={"headline": "", "skills": "python"})
    post("/logout")

    # Employer B tries to use A's job to reach the candidate.
    register("b@x.io", "employer", company_name="B")
    r = post("/employer/jobs/1/contact/2", data={"subject": "Hi", "body": "Hello"})
    assert r.status_code == 303
    assert r.headers["location"] == "/employer"
    assert mailer.outbox == []   # nothing was sent


def test_contact_page_warns_when_no_provider_configured(client, register, post, post_job):
    register("warn@x.io", "employer", company_name="W")
    post_job(title="W Role", required_skills="python")
    post("/logout")
    register("wc@x.io", "candidate")
    post("/candidate/profile", data={"headline": "", "skills": "python"})
    post("/logout")
    post("/employer/login", data={"email": "warn@x.io", "password": "password123"})

    page = client.get("/employer/jobs/1/contact/2").text
    assert "No email provider configured" in page
