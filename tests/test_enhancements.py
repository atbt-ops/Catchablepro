"""'Post this role', the JD writer, bulk resume download, job-match alerts,
and the job-board homepage."""
import io
import sqlite3
import zipfile

from app import ai, alerts
from app import db as dbmod
from app import mailer
from tests.test_ai_feedback import stub_ai


# --------------------------------------------------------------------------- #
# Job-board homepage
# --------------------------------------------------------------------------- #
def test_homepage_is_the_job_board_for_everyone(client, register, post, post_job):
    register("home-emp@x.io", "employer", company_name="HomeCo")
    post_job(title="Homepage Role", required_skills="python", department="Engineering")
    post("/logout")

    # Guest: sees the board, not a redirect, not a marketing hero.
    guest = client.get("/")
    assert guest.status_code == 200
    body = guest.text
    assert "home-shell" in body and "Homepage Role" in body
    assert "Advertisement" in body and "Browse by department" in body
    assert "% match" not in body

    # Employer stays on the board (no redirect to /employer) but no match %.
    post("/employer/login", data={"email": "home-emp@x.io", "password": "password123"})
    emp = client.get("/", follow_redirects=False)
    assert emp.status_code == 200 and "Your dashboard" in emp.text


def test_homepage_shows_match_percent_for_a_signed_in_candidate(
    client, register, post, post_job
):
    register("hc-emp@x.io", "employer", company_name="HCco")
    post_job(title="Match Home Role", required_skills="python,sql")
    post("/logout")
    register("hc-cand@x.io", "candidate")
    post("/candidate/profile", data={"headline": "", "skills": "python,sql,docker"})

    body = client.get("/").text
    assert "Match Home Role" in body and "% match" in body
    assert "Your job matches" in body


def test_homepage_filters_narrow_the_list(client, register, post, post_job):
    register("hf-emp@x.io", "employer", company_name="HFco")
    post_job(title="Eng Home Role", required_skills="python", department="Engineering")
    post_job(title="Sales Home Role", required_skills="crm", department="Sales")

    filtered = client.get("/?department=Engineering").text
    assert "Eng Home Role" in filtered
    assert "Sales Home Role" not in filtered


def test_about_page_keeps_the_marketing_content(client):
    assert "real skills" in client.get("/about").text


# --------------------------------------------------------------------------- #
# Edit / duplicate a job, withdraw an application
# --------------------------------------------------------------------------- #
def _job_row(job_id: int):
    conn = sqlite3.connect(dbmod.DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
    conn.close()
    return row


def test_employer_edits_a_job_without_touching_the_pricing_meter(
    client, register, post, post_job
):
    register("edit-emp@x.io", "employer", company_name="EditCo")
    post_job(title="Old Title", required_skills="python", salary_min=8, salary_max=14)
    job_id = _latest_job_id()
    before = _job_row(job_id)["active_since"]
    assert before  # it's live, meter running

    r = post(f"/employer/jobs/{job_id}/edit", data={
        "title": "New Title", "required_skills": "python,go", "location": "Pune",
        "employment_type": "Full-time", "work_mode": "Hybrid",
        "exp_min": 2, "exp_max": 5, "salary_min": 15, "salary_max": 25,
        "vacancies": 3, "education": "Graduate", "department": "Engineering",
        "description": "<p>Updated.</p>",
    })
    assert r.status_code == 303 and "flash=edited" in r.headers["location"]

    after = _job_row(job_id)
    assert after["title"] == "New Title"
    assert after["required_skills"] == "python,go"
    assert after["salary_min"] == 15
    assert after["active_since"] == before  # meter untouched


def test_employer_cannot_edit_another_employers_job(client, register, post, post_job):
    register("own@x.io", "employer", company_name="OwnCo")
    post_job(title="Theirs", required_skills="python")
    job_id = _latest_job_id()
    post("/logout")
    register("other@x.io", "employer", company_name="OtherCo")

    assert client.get(f"/employer/jobs/{job_id}/edit", follow_redirects=False
                      ).headers["location"] == "/employer"
    r = post(f"/employer/jobs/{job_id}/edit", data={
        "title": "Hijacked", "salary_min": 5, "salary_max": 9,
        "required_skills": "x", "description": "x",
    })
    assert r.headers["location"] == "/employer"
    assert _job_row(job_id)["title"] == "Theirs"


def test_post_similar_prefills_the_form_from_an_existing_job(
    client, register, post, post_job
):
    register("dup-emp@x.io", "employer", company_name="DupCo")
    post_job(title="Backend Role", required_skills="python,fastapi",
             location="Chennai", department="Engineering")
    job_id = _latest_job_id()

    assert post(f"/employer/jobs/{job_id}/duplicate", data={}).status_code == 303
    form = client.get("/employer/jobs/new").text
    assert "Backend Role (copy)" in form
    assert "python,fastapi" in form and "Chennai" in form


def test_candidate_withdraws_an_application(client, register, post, post_job):
    register("wd-emp@x.io", "employer", company_name="WDco")
    post_job(title="Withdrawable", required_skills="python")
    job_id = _latest_job_id()
    post("/logout")
    register("wd-cand@x.io", "candidate")
    post("/candidate/profile", data={"headline": "", "skills": "python"})
    post(f"/candidate/apply/{job_id}", data={"next": "/candidate"})

    conn = sqlite3.connect(dbmod.DB_PATH)
    app_id = conn.execute(
        "SELECT id FROM applications WHERE job_id = ?", (job_id,)
    ).fetchone()[0]
    conn.close()

    r = post(f"/candidate/applications/{app_id}/withdraw", data={})
    assert r.status_code == 303 and "flash=withdrawn" in r.headers["location"]

    conn = sqlite3.connect(dbmod.DB_PATH)
    n = conn.execute("SELECT COUNT(*) FROM applications WHERE id = ?", (app_id,)).fetchone()[0]
    conn.close()
    assert n == 0


def _latest_job_id() -> int:
    conn = sqlite3.connect(dbmod.DB_PATH)
    row = conn.execute("SELECT MAX(id) FROM jobs").fetchone()
    conn.close()
    return row[0]


# --------------------------------------------------------------------------- #
# AI assistant: post this role / draft a JD
# --------------------------------------------------------------------------- #
def test_assistant_match_offers_a_prefilled_post(client, register, post, monkeypatch):
    register("emp-pr@x.io", "employer", company_name="PrefillCo")
    stub_ai(monkeypatch, {
        "title": "Platform Engineer", "seniority": "Senior",
        "skills": ["python", "terraform", "aws"],
        "summary": "Run the platform.",
    })
    r = post("/employer/assistant",
             data={"action": "match", "job_description": "Senior platform engineer, Python, Terraform, AWS."})
    assert "Post this role" in r.text and 'value="Platform Engineer"' in r.text

    r2 = post("/employer/jobs/new/prefill", data={
        "title": "Platform Engineer",
        "required_skills": "python, terraform, aws",
        "description": "Run the platform.",
    })
    assert r2.status_code == 303 and r2.headers["location"] == "/employer/jobs/new"
    form = client.get("/employer/jobs/new").text
    assert "Prefilled" in form and "review everything" in form
    assert 'value="Platform Engineer"' in form
    assert "python, terraform, aws" in form


def test_assistant_drafts_a_job_description(client, register, post, monkeypatch):
    register("emp-jd@x.io", "employer", company_name="DraftCo")
    stub_ai(monkeypatch, {
        "title": "React Developer",
        "description": "About the role\nBuild our UI.\n\nWhat you'll do\n- ship features",
    })
    r = post("/employer/assistant",
             data={"action": "draft", "brief": "react dev, remote, 3 years"})
    assert "React Developer" in r.text and "Build our UI." in r.text
    assert "Post this role" in r.text


# --------------------------------------------------------------------------- #
# Bulk resume download
# --------------------------------------------------------------------------- #
def test_bulk_resume_zip_contains_applicant_resumes(client, register, post, post_job):
    register("bulk-emp@x.io", "employer", company_name="BulkCo")
    post_job(title="Zip Role", required_skills="python")
    job_id = _latest_job_id()
    post("/logout")

    register("bulk-cand@x.io", "candidate", name="Riya Sharma")
    post("/candidate/profile", data={"headline": "Dev", "skills": "python"},
         files={"resume": ("riya_cv.txt", b"python, sql, django", "text/plain")})
    post(f"/candidate/apply/{job_id}", data={"next": "/candidate"})
    post("/logout")

    post("/employer/login", data={"email": "bulk-emp@x.io", "password": "password123"})
    resp = client.get(f"/employer/jobs/{job_id}/resumes.zip")
    assert resp.headers["content-type"] == "application/zip"
    names = zipfile.ZipFile(io.BytesIO(resp.content)).namelist()
    assert names == ["riya-sharma.txt"]


def test_bulk_resume_zip_redirects_when_no_resumes(client, register, post, post_job):
    register("bulk2-emp@x.io", "employer", company_name="Bulk2Co")
    post_job(title="Empty Role", required_skills="python")
    job_id = _latest_job_id()

    resp = client.get(f"/employer/jobs/{job_id}/resumes.zip", follow_redirects=False)
    assert resp.status_code == 303
    assert resp.headers["location"].endswith("flash=no-resumes")


def test_bulk_resume_zip_rejects_another_employers_job(client, register, post, post_job):
    register("owner@x.io", "employer", company_name="OwnerCo")
    post_job(title="Owned Role", required_skills="python")
    job_id = _latest_job_id()
    post("/logout")
    register("intruder@x.io", "employer", company_name="IntruderCo")
    resp = client.get(f"/employer/jobs/{job_id}/resumes.zip", follow_redirects=False)
    assert resp.headers["location"] == "/employer"


# --------------------------------------------------------------------------- #
# Job-match email alerts
# --------------------------------------------------------------------------- #
def test_candidate_toggles_job_alerts(client, register, post):
    register("alert-cand@x.io", "candidate")
    post("/candidate/profile", data={"headline": "", "skills": "python"})
    assert "Alerts are OFF" in client.get("/candidate").text

    post("/candidate/job-alerts", data={})
    assert "Alerts are ON" in client.get("/candidate").text


def test_send_job_alerts_emails_only_opted_in_candidates_with_matches(
    client, register, post, post_job
):
    register("alert-emp@x.io", "employer", company_name="AlertCo")
    post_job(title="Python Alert Role", required_skills="python,django,sql")
    post("/logout")

    register("wants@x.io", "candidate", name="Wants Alerts")
    post("/candidate/profile", data={"headline": "", "skills": "python,django,sql,docker"})
    post("/candidate/job-alerts", data={})           # opted in
    post("/logout")
    register("quiet@x.io", "candidate")
    post("/candidate/profile", data={"headline": "", "skills": "python,django"})  # not opted in

    mailer.outbox.clear()
    summary = alerts.run(dry_run=False)

    assert len(mailer.outbox) == 1
    sent = mailer.outbox[0]
    assert sent.to == "wants@x.io"
    assert "Python Alert Role" in sent.body
    assert "1" in summary and "sent" in summary

    # Second run: nothing new since last_alert_at, so no email.
    mailer.outbox.clear()
    alerts.run(dry_run=False)
    assert mailer.outbox == []
