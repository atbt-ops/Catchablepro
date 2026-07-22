"""Pagination: the Page helper plus the paginated list views."""
import pytest

from app.pagination import Page, paginate


# --------------------------------------------------------------------------- #
# Helper unit tests
# --------------------------------------------------------------------------- #
def test_page_counts_and_offsets():
    p = paginate(total=25, page=2, per_page=10)
    assert (p.pages, p.offset, p.first_item, p.last_item) == (3, 10, 11, 20)
    assert p.has_prev and p.has_next


def test_last_page_is_partial():
    p = paginate(total=25, page=3, per_page=10)
    assert p.last_item == 25
    assert p.has_next is False


def test_empty_result_still_has_one_page():
    p = paginate(total=0, page=1, per_page=10)
    assert p.pages == 1
    assert p.first_item == 0 and p.last_item == 0
    assert not p.has_prev and not p.has_next


@pytest.mark.parametrize("requested,expected", [
    (0, 1), (-5, 1), (99, 3), ("2", 2), ("abc", 1), (None, 1),
])
def test_out_of_range_pages_are_clamped(requested, expected):
    assert paginate(total=25, page=requested, per_page=10).page == expected


def test_slice_returns_only_that_page():
    items = list(range(1, 26))
    assert paginate(25, 1, 10).slice(items) == list(range(1, 11))
    assert paginate(25, 3, 10).slice(items) == list(range(21, 26))


def test_window_stays_within_bounds():
    assert paginate(100, 1, 10).window(2) == [1, 2, 3]
    assert paginate(100, 10, 10).window(2) == [8, 9, 10]
    assert paginate(100, 5, 10).window(2) == [3, 4, 5, 6, 7]


# --------------------------------------------------------------------------- #
# Paginated views
# --------------------------------------------------------------------------- #
def test_employer_job_list_paginates(client, register, post_job):
    register("many@x.io", "employer", company_name="ManyCo")
    for i in range(1, 13):                      # 12 jobs, 10 per page
        post_job(title=f"Role {i:02d}", required_skills="python")

    p1 = client.get("/employer").text
    assert "Role 12" in p1 and "Role 03" in p1  # newest first
    assert "Role 02" not in p1                  # pushed to page 2
    assert "of 12 jobs" in p1

    p2 = client.get("/employer?page=2").text
    assert "Role 02" in p2 and "Role 01" in p2
    assert "Role 12" not in p2


def test_out_of_range_page_clamps_instead_of_erroring(client, register, post_job):
    register("clamp@x.io", "employer", company_name="ClampCo")
    post_job(title="Only Role", required_skills="python")
    r = client.get("/employer?page=999")
    assert r.status_code == 200
    assert "Only Role" in r.text


def test_candidate_job_list_paginates_by_match_rank(client, register, post, post_job):
    register("bigemp@x.io", "employer", company_name="BigCo")
    # 12 jobs; one is a perfect match and must lead page 1.
    post_job(title="Perfect Fit", required_skills="python")
    for i in range(1, 12):
        post_job(title=f"Partial {i:02d}", required_skills="python, sql, aws, go")
    post("/logout")

    register("seeker9@x.io", "candidate")
    post("/candidate/profile", data={"headline": "", "skills": "python"})
    p1 = client.get("/candidate").text
    assert "Perfect Fit" in p1          # 100% match ranks first
    assert "of 12 jobs" in p1
    # 10 per page, so something is on page 2.
    assert client.get("/candidate?page=2").status_code == 200


def test_job_filter_survives_paging(client, register, post, post_job):
    register("filt@x.io", "employer", company_name="FiltCo")
    for i in range(12):
        post_job(title=f"Remote {i:02d}", required_skills="python", work_mode="Remote")
    post_job(title="Onsite One", required_skills="python", work_mode="On-site")
    post("/logout")
    register("fseek@x.io", "candidate")
    post("/candidate/profile", data={"headline": "", "skills": "python"})

    page2 = client.get("/candidate?work_mode=Remote&page=2").text
    assert "Onsite One" not in page2        # filter still applied on page 2
    assert "work_mode=Remote" in page2      # pager links keep the filter


def test_applicants_paginate_and_counts_cover_all_stages(
    client, register, post, post_job
):
    register("pemp@x.io", "employer", company_name="PEmp")
    post_job(title="Popular Role", required_skills="python")
    post("/logout")

    # 22 candidates apply (page size is 20).
    for i in range(22):
        register(f"appl{i:02d}@x.io", "candidate", name=f"Applicant {i:02d}")
        post("/candidate/profile", data={"headline": "", "skills": "python"})
        post("/candidate/apply/1")
        post("/logout")

    post("/employer/login", data={"email": "pemp@x.io", "password": "password123"})
    p1 = client.get("/employer/jobs/1/applicants").text
    assert "of 22 applicants" in p1
    p2 = client.get("/employer/jobs/1/applicants?page=2").text
    assert "of 22 applicants" in p2

    # Stage tallies count every applicant, not just the visible page.
    assert ">22</b><span>Applied" in p1.replace("\n", "").replace("  ", "")


def test_stage_filter_survives_paging(client, register, post, post_job):
    register("semp@x.io", "employer", company_name="SEmp")
    post_job(title="Stage Role", required_skills="python")
    post("/logout")
    register("scand@x.io", "candidate", name="Stage Cand")
    post("/candidate/profile", data={"headline": "", "skills": "python"})
    post("/candidate/apply/1")
    post("/logout")
    post("/employer/login", data={"email": "semp@x.io", "password": "password123"})
    post("/employer/applications/1/stage", data={"stage": "interview"})

    page = client.get("/employer/jobs/1/applicants?stage=interview").text
    assert "Stage Cand" in page
    assert "Stage Cand" not in client.get(
        "/employer/jobs/1/applicants?stage=rejected").text
