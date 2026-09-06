"""On-demand job pricing: the cost engine and its lifecycle wiring."""
import sqlite3
from datetime import datetime, timedelta, timezone

from app import db as dbmod, pricing


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #
def _since(days_ago: float) -> str:
    ts = datetime.now(timezone.utc) - timedelta(days=days_ago)
    return ts.strftime("%Y-%m-%d %H:%M:%S")


def _age_job(job_id: int, days_ago: float) -> None:
    """Pretend a job went live `days_ago` days ago (still active)."""
    conn = sqlite3.connect(dbmod.DB_PATH)
    conn.execute(
        "UPDATE jobs SET status = 'active', active_since = ? WHERE id = ?",
        (_since(days_ago), job_id),
    )
    conn.commit()
    conn.close()


def _job(job_id: int):
    conn = sqlite3.connect(dbmod.DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
    conn.close()
    return row


# --------------------------------------------------------------------------- #
# pure cost engine
# --------------------------------------------------------------------------- #
def test_first_week_is_free():
    for d in (0, 3, 6.9):
        s = pricing.cost_state(0, _since(d))
        assert s.is_free and s.accrued == 0 and s.daily_rate == 0


def test_rate_steps_up_each_week():
    assert pricing.cost_state(0, _since(7)).daily_rate == 50
    assert pricing.cost_state(0, _since(14)).daily_rate == 100
    assert pricing.cost_state(0, _since(21)).daily_rate == 200
    assert pricing.cost_state(0, _since(28)).daily_rate == 400


def test_accrued_cost_accumulates_by_tier():
    # 10 active days = 7 free + 3 days at ₹50.
    assert pricing.cost_state(0, _since(10)).accrued == 150
    # 14 days = 7 free + 7 at ₹50.
    assert pricing.cost_state(0, _since(14)).accrued == 350


def test_expires_at_the_cap():
    fresh = pricing.cost_state(0, _since(3))
    assert not fresh.expired
    old = pricing.cost_state(0, _since(pricing.CAP_DAYS + 2))
    assert old.expired
    assert old.accrued == pricing.total_at_cap() == 3250


def test_days_to_next_tier_and_cap():
    s = pricing.cost_state(0, _since(3))   # free week, 4 days until ₹50 tier
    assert s.next_rate == 50
    assert 3.9 < s.days_to_next < 4.1
    assert 26.9 < s.days_to_cap < 27.1


# --------------------------------------------------------------------------- #
# lifecycle wiring
# --------------------------------------------------------------------------- #
def test_publishing_starts_the_meter(client, register, post_job):
    register("mp@x.io", "employer", company_name="MP")
    post_job(title="Live Role", required_skills="python")   # published active
    assert _job(1)["active_since"] != ""


def test_draft_has_no_meter(client, register, post_job):
    register("md@x.io", "employer", company_name="MD")
    post_job(title="Draft Role", required_skills="python", action="draft")
    assert _job(1)["active_since"] == ""


def test_closing_stops_the_meter(client, register, post, post_job):
    register("mc@x.io", "employer", company_name="MC")
    post_job(title="Close Me", required_skills="python")
    _age_job(1, 10)
    post("/employer/jobs/1/status", data={"status": "closed"})
    row = _job(1)
    assert row["status"] == "closed"
    assert row["active_since"] == ""          # meter stopped


def test_reopening_starts_a_fresh_free_week(client, register, post, post_job):
    register("mr@x.io", "employer", company_name="MR")
    post_job(title="Reopen Me", required_skills="python")
    _age_job(1, 20)                            # deep in a paid tier
    post("/employer/jobs/1/status", data={"status": "closed"})
    post("/employer/jobs/1/status", data={"status": "active"})   # reopen
    row = _job(1)
    state = pricing.cost_state(row["billable_seconds"], row["active_since"])
    assert state.is_free                       # back to a free week, not re-charged


def test_dashboard_shows_the_running_cost(client, register, post_job):
    register("dm@x.io", "employer", company_name="DM")
    post_job(title="Costly Role", required_skills="python")
    _age_job(1, 10)                            # ₹150 accrued, ₹50/day
    page = client.get("/employer").text
    assert "₹150" in page
    assert "₹50/day" in page


def test_job_past_cap_is_auto_closed_on_dashboard_load(client, register, post_job):
    register("ax@x.io", "employer", company_name="AX")
    post_job(title="Ancient Role", required_skills="python")
    _age_job(1, pricing.CAP_DAYS + 3)         # past the cap
    client.get("/employer")                   # sweep runs on load
    assert _job(1)["status"] == "closed"


def test_auto_close_is_audited(client, register, post_job):
    register("ax2@x.io", "employer", company_name="AX2")
    post_job(title="Expired Role", required_skills="python")
    _age_job(1, pricing.CAP_DAYS + 1)
    client.get("/employer")
    conn = sqlite3.connect(dbmod.DB_PATH)
    n = conn.execute(
        "SELECT COUNT(*) FROM audit_log WHERE action = 'job.autoexpire'"
    ).fetchone()[0]
    conn.close()
    assert n == 1


def test_expired_job_leaves_candidate_search(client, register, post, post_job):
    register("emp@x.io", "employer", company_name="E")
    post_job(title="Stale Role", required_skills="python")
    _age_job(1, pricing.CAP_DAYS + 5)
    post("/logout")
    register("seek@x.io", "candidate")
    post("/candidate/profile", data={"headline": "", "skills": "python"})
    page = client.get("/candidate").text       # sweep runs here too
    assert "Stale Role" not in page
    assert _job(1)["status"] == "closed"


# --------------------------------------------------------------------------- #
# The sweep is throttled: bookkeeping must not be paid for on every render
# --------------------------------------------------------------------------- #
def test_sweep_does_not_run_on_every_page_load(client, register, post_job):
    """A second job aged past the cap waits for the interval, not the next click."""
    register("thr@x.io", "employer", company_name="THR")
    post_job(title="First Expired", required_skills="python")
    post_job(title="Second Expired", required_skills="python")

    _age_job(1, pricing.CAP_DAYS + 2)
    client.get("/employer")                    # sweeps, closing job 1
    assert _job(1)["status"] == "closed"

    _age_job(2, pricing.CAP_DAYS + 2)
    client.get("/employer")                    # throttled — no second sweep
    assert _job(2)["status"] == "active"


def test_forcing_the_sweep_ignores_the_throttle(client, register, post_job):
    from app import db as dbmod
    from app.main import sweep_expired_jobs

    register("frc@x.io", "employer", company_name="FRC")
    post_job(title="Forced", required_skills="python")
    client.get("/employer")                    # consumes the interval
    _age_job(1, pricing.CAP_DAYS + 2)

    session = dbmod.get_db()
    db = next(session)
    try:
        assert sweep_expired_jobs(db) == 0      # throttled
        assert sweep_expired_jobs(db, force=True) == 1
    finally:
        session.close()
    assert _job(1)["status"] == "closed"
