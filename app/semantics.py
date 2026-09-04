"""Semantic skill knowledge: aliases, related-skill edges, and fuzzy matching.

Exact string overlap misses obvious equivalences — a React developer scores zero
against a "JavaScript" requirement, "k8s" never matches "kubernetes", and a typo
loses the skill entirely. This module supplies the meaning that makes matching
behave the way a recruiter would read a CV.

It is deliberately in-process and deterministic: matching runs for every
candidate x job pair on every page render, so it has to be microsecond-fast,
free, and offline. Everything here is plain data plus difflib.
"""
from __future__ import annotations

import re
from difflib import SequenceMatcher
from functools import lru_cache
from typing import Dict, Optional, Set, Tuple

# --------------------------------------------------------------------------- #
# Aliases: different spellings of the *same* skill. Score 1.0 when matched.
# --------------------------------------------------------------------------- #
SKILL_ALIASES: Dict[str, str] = {
    # languages
    "js": "javascript", "ecmascript": "javascript",
    "ts": "typescript",
    "py": "python", "python3": "python",
    "golang": "go",
    "csharp": "c#", "c sharp": "c#",
    "cpp": "c++", "c plus plus": "c++",
    "dotnet": ".net", ".net core": ".net", "asp.net": ".net",
    # front end
    "reactjs": "react", "react.js": "react", "react js": "react",
    "vuejs": "vue", "vue.js": "vue",
    "angularjs": "angular", "angular.js": "angular",
    "nextjs": "next.js", "next js": "next.js",
    "nodejs": "node.js", "node": "node.js", "node js": "node.js",
    # data stores
    "postgres": "postgresql", "psql": "postgresql", "postgre sql": "postgresql",
    "mongo": "mongodb",
    "elastic search": "elasticsearch", "elastic": "elasticsearch",
    # cloud / infra
    "k8s": "kubernetes", "k8": "kubernetes",
    "amazon web services": "aws",
    "google cloud": "gcp", "google cloud platform": "gcp",
    "microsoft azure": "azure",
    "ci cd": "ci/cd", "cicd": "ci/cd", "continuous integration": "ci/cd",
    "infrastructure as code": "terraform",
    # data / ml
    "ml": "machine learning",
    "dl": "deep learning",
    "natural language processing": "nlp",
    "scikit learn": "scikit-learn", "sklearn": "scikit-learn",
    "tensor flow": "tensorflow",
    "py torch": "pytorch",
    "data analytics": "data analysis",
    # misc
    "restful": "rest", "rest api": "rest", "restful api": "rest",
    "structured query language": "sql",
}

# --------------------------------------------------------------------------- #
# Related skills: strong evidence for, but not identical to, another skill.
# Weight = credit awarded toward the required skill (0..1). Edges are made
# symmetric at import time.
# --------------------------------------------------------------------------- #
_RELATED_SEED: Dict[str, Dict[str, float]] = {
    "typescript": {"javascript": 0.8},
    "react": {"javascript": 0.6, "html": 0.4, "css": 0.4},
    "vue": {"javascript": 0.6}, "angular": {"javascript": 0.6},
    "svelte": {"javascript": 0.6}, "next.js": {"react": 0.7, "javascript": 0.5},
    "node.js": {"javascript": 0.7}, "express": {"node.js": 0.7},
    "fastapi": {"python": 0.7, "rest": 0.5},
    "django": {"python": 0.7}, "flask": {"python": 0.7},
    "pandas": {"python": 0.6, "data analysis": 0.7},
    "numpy": {"python": 0.6}, "scikit-learn": {"machine learning": 0.8, "python": 0.5},
    "pytorch": {"machine learning": 0.7, "deep learning": 0.8, "python": 0.5},
    "tensorflow": {"machine learning": 0.7, "deep learning": 0.8, "python": 0.5},
    "nlp": {"machine learning": 0.6},
    "spring": {"java": 0.7}, "rails": {"ruby": 0.7}, "laravel": {"php": 0.7},
    "postgresql": {"sql": 0.8}, "mysql": {"sql": 0.8}, "sqlite": {"sql": 0.7},
    "mongodb": {"nosql": 0.8}, "redis": {"nosql": 0.5},
    "kubernetes": {"docker": 0.6, "devops": 0.7},
    "docker": {"devops": 0.6},
    "terraform": {"devops": 0.6, "aws": 0.35},
    "ansible": {"devops": 0.6}, "jenkins": {"ci/cd": 0.7, "devops": 0.5},
    "ci/cd": {"devops": 0.7},
    "aws": {"cloud": 0.8}, "azure": {"cloud": 0.8}, "gcp": {"cloud": 0.8},
    "spark": {"hadoop": 0.6, "big data": 0.7},
    "airflow": {"data engineering": 0.7}, "kafka": {"microservices": 0.4},
    "graphql": {"rest": 0.4, "api": 0.7}, "rest": {"api": 0.8},
    "css": {"html": 0.6}, "bash": {"linux": 0.6}, "shell": {"bash": 0.9},
    "grpc": {"microservices": 0.5, "api": 0.6},
}


def _build_related() -> Dict[str, Dict[str, float]]:
    """Expand the seed into a symmetric graph (react→javascript and back)."""
    graph: Dict[str, Dict[str, float]] = {}
    for src, edges in _RELATED_SEED.items():
        for dst, weight in edges.items():
            graph.setdefault(src, {})[dst] = max(graph.get(src, {}).get(dst, 0), weight)
            graph.setdefault(dst, {})[src] = max(graph.get(dst, {}).get(src, 0), weight)
    return graph


RELATED_SKILLS = _build_related()

# A near-identical string is treated as a typo/spacing variant.
FUZZY_THRESHOLD = 0.86
FUZZY_CREDIT = 0.9      # slightly below an exact match
FUZZY_MIN_LENGTH = 5    # short tokens fuzz into each other too easily

_PUNCT = re.compile(r"[\s_\-]+")


@lru_cache(maxsize=2048)
def canonical(skill: str) -> str:
    """Normalize a skill and resolve it through the alias table.

    Memoized too: score_skill canonicalizes every candidate skill for every
    required skill, so the same handful of strings are normalized over and over
    within a single page render. Pure — the alias table is built at import.
    """
    s = skill.strip().lower()
    if not s:
        return ""
    s = _PUNCT.sub(" ", s).strip()
    if s in SKILL_ALIASES:
        return SKILL_ALIASES[s]
    # Retry without separators, so "node-js" and "node js" both land on node.js.
    compact = s.replace(" ", "")
    if compact in SKILL_ALIASES:
        return SKILL_ALIASES[compact]
    return s


def _fuzzy(a: str, b: str) -> float:
    if len(a) < FUZZY_MIN_LENGTH or len(b) < FUZZY_MIN_LENGTH:
        return 0.0
    return SequenceMatcher(None, a, b).ratio()


def score_skill(
    have: Set[str], want: str
) -> Tuple[float, Optional[str], str]:
    """Score how well the skills in ``have`` satisfy the requirement ``want``.

    Returns ``(score, matched_skill, kind)`` where kind is one of
    ``exact`` | ``related`` | ``fuzzy`` | ``none``.
    """
    want_c = canonical(want)
    if not want_c:
        return 0.0, None, "none"

    have_c = {canonical(h): h for h in have if h.strip()}
    if want_c in have_c:
        return 1.0, have_c[want_c], "exact"

    best = (0.0, None, "none")

    # Related skills: partial credit from the knowledge graph.
    neighbours = RELATED_SKILLS.get(want_c, {})
    for cand_c, original in have_c.items():
        weight = neighbours.get(cand_c)
        if weight and weight > best[0]:
            best = (weight, original, "related")

    # Typos and spacing variants.
    for cand_c, original in have_c.items():
        ratio = _fuzzy(cand_c, want_c)
        if ratio >= FUZZY_THRESHOLD:
            score = FUZZY_CREDIT * ratio
            if score > best[0]:
                best = (score, original, "fuzzy")

    return best
