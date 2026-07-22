"""Applicant tracking: pipeline stages, notes, notifications, and ownership."""
from app import mailer


def _setup(register, post, post_job, job_title="Pipeline Role"):
    """Employer with one job, and one candidate who has applied to it."""
    register("emp-p@x.io", "employer", company_name="PipeCo")
    post_job(title=job_title, required_skills="python, sql")
    post("/logout")
    register("cand-p@x.io", "candidate", name="Cand P")
    post("/candidate/profile", data={"headline": "", "skills": "python, sql"})
    post("/candidate/apply/1")
    post("/logout")
    post("/employer/login", data={"email": "emp-p@x.io", "password": "password123"})


def test_applicants_page_lists_only_actual_applicants(
    client, register, post, post_job
):
    _setup(register, post, post_job)
    page = client.get("/employer/jobs/1/applicants").text
    assert "Cand P" in page
    assert "cand-p@x.io" in page
    assert "Applied" in page


def test_stage_can_be_advanced(client, register, post, post_job):
    _setup(register, post, post_job)
    r = post("/employer/applications/1/stage", data={"stage": "shortlisted"})
    assert r.status_code == 303
    assert "Shortlisted" in client.get("/employer/jobs/1/applicants").text


def test_pipeline_counts_and_stage_filter(client, register, post, post_job):
    _setup(register, post, post_job)
    post("/employer/applications/1/stage", data={"stage": "interview"})

    # Filtering by the stage shows them; filtering by another does not.
    assert "Cand P" in client.get("/employer/jobs/1/applicants?stage=interview").text
    empty = client.get("/employer/jobs/1/applicants?stage=rejected").text
    assert "Cand P" not in empty
    assert "No applicants at the" in empty


def test_invalid_stage_is_ignored(client, register, post, post_job):
    _setup(register, post, post_job)
    r = post("/employer/applications/1/stage", data={"stage": "president"})
    assert r.headers["location"] == "/employer"
    # Still at the original stage.
    assert "Applied" in client.get("/employer/jobs/1/applicants").text


def test_candidate_sees_their_status(client, register, post, post_job):
    _setup(register, post, post_job)
    post("/employer/applications/1/stage", data={"stage": "offered"})
    post("/logout")
    post("/login", data={"email": "cand-p@x.io", "password": "password123"})
    page = client.get("/candidate").text
    assert "Offered" in page


def test_private_notes_save_and_are_not_shown_to_candidate(
    client, register, post, post_job
):
    _setup(register, post, post_job)
    post("/employer/applications/1/notes",
         data={"notes": "Strong on SQL, negotiate salary."})
    assert "Strong on SQL" in client.get("/employer/jobs/1/applicants").text

    post("/logout")
    post("/login", data={"email": "cand-p@x.io", "password": "password123"})
    assert "Strong on SQL" not in client.get("/candidate").text


def test_candidate_is_only_emailed_when_notify_is_ticked(
    client, register, post, post_job
):
    _setup(register, post, post_job)

    mailer.outbox.clear()
    post("/employer/applications/1/stage", data={"stage": "shortlisted"})
    assert mailer.outbox == [], "status change must not email unless asked"

    post("/employer/applications/1/stage",
         data={"stage": "interview", "notify": "1"})
    assert len(mailer.outbox) == 1
    sent = mailer.outbox[0]
    assert sent.to == "cand-p@x.io"
    assert "Interview" in sent.body
    assert sent.reply_to == "emp-p@x.io"
    mailer.outbox.clear()


def test_employer_cannot_touch_another_employers_application(
    client, register, post, post_job
):
    _setup(register, post, post_job)
    post("/logout")

    # A different employer tries to move application 1.
    register("other-emp@x.io", "employer", company_name="OtherCo")
    r = post("/employer/applications/1/stage", data={"stage": "rejected"})
    assert r.headers["location"] == "/employer"
    r = post("/employer/applications/1/notes", data={"notes": "sneaky"})
    assert r.headers["location"] == "/employer"

    # Original employer sees the application untouched.
    post("/logout")
    post("/employer/login", data={"email": "emp-p@x.io", "password": "password123"})
    page = client.get("/employer/jobs/1/applicants").text
    assert "Applied" in page
    assert "sneaky" not in page


def test_applicants_page_requires_job_ownership(client, register, post, post_job):
    _setup(register, post, post_job)
    post("/logout")
    register("nosy@x.io", "employer", company_name="Nosy")
    r = client.get("/employer/jobs/1/applicants", follow_redirects=False)
    assert r.headers["location"] == "/employer"
