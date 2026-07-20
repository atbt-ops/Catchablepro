"""Skill matching via keyword overlap.

match% = |candidate_skills ∩ required_skills| / |required_skills| * 100
"""
from __future__ import annotations

import re
from typing import Iterable, List, Set, Tuple

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


def match_pct(candidate_raw: str, required_raw: str) -> int:
    """Return the integer match percentage of a candidate against a job."""
    required = parse_skills(required_raw)
    if not required:
        return 0
    candidate = parse_skills(candidate_raw)
    overlap = candidate & required
    return round(len(overlap) / len(required) * 100)


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


def match_detail(candidate_raw: str, required_raw: str) -> Tuple[int, List[str], List[str]]:
    """Return (pct, matched_skills, missing_skills) sorted for display."""
    required = parse_skills(required_raw)
    candidate = parse_skills(candidate_raw)
    matched = sorted(candidate & required)
    missing = sorted(required - candidate)
    pct = 0 if not required else round(len(matched) / len(required) * 100)
    return pct, matched, missing
