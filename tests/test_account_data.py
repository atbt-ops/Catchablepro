"""Getting your data out of the account, and getting rid of the account."""
import sqlite3

from app import db as dbmod


def _conn():
    conn = sqlite3.connect(dbmod.DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _user(email: str):
    conn = _conn()
    row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()
    return row


def _count(sql: str, args=()) -> int:
    conn = _conn()
    n = conn.execute(sql, args).fetchone()[0]
    conn.close()
    return n


# --------------------------------------------------------------------------- #
# Export
# --------------------------------------------------------------------------- #
def test_candidate_export_carries_their_own_data(client, post, register):
    register("cand@x.com", "candidate")
    post("/candidate/profile", data={"headline": "Backend dev", "skills": "python, sql"})

    payload = client.get("/account/export").json()

    assert payload["account"]["email"] == "cand@x.com"
    assert payload["account"]["role"] == "candidate"
    assert "python" in payload["profile"]["skills"]
    assert payload["exported_at"]


def test_export_never_includes_credentials(client, post, register):
    register("cand@x.com", "candidate")

    body = client.get("/account/export").text

    assert "password_hash" not in body
    assert "totp_secret" not in body


def test_export_is_offered_as_a_download(client, post, register):
    register("cand@x.com", "candidate")

    resp = client.get("/account/export")

    assert "attachment" in resp.headers["content-disposition"]
    assert resp.headers["content-disposition"].endswith('.json"')


def test_employer_export_excludes_other_peoples_data(client, post, register, post_job):
    """A candidate who applied is somebody else's data, not the employer's."""
    register("boss@x.com", "employer")
    post_job(title="Backend Engineer", required_skills="python")
    post("/logout")

    register("cand@x.com", "candidate")
    post("/candidate/profile", data={"headline": "Dev", "skills": "python"})
    post("/candidate/auto-apply")  # applies them to the matching job
    post("/logout")

    post("/employer/login", data={"email": "boss@x.com", "password": "password123"})
    body = client.get("/account/export")
    payload = body.json()

    assert any(j["title"] == "Backend Engineer" for j in payload["jobs_posted"])
    assert "cand@x.com" not in body.text


# --------------------------------------------------------------------------- #
# Deletion
# --------------------------------------------------------------------------- #
def test_deletion_requires_the_right_password(post, register):
    register("cand@x.com", "candidate")

    resp = post("/account/delete", data={"current_password": "wrong-password"})

    assert resp.status_code == 400
    assert _user("cand@x.com") is not None


def test_deletion_removes_the_account_and_its_rows(post, register):
    register("cand@x.com", "candidate")
    user_id = _user("cand@x.com")["id"]

    resp = post("/account/delete", data={"current_password": "password123"})

    assert resp.status_code == 303
    assert _user("cand@x.com") is None
    assert _count("SELECT COUNT(*) FROM candidate_profiles WHERE user_id = ?", (user_id,)) == 0


def test_deletion_removes_applications(post, register, post_job):
    register("boss@x.com", "employer")
    post_job(title="Backend Engineer", required_skills="python")
    post("/logout")

    register("cand@x.com", "candidate")
    post("/candidate/profile", data={"headline": "Dev", "skills": "python"})
    post("/candidate/auto-apply")  # applies them to the matching job
    user_id = _user("cand@x.com")["id"]
    assert _count("SELECT COUNT(*) FROM applications WHERE candidate_id = ?", (user_id,)) > 0

    post("/account/delete", data={"current_password": "password123"})

    assert _count("SELECT COUNT(*) FROM applications WHERE candidate_id = ?", (user_id,)) == 0


def test_deletion_removes_the_resume_from_disk(post, register):
    register("cand@x.com", "candidate")
    post(
        "/candidate/profile",
        data={"headline": "Dev", "skills": "python"},
        files={"resume": ("cv.txt", b"python developer", "text/plain")},
    )
    assert list(dbmod.UPLOAD_DIR.glob("resume_*"))

    post("/account/delete", data={"current_password": "password123"})

    assert list(dbmod.UPLOAD_DIR.glob("resume_*")) == []


def test_deletion_ends_the_session(client, post, register):
    register("cand@x.com", "candidate")

    post("/account/delete", data={"current_password": "password123"})

    # follow_redirects=False, or the client silently follows to /login and 200s.
    assert client.get("/candidate", follow_redirects=False).status_code == 303


def test_deletion_is_audited_and_the_entry_outlives_the_account(post, register):
    register("cand@x.com", "candidate")

    post("/account/delete", data={"current_password": "password123"})

    conn = _conn()
    entry = conn.execute(
        "SELECT * FROM audit_log WHERE action = 'account.delete'"
    ).fetchone()
    conn.close()
    assert entry is not None
    # The account is gone, so the foreign key is nulled — the snapshot is what
    # keeps the record meaningful.
    assert entry["actor_id"] is None
    assert entry["actor_email"] == "cand@x.com"
    assert entry["target_label"] == "cand@x.com"


def test_an_admin_cannot_delete_their_own_account(post, register):
    register("boss@x.com", "employer")
    conn = _conn()
    conn.execute("UPDATE users SET is_admin = 1 WHERE email = ?", ("boss@x.com",))
    conn.commit()
    conn.close()

    resp = post("/account/delete", data={"current_password": "password123"})

    assert resp.status_code == 400
    assert "revoke" in resp.text
    assert _user("boss@x.com") is not None


def test_deleting_an_employer_takes_their_jobs(post, register, post_job):
    register("boss@x.com", "employer")
    post_job(title="Backend Engineer", required_skills="python")
    user_id = _user("boss@x.com")["id"]

    post("/account/delete", data={"current_password": "password123"})

    assert _count("SELECT COUNT(*) FROM jobs WHERE employer_id = ?", (user_id,)) == 0
