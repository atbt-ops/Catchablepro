"""Admin console: access control, suspension, and job takedown."""
import sqlite3

import pytest

from app import db as dbmod


def make_admin(email: str) -> None:
    conn = sqlite3.connect(dbmod.DB_PATH)
    conn.execute("UPDATE users SET is_admin = 1 WHERE email = ?", (email,))
    conn.commit()
    conn.close()


def user_id(email: str) -> int:
    conn = sqlite3.connect(dbmod.DB_PATH)
    row = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()
    return row[0]


def is_suspended(email: str) -> int:
    conn = sqlite3.connect(dbmod.DB_PATH)
    row = conn.execute(
        "SELECT is_suspended FROM users WHERE email = ?", (email,)
    ).fetchone()
    conn.close()
    return row[0]


# --------------------------------------------------------------------------- #
# Access control
# --------------------------------------------------------------------------- #
@pytest.mark.parametrize("path", ["/admin", "/admin/users", "/admin/jobs"])
def test_admin_pages_reject_anonymous(client, path):
    assert client.get(path, follow_redirects=False).headers["location"] == "/login"


@pytest.mark.parametrize("path", ["/admin", "/admin/users", "/admin/jobs"])
def test_admin_pages_reject_ordinary_users(client, register, path):
    register("plain@x.io", "candidate")
    r = client.get(path, follow_redirects=False)
    assert r.headers["location"] == "/candidate"


def test_admin_cannot_be_granted_through_signup(client, register, post):
    # Passing is_admin in the form must not grant it.
    post("/register", data={
        "email": "wannabe@x.io", "password": "password123",
        "name": "Wannabe", "is_admin": "1",
    })
    assert client.get("/admin", follow_redirects=False).headers["location"] == "/candidate"


def test_admin_sees_the_console(client, register, post):
    register("boss@x.io", "candidate")
    make_admin("boss@x.io")
    page = client.get("/admin").text
    assert "Platform overview" in page
    assert client.get("/admin/users").status_code == 200
    assert client.get("/admin/jobs").status_code == 200


# --------------------------------------------------------------------------- #
# Suspension
# --------------------------------------------------------------------------- #
def test_suspend_blocks_login(client, register, post):
    register("victim@x.io", "candidate")
    post("/logout")
    register("admin1@x.io", "candidate")
    make_admin("admin1@x.io")

    r = post(f"/admin/users/{user_id('victim@x.io')}/suspend", data={"reason": "spam"})
    assert r.status_code == 303
    assert is_suspended("victim@x.io") == 1

    post("/logout")
    r = post("/login", data={"email": "victim@x.io", "password": "password123"})
    assert r.status_code == 403
    assert "suspended" in r.text.lower()


def test_suspension_ends_a_live_session(client, register, post):
    """Someone already signed in is kicked out on their next request."""
    register("live@x.io", "candidate")
    live_id = user_id("live@x.io")
    assert client.get("/candidate").status_code == 200

    # An admin suspends them from another session...
    register("admin2@x.io", "candidate")
    make_admin("admin2@x.io")
    post(f"/admin/users/{live_id}/suspend", data={"reason": "abuse"})
    post("/logout")

    # ...the victim's session no longer works.
    post("/login", data={"email": "live@x.io", "password": "password123"})
    r = client.get("/candidate", follow_redirects=False)
    assert r.headers["location"].startswith("/login")


def test_reinstate_restores_access(client, register, post):
    register("back@x.io", "candidate")
    post("/logout")
    register("admin3@x.io", "candidate")
    make_admin("admin3@x.io")
    uid = user_id("back@x.io")
    post(f"/admin/users/{uid}/suspend", data={"reason": "mistake"})
    post(f"/admin/users/{uid}/suspend")          # toggle back
    assert is_suspended("back@x.io") == 0
    post("/logout")
    assert post("/login", data={
        "email": "back@x.io", "password": "password123"}).status_code == 303


def test_admin_cannot_suspend_self_or_another_admin(client, register, post):
    register("admin4@x.io", "candidate")
    make_admin("admin4@x.io")
    post("/logout")
    register("admin5@x.io", "candidate")
    make_admin("admin5@x.io")

    r = post(f"/admin/users/{user_id('admin5@x.io')}/suspend")   # self
    assert "error=protected" in r.headers["location"]
    assert is_suspended("admin5@x.io") == 0

    r = post(f"/admin/users/{user_id('admin4@x.io')}/suspend")   # other admin
    assert "error=protected" in r.headers["location"]
    assert is_suspended("admin4@x.io") == 0


def test_suspended_employers_jobs_vanish_from_candidate_search(
    client, register, post, post_job
):
    register("badco@x.io", "employer", company_name="BadCo")
    post_job(title="Scam Role", required_skills="python")
    post("/logout")
    register("admin6@x.io", "candidate")
    make_admin("admin6@x.io")
    post(f"/admin/users/{user_id('badco@x.io')}/suspend", data={"reason": "fraud"})
    post("/logout")

    register("looker@x.io", "candidate")
    post("/candidate/profile", data={"headline": "", "skills": "python"})
    assert "Scam Role" not in client.get("/candidate").text


def test_suspended_candidate_drops_out_of_matches(client, register, post, post_job):
    register("ghost@x.io", "candidate", name="Ghost Cand")
    post("/candidate/profile", data={"headline": "", "skills": "python"})
    post("/logout")
    register("admin7@x.io", "candidate")
    make_admin("admin7@x.io")
    post(f"/admin/users/{user_id('ghost@x.io')}/suspend", data={"reason": "fake"})
    post("/logout")

    register("hiring@x.io", "employer", company_name="Hiring")
    post_job(title="Open Role", required_skills="python")
    assert "Ghost Cand" not in client.get("/employer/jobs/1/matches").text


# --------------------------------------------------------------------------- #
# Job takedown
# --------------------------------------------------------------------------- #
def test_admin_can_take_down_a_job(client, register, post, post_job):
    register("emp8@x.io", "employer", company_name="Emp8")
    post_job(title="Bad Posting", required_skills="python")
    post("/logout")
    register("admin8@x.io", "candidate")
    make_admin("admin8@x.io")

    r = post("/admin/jobs/1/takedown")
    assert r.status_code == 303
    assert "Closed" in client.get("/admin/jobs").text
    post("/logout")

    register("seeker8@x.io", "candidate")
    post("/candidate/profile", data={"headline": "", "skills": "python"})
    assert "Bad Posting" not in client.get("/candidate").text


def test_non_admin_cannot_take_down_a_job(client, register, post, post_job):
    register("emp9@x.io", "employer", company_name="Emp9")
    post_job(title="Legit Posting", required_skills="python")
    post("/logout")
    register("rando@x.io", "candidate")

    r = post("/admin/jobs/1/takedown")
    assert r.headers["location"] == "/candidate"
    post("/logout")
    post("/employer/login", data={"email": "emp9@x.io", "password": "password123"})
    assert "Active" in client.get("/employer").text


def test_admin_user_search_and_role_filter(client, register, post):
    register("findme@acme.io", "employer", company_name="FindCo")
    post("/logout")
    register("admin9@x.io", "candidate")
    make_admin("admin9@x.io")

    assert "findme@acme.io" in client.get("/admin/users?q=findme").text
    assert "findme@acme.io" not in client.get("/admin/users?q=nobodyhere").text
    assert "findme@acme.io" in client.get("/admin/users?role=employer").text
    assert "findme@acme.io" not in client.get("/admin/users?role=candidate").text
