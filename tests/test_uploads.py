"""Resume uploads are bounded in size and restricted by type."""
import sqlite3

from app import db as dbmod
from app.main import MAX_RESUME_BYTES


def _profile_row(email: str):
    conn = sqlite3.connect(dbmod.DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute(
        "SELECT p.* FROM candidate_profiles p JOIN users u ON u.id = p.user_id "
        "WHERE u.email = ?",
        (email,),
    ).fetchone()
    conn.close()
    return row


def test_small_resume_is_accepted(post, register):
    register("cand@x.com", "candidate")

    resp = post(
        "/candidate/profile",
        data={"headline": "Dev", "skills": "python"},
        files={"resume": ("cv.txt", b"python and sql", "text/plain")},
    )

    assert resp.status_code == 303
    assert resp.headers["location"] == "/candidate"
    assert _profile_row("cand@x.com")["resume_filename"].endswith(".txt")


def test_oversized_resume_is_refused(post, register):
    register("cand@x.com", "candidate")
    oversized = b"x" * (MAX_RESUME_BYTES + 1024)

    resp = post(
        "/candidate/profile",
        data={"headline": "Dev", "skills": "python"},
        files={"resume": ("cv.txt", oversized, "text/plain")},
    )

    assert resp.status_code == 303
    assert resp.headers["location"] == "/candidate?resume_error=size"
    assert _profile_row("cand@x.com")["resume_filename"] == ""


def test_refused_upload_leaves_no_partial_file(post, register):
    register("cand@x.com", "candidate")

    post(
        "/candidate/profile",
        data={"headline": "Dev", "skills": "python"},
        files={"resume": ("cv.txt", b"x" * (MAX_RESUME_BYTES + 1), "text/plain")},
    )

    assert list(dbmod.UPLOAD_DIR.glob("*.part")) == []
    assert list(dbmod.UPLOAD_DIR.glob("resume_*")) == []


def test_disallowed_extension_is_refused(post, register):
    register("cand@x.com", "candidate")

    resp = post(
        "/candidate/profile",
        data={"headline": "Dev", "skills": "python"},
        files={"resume": ("payload.exe", b"MZ...", "application/octet-stream")},
    )

    assert resp.status_code == 303
    assert resp.headers["location"] == "/candidate?resume_error=type"
    assert list(dbmod.UPLOAD_DIR.glob("resume_*")) == []


def test_refusal_keeps_the_previous_resume(post, register):
    register("cand@x.com", "candidate")
    post(
        "/candidate/profile",
        data={"headline": "Dev", "skills": "python"},
        files={"resume": ("cv.txt", b"python developer", "text/plain")},
    )
    kept = _profile_row("cand@x.com")["resume_filename"]

    post(
        "/candidate/profile",
        data={"headline": "Dev", "skills": "python"},
        files={"resume": ("cv.txt", b"y" * (MAX_RESUME_BYTES + 1), "text/plain")},
    )

    assert _profile_row("cand@x.com")["resume_filename"] == kept
    assert (dbmod.UPLOAD_DIR / kept).read_bytes() == b"python developer"


def test_size_refusal_is_explained_on_the_dashboard(client, post, register):
    register("cand@x.com", "candidate")

    body = client.get("/candidate?resume_error=size").text

    assert "over 5" in body and "MB" in body
