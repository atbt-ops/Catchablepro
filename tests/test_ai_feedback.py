"""Feedback capture, the employer AI assistant, and the admin feedback digest.

The Anthropic call is stubbed everywhere — the suite never touches the network.
"""
import json
import sqlite3
import types

import pytest

from app import ai
from app import db as dbmod


def make_admin(email: str) -> None:
    conn = sqlite3.connect(dbmod.DB_PATH)
    conn.execute("UPDATE users SET is_admin = 1 WHERE email = ?", (email,))
    conn.commit()
    conn.close()


class _FakeBlock:
    type = "text"

    def __init__(self, text: str):
        self.text = text


class _FakeResp:
    def __init__(self, payload: dict):
        self.content = [_FakeBlock(json.dumps(payload))]


def stub_ai(monkeypatch, payload: dict):
    """Point ai._client at a fake Anthropic client that returns `payload`."""
    monkeypatch.setattr(ai, "is_configured", lambda: True)

    class _Client:
        class messages:  # noqa: N801
            @staticmethod
            def create(**kwargs):
                return _FakeResp(payload)

    monkeypatch.setattr(ai, "_client", lambda: _Client())


# --------------------------------------------------------------------------- #
# Feedback
# --------------------------------------------------------------------------- #
def test_feedback_requires_login(client):
    assert client.get("/feedback", follow_redirects=False).headers["location"] == "/login"


def test_user_submits_feedback_and_sees_it(client, register, post):
    register("fbk@x.io", "candidate")
    r = post("/feedback", data={"category": "Feature request", "rating": "4",
                                "message": "Add email alerts for new matches."})
    assert r.status_code == 303 and r.headers["location"] == "/feedback?sent=1"

    page = client.get("/feedback").text
    assert "Add email alerts for new matches." in page


def test_feedback_rejects_a_too_short_message(client, register, post):
    register("fbk2@x.io", "candidate")
    r = post("/feedback", data={"category": "General", "message": "hi"})
    assert r.status_code == 400


def test_admin_sees_all_feedback_and_can_restatus(client, register, post):
    register("emp-fb@x.io", "employer", company_name="FBCo")
    post("/feedback", data={"category": "Bug / something broke",
                            "message": "Save button never updates live."})
    post("/logout")
    register("adm@x.io", "candidate")
    make_admin("adm@x.io")

    page = client.get("/admin/feedback").text
    assert "Save button never updates live." in page
    assert "emp-fb@x.io" in page  # shows who it came from

    post("/admin/feedback/1/status", data={"status": "actioned"})
    assert "Actioned" in client.get("/admin/feedback?status=actioned").text


# --------------------------------------------------------------------------- #
# Employer AI assistant
# --------------------------------------------------------------------------- #
def test_assistant_without_key_shows_a_notice(client, register):
    register("emp-ai@x.io", "employer", company_name="AICo")
    page = client.get("/employer/assistant").text
    assert "isn't configured" in page


def test_assistant_ranks_candidates_from_a_job_description(
    client, register, post, monkeypatch
):
    # Two candidates with different skill overlap.
    register("py-cand@x.io", "candidate", name="Pat")
    post("/candidate/profile", data={"headline": "Backend", "skills": "python,fastapi,postgres"})
    post("/logout")
    register("fe-cand@x.io", "candidate", name="Fran")
    post("/candidate/profile", data={"headline": "Frontend", "skills": "react,css"})
    post("/logout")
    register("emp-run@x.io", "employer", company_name="RunCo")

    stub_ai(monkeypatch, {
        "title": "Backend Engineer", "seniority": "Senior",
        "skills": ["python", "fastapi", "postgres"],
        "summary": "Own the API services.",
    })
    r = post("/employer/assistant", data={"job_description":
             "We need a senior backend engineer strong in Python, FastAPI and Postgres."})
    body = r.text
    assert "Backend Engineer" in body
    # Pat (3/3 skills) shows; Fran (0/3) is below threshold and absent.
    assert "Pat" in body and "Fran" not in body


def test_admin_feedback_digest_is_generated_and_shown(
    client, register, post, monkeypatch
):
    register("dg-emp@x.io", "employer", company_name="DGCo")
    post("/feedback", data={"category": "Matching quality",
                            "message": "The match percent feels too generous."})
    post("/logout")
    register("dg-adm@x.io", "candidate")
    make_admin("dg-adm@x.io")

    stub_ai(monkeypatch, {
        "overview": "Users mostly raise matching accuracy.",
        "themes": [{
            "title": "Match score too lenient",
            "summary": "Several users say low-overlap jobs still score high.",
            "severity": "medium", "confidence": "medium",
            "example_ids": [1],
            "suggested_fix": "Raise the partial-credit floor in matching.py.",
        }],
    })
    r = post("/admin/feedback/digest", data={})
    assert r.status_code == 303 and "flash=digest-ready" in r.headers["location"]

    page = client.get("/admin/feedback").text
    assert "Match score too lenient" in page
    assert "Raise the partial-credit floor" in page


def test_digest_prompt_injection_defense_is_in_the_system_prompt():
    # The feedback digest system prompt must tell the model to treat items as
    # untrusted data — feedback text is attacker-controllable.
    assert "UNTRUSTED" in ai._DIGEST_SYSTEM
    assert "never" in ai._DIGEST_SYSTEM.lower()
