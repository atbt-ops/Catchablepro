"""Employer logo upload: bounded by type/size, public, shown on job listings."""
import sqlite3

from app import db as dbmod
from app.main import MAX_LOGO_BYTES


def _company_row(email: str):
    conn = sqlite3.connect(dbmod.DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute(
        "SELECT c.* FROM company_profiles c JOIN users u ON u.id = c.user_id "
        "WHERE u.email = ?",
        (email,),
    ).fetchone()
    conn.close()
    return row


def _job_id() -> int:
    conn = sqlite3.connect(dbmod.DB_PATH)
    row = conn.execute("SELECT MAX(id) FROM jobs").fetchone()
    conn.close()
    return row[0]


def test_uploading_a_logo_serves_it_publicly(client, register, post, post_job):
    register("logo-emp@x.io", "employer", company_name="LogoCo")
    post_job(title="Logo Role", required_skills="python")

    resp = post(
        "/employer/company",
        data={"company_name": "LogoCo"},
        files={"logo": ("mark.png", b"\x89PNG fake bytes", "image/png")},
    )
    assert resp.status_code == 303 and resp.headers["location"] == "/employer"

    row = _company_row("logo-emp@x.io")
    assert row["logo_filename"] == f"logo_{row['user_id']}.png"

    logo_resp = client.get(f"/company/{row['user_id']}/logo")
    assert logo_resp.status_code == 200
    assert logo_resp.headers["content-type"] == "image/png"
    assert logo_resp.content == b"\x89PNG fake bytes"


def test_logo_of_a_non_uploading_employer_404s(client, register, post_job):
    register_result = register("nologo-emp@x.io", "employer", company_name="NoLogoCo")
    assert register_result.status_code == 303

    row = _company_row("nologo-emp@x.io")
    assert client.get(f"/company/{row['user_id']}/logo").status_code == 404


def test_a_disallowed_file_type_is_refused(post, register):
    register("badlogo-emp@x.io", "employer", company_name="BadCo")

    resp = post(
        "/employer/company",
        data={"company_name": "BadCo"},
        files={"logo": ("mark.svg", b"<svg onload=alert(1)>", "image/svg+xml")},
    )

    assert resp.status_code == 303
    assert resp.headers["location"] == "/employer?logo_error=type#company"
    assert _company_row("badlogo-emp@x.io")["logo_filename"] == ""


def test_an_oversized_logo_is_refused(post, register):
    register("biglogo-emp@x.io", "employer", company_name="BigCo")
    oversized = b"x" * (MAX_LOGO_BYTES + 1024)

    resp = post(
        "/employer/company",
        data={"company_name": "BigCo"},
        files={"logo": ("mark.png", oversized, "image/png")},
    )

    assert resp.status_code == 303
    assert resp.headers["location"] == "/employer?logo_error=size#company"
    assert _company_row("biglogo-emp@x.io")["logo_filename"] == ""


def test_removing_a_logo_clears_it_and_frees_the_file(client, post, register):
    register("removelogo-emp@x.io", "employer", company_name="RemoveCo")
    post(
        "/employer/company",
        data={"company_name": "RemoveCo"},
        files={"logo": ("mark.png", b"pngbytes", "image/png")},
    )
    row = _company_row("removelogo-emp@x.io")
    assert row["logo_filename"]

    post("/employer/company", data={"company_name": "RemoveCo", "remove_logo": "1"})

    assert _company_row("removelogo-emp@x.io")["logo_filename"] == ""
    assert client.get(f"/company/{row['user_id']}/logo").status_code == 404


def test_job_listing_and_detail_pages_render_the_uploaded_logo(
    client, register, post, post_job
):
    register("visible-emp@x.io", "employer", company_name="VisibleCo")
    post_job(title="Visible Role", required_skills="python")
    post(
        "/employer/company",
        data={"company_name": "VisibleCo"},
        files={"logo": ("mark.png", b"pngbytes", "image/png")},
    )
    job_id = _job_id()
    post("/logout")

    for path in ("/", "/jobs", f"/jobs/{job_id}"):
        body = client.get(path).text
        assert "/logo" in body, path
        assert "VisibleCo" in body


def test_job_listing_falls_back_to_initials_without_a_logo(
    client, register, post_job, post
):
    register("initials-emp@x.io", "employer", company_name="InitialsCo")
    post_job(title="Initials Role", required_skills="python")
    post("/logout")

    body = client.get("/jobs").text
    assert "/logo" not in body
    assert "InitialsCo" in body
    assert 'class="jcard-logo"' in body
