"""Unit tests for the skill-matching logic (pure functions, no DB)."""
from app.matching import parse_skills, match_pct, match_detail, extract_skills


def test_parse_skills_normalizes():
    assert parse_skills("Python, FastAPI ,, sql\nDocker") == {
        "python", "fastapi", "sql", "docker"
    }
    assert parse_skills("") == set()


def test_match_pct_basic():
    # candidate has 4 of the 5 required skills -> 80%
    assert match_pct("python, fastapi, sql, docker", "python, fastapi, sql, docker, aws") == 80


def test_match_pct_no_required_is_zero():
    assert match_pct("python", "") == 0


def test_match_pct_full_and_none():
    assert match_pct("python, sql", "python, sql") == 100
    assert match_pct("java", "python, sql") == 0


def test_match_detail_splits_matched_and_missing():
    pct, matched, missing = match_detail("python, docker", "python, sql, docker, aws")
    assert pct == 50
    assert matched == ["docker", "python"]
    assert missing == ["aws", "sql"]


def test_extract_skills_detects_from_text():
    text = "Built APIs in Python and FastAPI, deployed with Docker and Kubernetes on AWS."
    found = extract_skills(text)
    assert {"python", "fastapi", "docker", "kubernetes", "aws"} <= found


def test_extract_skills_handles_special_chars():
    found = extract_skills("Strong in C++, Node.js and machine learning with PyTorch.")
    assert {"c++", "node.js", "machine learning", "pytorch"} <= found


def test_extract_skills_no_false_single_letter():
    # "r" and "c" must not fire inside other words
    found = extract_skills("I work with react and css every day")
    assert "r" not in found
    assert "c" not in found
    assert {"react", "css"} <= found


def test_extract_skills_uses_extra_vocab():
    found = extract_skills("Experienced with Snowflake data warehousing", {"snowflake"})
    assert "snowflake" in found
