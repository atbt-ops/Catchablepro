"""robots.txt, sitemap.xml, and the per-page meta tags / JSON-LD they support."""
import json
import re
import sqlite3

from app import db as dbmod


def _latest_job_id() -> int:
    conn = sqlite3.connect(dbmod.DB_PATH)
    row = conn.execute("SELECT MAX(id) FROM jobs").fetchone()
    conn.close()
    return row[0]


# --------------------------------------------------------------------------- #
# robots.txt / sitemap.xml
# --------------------------------------------------------------------------- #
def test_robots_txt_points_at_the_sitemap_and_hides_private_paths(client):
    body = client.get("/robots.txt").text

    assert "Sitemap: " in body and "/sitemap.xml" in body
    assert "Disallow: /candidate" in body
    assert "Disallow: /employer" in body
    assert "Disallow: /admin" in body
    assert "Disallow: /account" in body


def test_sitemap_lists_static_pages_and_active_jobs(client, register, post_job):
    register("seo-emp@x.io", "employer", company_name="SeoCo")
    post_job(title="Sitemap Role", required_skills="python")
    job_id = _latest_job_id()

    resp = client.get("/sitemap.xml")
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("application/xml")

    body = resp.text
    assert "<loc>http://testserver/</loc>" in body
    assert "<loc>http://testserver/jobs</loc>" in body
    assert f"<loc>http://testserver/jobs/{job_id}</loc>" in body


def test_sitemap_omits_a_withdrawn_job(client, register, post_job, post):
    register("seo-emp2@x.io", "employer", company_name="SeoCo2")
    post_job(title="Withdrawn Role", required_skills="python")
    job_id = _latest_job_id()
    post(f"/employer/jobs/{job_id}/status", data={"status": "closed"})

    body = client.get("/sitemap.xml").text
    assert f"/jobs/{job_id}</loc>" not in body


# --------------------------------------------------------------------------- #
# <head> meta: public pages opt into indexing, everything else stays noindex
# --------------------------------------------------------------------------- #
def test_default_pages_stay_noindex(client):
    body = client.get("/login").text
    assert 'name="robots" content="noindex, nofollow"' in body


def test_home_jobs_and_about_are_indexable(client, register, post_job):
    register("seo-emp3@x.io", "employer", company_name="SeoCo3")
    post_job(title="Indexable Role", required_skills="python")

    for path in ("/", "/jobs", "/about"):
        body = client.get(path).text
        assert 'name="robots" content="index, follow"' in body, path
        assert '<link rel="canonical" href="http://testserver' in body, path


def test_job_detail_is_indexable_and_carries_jsonld(client, register, post_job):
    register("seo-emp4@x.io", "employer", company_name="SeoCo4")
    post_job(title="Rich Result Role", required_skills="python,sql",
              salary_min=10, salary_max=18, location="Pune")
    job_id = _latest_job_id()

    body = client.get(f"/jobs/{job_id}").text
    assert 'name="robots" content="index, follow"' in body

    m = re.search(
        r'<script type="application/ld\+json">(.*?)</script>', body, re.S
    )
    assert m, "expected a JobPosting JSON-LD block"
    data = json.loads(m.group(1))
    assert data["@type"] == "JobPosting"
    assert data["title"] == "Rich Result Role"
    assert data["hiringOrganization"]["name"] == "SeoCo4"
    assert data["employmentType"] == "FULL_TIME"
    assert data["baseSalary"]["value"]["minValue"] == 1_000_000


def test_missing_job_detail_stays_noindex_with_no_jsonld(client):
    body = client.get("/jobs/999999").text
    assert 'name="robots" content="noindex, nofollow"' in body
    assert "application/ld+json" not in body
