"""Semantic matching: aliases, related-skill credit, and typo tolerance."""
import pytest

from app.matching import match_detail, match_pct
from app.semantics import RELATED_SKILLS, canonical, score_skill


# --------------------------------------------------------------------------- #
# Canonicalisation / aliases
# --------------------------------------------------------------------------- #
@pytest.mark.parametrize("raw,expected", [
    ("JS", "javascript"), ("js", "javascript"),
    ("K8s", "kubernetes"), ("k8", "kubernetes"),
    ("Postgres", "postgresql"), ("postgre-sql", "postgresql"),
    ("NodeJS", "node.js"), ("node js", "node.js"), ("node-js", "node.js"),
    ("ReactJS", "react"),
    ("ML", "machine learning"),
    ("Golang", "go"),
    ("C Sharp", "c#"),
    ("scikit learn", "scikit-learn"),
    ("  Python  ", "python"),
    ("rest api", "rest"),
])
def test_aliases_resolve(raw, expected):
    assert canonical(raw) == expected


def test_alias_counts_as_a_full_match():
    # "k8s" on a CV must fully satisfy a "kubernetes" requirement.
    assert match_pct("k8s, docker", "kubernetes, docker") == 100
    assert match_pct("JS, TS", "javascript, typescript") == 100


# --------------------------------------------------------------------------- #
# Related skills (partial credit)
# --------------------------------------------------------------------------- #
def test_related_skill_earns_partial_credit():
    score, via, kind = score_skill({"react"}, "javascript")
    assert kind == "related"
    assert via == "react"
    assert 0 < score < 1


def test_related_graph_is_symmetric():
    assert "javascript" in RELATED_SKILLS["react"]
    assert "react" in RELATED_SKILLS["javascript"]


def test_react_developer_is_no_longer_a_zero_for_javascript():
    """The headline failure of pure keyword overlap."""
    assert match_pct("react", "javascript") > 0


def test_partial_credit_is_reported_with_its_source():
    pct, matched, partial, missing = match_detail("react", "javascript")
    assert matched == []
    assert missing == []
    assert len(partial) == 1
    assert partial[0]["skill"] == "javascript"
    assert partial[0]["via"] == "react"
    assert partial[0]["kind"] == "related"


def test_exact_beats_related():
    # Having javascript outright must score higher than only having react.
    assert match_pct("javascript", "javascript") > match_pct("react", "javascript")


def test_postgres_experience_counts_toward_sql():
    assert match_pct("postgresql", "sql") > 0


# --------------------------------------------------------------------------- #
# Typos / spacing
# --------------------------------------------------------------------------- #
def test_typo_still_matches():
    score, via, kind = score_skill({"kubernets"}, "kubernetes")
    assert kind == "fuzzy"
    assert score > 0.8


def test_short_tokens_do_not_fuzzy_match():
    # "go" and "r" must not bleed into other skills.
    assert score_skill({"go"}, "r")[0] == 0.0
    assert score_skill({"r"}, "go")[0] == 0.0


def test_unrelated_skills_still_score_zero():
    assert match_pct("java", "python") == 0
    assert match_pct("cooking, gardening", "python, sql") == 0


def test_java_does_not_fuzzy_match_javascript():
    """A classic false positive that must not happen."""
    score, _, _ = score_skill({"java"}, "javascript")
    assert score == 0.0


# --------------------------------------------------------------------------- #
# Backwards compatibility with plain keyword overlap
# --------------------------------------------------------------------------- #
def test_plain_overlap_scores_are_unchanged():
    # No aliases, related skills or typos involved -> same as before.
    assert match_pct("python, fastapi, sql, docker",
                     "python, fastapi, sql, docker, aws") == 80
    assert match_pct("python, sql", "python, sql") == 100
    assert match_pct("python", "") == 0


def test_ranking_prefers_the_stronger_candidate():
    job = "javascript, react, css"
    strong = match_pct("javascript, react, css", job)
    partial = match_pct("typescript, react", job)
    weak = match_pct("python", job)
    assert strong > partial > weak
