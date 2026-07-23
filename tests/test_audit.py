"""Audit log: records are written for moderation actions and shown to admins."""
import sqlite3

from app import db as dbmod
from tests.test_admin import make_admin, user_id


def _audit_rows(action: str = ""):
    conn = sqlite3.connect(dbmod.DB_PATH)
    conn.row_factory = sqlite3.Row
    sql = "SELECT * FROM audit_log"
    params = ()
    if action:
        sql += " WHERE action = ?"
        params = (action,)
    sql += " ORDER BY id"
    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return rows


def test_suspend_and_reinstate_are_logged(client, register, post):
    register("target@x.io", "candidate")
    post("/logout")
    register("mod@x.io", "candidate")
    make_admin("mod@x.io")
    uid = user_id("target@x.io")

    post(f"/admin/users/{uid}/suspend", data={"reason": "spamming"})
    post(f"/admin/users/{uid}/suspend")   # reinstate

    rows = _audit_rows()
    actions = [r["action"] for r in rows]
    assert "user.suspend" in actions
    assert "user.reinstate" in actions

    suspend = next(r for r in rows if r["action"] == "user.suspend")
    assert suspend["actor_email"] == "mod@x.io"       # who acted
    assert suspend["target_label"] == "target@x.io"   # snapshot of the target
    assert suspend["detail"] == "spamming"            # reason captured


def test_job_takedown_is_logged(client, register, post, post_job):
    register("emp@x.io", "employer", company_name="Emp")
    post_job(title="Dodgy Role", required_skills="python")
    post("/logout")
    register("mod2@x.io", "candidate")
    make_admin("mod2@x.io")

    post("/admin/jobs/1/takedown")
    rows = _audit_rows("job.takedown")
    assert len(rows) == 1
    assert rows[0]["target_label"] == "Dodgy Role"
    assert rows[0]["actor_email"] == "mod2@x.io"


def test_failed_actions_are_not_logged(client, register, post):
    """Protected targets are refused, so nothing should be recorded."""
    register("admin_a@x.io", "candidate")
    make_admin("admin_a@x.io")

    # Suspending self is refused.
    post(f"/admin/users/{user_id('admin_a@x.io')}/suspend")
    assert _audit_rows() == []


def test_non_admin_cannot_view_audit_log(client, register):
    register("nobody@x.io", "candidate")
    r = client.get("/admin/audit", follow_redirects=False)
    assert r.headers["location"] == "/candidate"


def test_audit_page_lists_and_filters_entries(client, register, post):
    register("v1@x.io", "candidate")
    post("/logout")
    register("emp3@x.io", "employer", company_name="E3")
    post("/logout")
    register("mod3@x.io", "candidate")
    make_admin("mod3@x.io")

    post(f"/admin/users/{user_id('v1@x.io')}/suspend", data={"reason": "test"})

    page = client.get("/admin/audit").text
    assert "Account suspended" in page
    assert "v1@x.io" in page

    # Filtering by a different action hides it.
    filtered = client.get("/admin/audit?action=job.takedown").text
    assert "v1@x.io" not in filtered


def test_actor_snapshot_survives_target_deletion(client, register, post):
    """The log keeps the target's email even if the account row is removed."""
    register("gone@x.io", "candidate")
    post("/logout")
    register("mod4@x.io", "candidate")
    make_admin("mod4@x.io")
    uid = user_id("gone@x.io")
    post(f"/admin/users/{uid}/suspend", data={"reason": "bye"})

    # Hard-delete the target account.
    conn = sqlite3.connect(dbmod.DB_PATH)
    conn.execute("DELETE FROM users WHERE id = ?", (uid,))
    conn.commit()
    conn.close()

    row = _audit_rows("user.suspend")[0]
    assert row["target_label"] == "gone@x.io"   # snapshot intact
    # actor_id/target_id may be nulled by ON DELETE, but the labels remain.
