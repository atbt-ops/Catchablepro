"""SQLite persistence layer.

Uses the stdlib ``sqlite3`` module so the database runs in-process (no network
hop), which keeps per-request latency low. One connection is opened per request
via :func:`get_db` and closed when the request finishes.
"""
from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Iterator

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
DB_PATH = DATA_DIR / "portal.db"

# Auto-apply covers every job the candidate shares at least one skill with.
# Anything above this threshold (as a percentage) is auto-applied to.
AUTO_APPLY_MIN_MATCH = 1  # percent; >0 means "at least one overlapping skill"

# Employers only see candidates whose profile matches a job by at least this %.
EMPLOYER_MATCH_THRESHOLD = 1  # percent


SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL CHECK (role IN ('employer', 'candidate')),
    name          TEXT    NOT NULL DEFAULT '',
    company_name  TEXT    NOT NULL DEFAULT '',
    phone         TEXT    NOT NULL DEFAULT '',
    designation   TEXT    NOT NULL DEFAULT '',
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS candidate_profiles (
    user_id          INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    headline         TEXT    NOT NULL DEFAULT '',
    skills           TEXT    NOT NULL DEFAULT '',
    resume_filename  TEXT    NOT NULL DEFAULT '',
    auto_apply       INTEGER NOT NULL DEFAULT 0,
    updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS company_profiles (
    user_id         INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    industry        TEXT NOT NULL DEFAULT '',
    size            TEXT NOT NULL DEFAULT '',
    website         TEXT NOT NULL DEFAULT '',
    about           TEXT NOT NULL DEFAULT '',
    hq_location     TEXT NOT NULL DEFAULT '',
    -- Onboarding wizard: 1 = company details, 2 = first job, 3 = complete
    onboarding_step INTEGER NOT NULL DEFAULT 1,
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS jobs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    employer_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           TEXT    NOT NULL,
    description     TEXT    NOT NULL DEFAULT '',
    required_skills TEXT    NOT NULL DEFAULT '',
    location        TEXT    NOT NULL DEFAULT '',
    -- Naukri-style posting details
    employment_type TEXT    NOT NULL DEFAULT 'Full-time',
    work_mode       TEXT    NOT NULL DEFAULT 'On-site',
    exp_min         INTEGER NOT NULL DEFAULT 0,
    exp_max         INTEGER NOT NULL DEFAULT 0,
    salary_min      REAL    NOT NULL DEFAULT 0,   -- LPA (lakhs per annum)
    salary_max      REAL    NOT NULL DEFAULT 0,   -- LPA
    hide_salary     INTEGER NOT NULL DEFAULT 0,
    vacancies       INTEGER NOT NULL DEFAULT 1,
    education       TEXT    NOT NULL DEFAULT '',
    department      TEXT    NOT NULL DEFAULT '',
    deadline        TEXT    NOT NULL DEFAULT '',
    status          TEXT    NOT NULL DEFAULT 'active',
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS applications (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id       INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    candidate_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    match_pct    INTEGER NOT NULL DEFAULT 0,
    source       TEXT    NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'auto')),
    status       TEXT    NOT NULL DEFAULT 'applied',
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (job_id, candidate_id)
);
"""


def _connect() -> sqlite3.Connection:
    # check_same_thread=False: async endpoints run on the event-loop thread while
    # the sync get_db dependency opens the connection in a worker thread. Each
    # request still gets its own connection, so there is no cross-thread sharing.
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


# Columns added after the first release. SQLite cannot change an existing
# table via CREATE TABLE IF NOT EXISTS, so they are added on startup instead.
_ADDED_COLUMNS = {
    "jobs": {
        "employment_type": "TEXT NOT NULL DEFAULT 'Full-time'",
        "work_mode": "TEXT NOT NULL DEFAULT 'On-site'",
        "exp_min": "INTEGER NOT NULL DEFAULT 0",
        "exp_max": "INTEGER NOT NULL DEFAULT 0",
        "salary_min": "REAL NOT NULL DEFAULT 0",
        "salary_max": "REAL NOT NULL DEFAULT 0",
        "hide_salary": "INTEGER NOT NULL DEFAULT 0",
        "vacancies": "INTEGER NOT NULL DEFAULT 1",
        "education": "TEXT NOT NULL DEFAULT ''",
        "department": "TEXT NOT NULL DEFAULT ''",
        "deadline": "TEXT NOT NULL DEFAULT ''",
        "status": "TEXT NOT NULL DEFAULT 'active'",
    },
    "users": {
        "phone": "TEXT NOT NULL DEFAULT ''",
        "designation": "TEXT NOT NULL DEFAULT ''",
    },
    "company_profiles": {
        "hq_location": "TEXT NOT NULL DEFAULT ''",
        "onboarding_step": "INTEGER NOT NULL DEFAULT 1",
    },
}


def _migrate(conn: sqlite3.Connection) -> None:
    """Add any columns introduced after a database was first created."""
    for table, columns in _ADDED_COLUMNS.items():
        existing = {row["name"] for row in conn.execute(f"PRAGMA table_info({table})")}
        for name, ddl in columns.items():
            if name in existing:
                continue
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}")
            if name == "onboarding_step":
                # Employers that predate the wizard have already set themselves
                # up — don't trap them in onboarding on their next login.
                conn.execute("UPDATE company_profiles SET onboarding_step = 3")


def init_db() -> None:
    """Create data dirs and tables if they do not yet exist, then migrate."""
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    conn = _connect()
    try:
        conn.executescript(SCHEMA)
        _migrate(conn)
        conn.commit()
    finally:
        conn.close()


def get_db() -> Iterator[sqlite3.Connection]:
    """FastAPI dependency: yield a request-scoped connection."""
    conn = _connect()
    try:
        yield conn
    finally:
        conn.close()
