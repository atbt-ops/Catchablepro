"""Semantic skill matching.

Each required skill is scored 0..1 against the candidate's skills — exact and
alias hits score 1.0, related skills earn partial credit from a knowledge graph
(React counts toward JavaScript), and near-identical strings survive typos.

    match% = sum(best score per required skill) / |required skills| * 100

With no aliases, related skills or typos in play this reduces to the original
keyword overlap, so existing scores are unchanged.
"""
from __future__ import annotations

import re
from functools import lru_cache
from typing import Dict, Iterable, List, Set, Tuple

from .semantics import canonical, score_skill

# A base vocabulary of common skills used to auto-detect skills in resume text.
# It is combined at runtime with every skill employers actually require, so the
# detector always recognizes the skills that matter for current job postings.
BASE_SKILL_VOCAB: Set[str] = {
    "python", "java", "javascript", "typescript", "go", "golang", "rust", "c",
    "c++", "c#", ".net", "ruby", "php", "scala", "kotlin", "swift", "r",
    "html", "css", "sql", "nosql", "bash", "shell", "powershell",
    "react", "angular", "vue", "svelte", "next.js", "node.js", "express",
    "django", "flask", "fastapi", "spring", "rails", "laravel",
    "postgresql", "postgres", "mysql", "sqlite", "mongodb", "redis",
    "elasticsearch", "kafka", "rabbitmq", "spark", "hadoop", "airflow",
    "docker", "kubernetes", "terraform", "ansible", "jenkins", "git",
    "aws", "azure", "gcp", "linux", "nginx", "graphql", "rest", "grpc",
    "machine learning", "deep learning", "nlp", "tensorflow", "pytorch",
    "pandas", "numpy", "data analysis", "ci/cd", "devops", "microservices",
}


def parse_skills(raw: str) -> Set[str]:
    """Split a comma/newline separated string into a normalized skill set."""
    if not raw:
        return set()
    parts = raw.replace("\n", ",").split(",")
    return {p.strip().lower() for p in parts if p.strip()}


#: How many (candidate skills, required skills) pairs to remember. Both sides
#: are short strings and the value is a small tuple, so this costs little; the
#: bound is what stops a stream of distinct skill sets growing it without end.
_SCORE_CACHE_SIZE = 4096


@lru_cache(maxsize=_SCORE_CACHE_SIZE)
def _score_all(candidate_raw: str, required_raw: str) -> Tuple[Tuple, ...]:
    """Score every required skill against the candidate's skill set.

    Memoized, because a dashboard scores one candidate against every active job
    on every render, and those pairs repeat constantly — the same person
    reloading, paging, or filtering re-asks exactly the same questions. The
    function is a pure function of its two strings: the alias and related-skill
    tables it consults are built once at import and never mutate, and an edited
    profile arrives as a different string, so there is nothing to invalidate.

    Returns a tuple rather than a list so a caller cannot mutate what the cache
    handed back and poison later hits.
    """
    required = parse_skills(required_raw)
    candidate = parse_skills(candidate_raw)
    results = []
    for want in sorted(required):
        score, via, kind = score_skill(candidate, want)
        results.append((want, score, via, kind))
    return tuple(results)


def match_pct(candidate_raw: str, required_raw: str) -> int:
    """Return the integer match percentage of a candidate against a job."""
    results = _score_all(candidate_raw, required_raw)
    if not results:
        return 0
    total = sum(score for _, score, _, _ in results)
    return round(total / len(results) * 100)


def extract_skills(text: str, extra_vocab: Iterable[str] = ()) -> Set[str]:
    """Detect known skills mentioned anywhere in ``text``.

    The vocabulary is the base list plus any extra skills passed in (e.g. every
    skill required by currently-posted jobs). Matching is whole-token so "r"
    won't fire inside "react" and "c" won't fire inside "css".
    """
    if not text:
        return set()
    text_l = text.lower()
    vocab = BASE_SKILL_VOCAB | {s.strip().lower() for s in extra_vocab if s.strip()}
    found: Set[str] = set()
    for skill in vocab:
        # Boundaries reject adjacent alphanumerics so multi-char skills like
        # "c++" / "node.js" still match while single letters stay standalone.
        pattern = rf"(?<![a-z0-9+#.]){re.escape(skill)}(?![a-z0-9+#])"
        if re.search(pattern, text_l):
            found.add(skill)
    return found


def match_detail(
    candidate_raw: str, required_raw: str
) -> Tuple[int, List[str], List[Dict[str, str]], List[str]]:
    """Return ``(pct, matched, partial, missing)`` for display.

    ``matched`` are required skills the candidate has outright. ``partial`` are
    dicts of ``{skill, via, kind}`` explaining where the partial credit came
    from (e.g. javascript via react). ``missing`` are unmet requirements.
    """
    results = _score_all(candidate_raw, required_raw)
    if not results:
        return 0, [], [], []

    matched: List[str] = []
    partial: List[Dict[str, str]] = []
    missing: List[str] = []
    for want, score, via, kind in results:
        if score >= 1.0:
            matched.append(want)
        elif score > 0:
            partial.append({"skill": want, "via": via or "", "kind": kind,
                            "pct": str(round(score * 100))})
        else:
            missing.append(want)

    total = sum(score for _, score, _, _ in results)
    return round(total / len(results) * 100), matched, partial, missing
