#!/usr/bin/env python3
"""Find the ceiling before your users do.

Drives the running app with N concurrent signed-in users and reports the
numbers you cannot guess: requests per second, p50/p95/p99 latency, and the
share that failed. Uses httpx and asyncio, both already dependencies, so there
is nothing extra to install.

    # 1. Generate enough data that matching actually costs something
    python scripts/loadtest.py --generate --jobs 100 --candidates 200

    # 2. Start the app in another shell
    python -m uvicorn app.main:app --port 8000

    # 3. Drive it
    python scripts/loadtest.py --users 20 --duration 30

Each virtual user signs in as its own generated account, because logins are
rate-limited per email — several users sharing one account measures the rate
limiter instead of the app.

Point it at a scratch database, never production: --generate writes rows, and
the load phase logs in as a real account.

Why the candidate dashboard is the default target: it ranks every active job
against the signed-in candidate's skills on every render, so its cost grows
with the product of jobs and candidates. If anything falls over first, it is
this.
"""
from __future__ import annotations

import argparse
import asyncio
import random
import re
import statistics
import sys
import time
from collections import Counter
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

CSRF_RE = re.compile(r'name="csrf_token" value="([^"]+)"')

#: Each virtual user signs in as a different account. Logins are rate-limited
#: per email, so pointing N users at one account measures the rate limiter
#: rather than the app. --generate creates these.
DEFAULT_EMAIL_PATTERN = "load-candidate-{n}@example.com"
DEFAULT_PASSWORD = "password123"

#: Default mix. The dashboard is the expensive page; the others are cheap and
#: keep the profile from being one endpoint pretending to be a workload.
DEFAULT_TARGETS = ["/candidate", "/candidate", "/candidate", "/account", "/healthz"]


# --------------------------------------------------------------------------- #
# Data generation
# --------------------------------------------------------------------------- #
SKILL_POOL = [
    "python", "sql", "docker", "kubernetes", "aws", "terraform", "fastapi",
    "javascript", "react", "typescript", "css", "airflow", "spark", "pytorch",
    "machine learning", "go", "rust", "postgres", "redis", "kafka",
]


def generate(jobs: int, candidates: int) -> None:
    """Insert synthetic jobs and candidates straight into the database."""
    from app import auth
    from app.db import get_db, init_db

    init_db()
    # get_db is a generator dependency: keep a reference to the generator, or it
    # is collected and closes the connection out from under us.
    session = get_db()
    db = next(session)
    try:
        password = auth.hash_password(DEFAULT_PASSWORD)

        employer = db.execute(
            "SELECT id FROM users WHERE role = 'employer' LIMIT 1"
        ).fetchone()
        if employer is None:
            db.execute(
                "INSERT INTO users (email, password_hash, role, name, company_name, "
                "email_verified) VALUES (?, ?, 'employer', 'Load Test', 'LoadCo', 1)",
                ("load-employer@example.com", password),
            )
            db.commit()
            employer = db.execute(
                "SELECT id FROM users WHERE email = ?", ("load-employer@example.com",)
            ).fetchone()

        for n in range(jobs):
            skills = ", ".join(random.sample(SKILL_POOL, k=5))
            db.execute(
                "INSERT INTO jobs (employer_id, title, location, required_skills, "
                "description, status, active_since) "
                "VALUES (?, ?, 'Remote', ?, 'Generated for load testing.', "
                "'active', datetime('now'))",
                (employer["id"], f"Load Test Role {n}", skills),
            )

        for n in range(candidates):
            email = f"load-candidate-{n}@example.com"
            skills = ", ".join(random.sample(SKILL_POOL, k=6))
            db.execute(
                "INSERT OR IGNORE INTO users (email, password_hash, role, name, "
                "email_verified) VALUES (?, ?, 'candidate', ?, 1)",
                (email, password, f"Load Candidate {n}"),
            )
            row = db.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
            db.execute(
                "INSERT OR REPLACE INTO candidate_profiles (user_id, headline, skills) "
                "VALUES (?, 'Generated', ?)",
                (row["id"], skills),
            )
        db.commit()

        totals = db.execute(
            "SELECT (SELECT COUNT(*) FROM jobs WHERE status = 'active') AS jobs, "
            "       (SELECT COUNT(*) FROM candidate_profiles) AS candidates"
        ).fetchone()
        print(f"Database now holds {totals['jobs']} active jobs and "
              f"{totals['candidates']} candidate profiles.")
    finally:
        session.close()


# --------------------------------------------------------------------------- #
# Load phase
# --------------------------------------------------------------------------- #
async def sign_in(client: httpx.AsyncClient, base: str, email: str, password: str) -> None:
    page = await client.get(f"{base}/login")
    match = CSRF_RE.search(page.text)
    if not match:
        raise RuntimeError("no CSRF token on /login — is this the right URL?")
    resp = await client.post(
        f"{base}/login",
        data={"csrf_token": match.group(1), "email": email, "password": password},
    )
    if resp.status_code == 429:
        raise RuntimeError(
            f"login for {email} was rate-limited. Logins are capped per email, so "
            "several virtual users cannot share one account — give each its own "
            "with --email-pattern (the default), and create them with --generate."
        )
    if resp.status_code != 303:
        raise RuntimeError(
            f"login failed for {email} ({resp.status_code}). Create the accounts "
            "first: python scripts/loadtest.py --generate"
        )


async def drive(
    base: str, email: str, password: str, targets: list[str],
    deadline: float, samples: list[float], statuses: Counter,
) -> None:
    """One virtual user: sign in once, then request until the clock runs out."""
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=False) as client:
        await sign_in(client, base, email, password)
        while time.perf_counter() < deadline:
            path = random.choice(targets)
            started = time.perf_counter()
            try:
                resp = await client.get(f"{base}{path}")
                statuses[resp.status_code] += 1
            except httpx.HTTPError as exc:
                statuses[type(exc).__name__] += 1
            samples.append(time.perf_counter() - started)


def percentile(values: list[float], pct: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = min(int(len(ordered) * pct / 100), len(ordered) - 1)
    return ordered[index]


def report(samples: list[float], statuses: Counter, elapsed: float, users: int) -> int:
    total = len(samples)
    ok = sum(count for code, count in statuses.items() if isinstance(code, int) and code < 400)
    failed = total - ok

    print()
    print(f"  users        {users}")
    print(f"  duration     {elapsed:.1f}s")
    print(f"  requests     {total}")
    print(f"  throughput   {total / elapsed:.1f} req/s")
    print(f"  ok / failed  {ok} / {failed} ({(failed / total * 100) if total else 0:.1f}%)")
    print()
    print(f"  p50          {percentile(samples, 50) * 1000:7.1f} ms")
    print(f"  p95          {percentile(samples, 95) * 1000:7.1f} ms")
    print(f"  p99          {percentile(samples, 99) * 1000:7.1f} ms")
    print(f"  max          {(max(samples) if samples else 0) * 1000:7.1f} ms")
    print(f"  mean         {(statistics.mean(samples) if samples else 0) * 1000:7.1f} ms")
    print()
    print("  responses    " + ", ".join(f"{code}: {n}" for code, n in sorted(
        statuses.items(), key=lambda kv: str(kv[0]))))

    # Non-zero exit when the run found trouble, so CI can gate on it later.
    return 1 if failed else 0


async def run(args: argparse.Namespace) -> int:
    samples: list[float] = []
    statuses: Counter = Counter()
    targets = args.target or DEFAULT_TARGETS

    started = time.perf_counter()
    deadline = started + args.duration
    await asyncio.gather(*(
        drive(args.url.rstrip("/"),
              args.email or args.email_pattern.format(n=index),
              args.password, targets, deadline, samples, statuses)
        for index in range(args.users)
    ))
    return report(samples, statuses, time.perf_counter() - started, args.users)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--url", default="http://127.0.0.1:8000")
    parser.add_argument("--users", type=int, default=10, help="concurrent users")
    parser.add_argument("--duration", type=float, default=20.0, help="seconds")
    parser.add_argument("--email", default="",
                        help="sign every user in as this one account; "
                             "rate-limited above a handful of users")
    parser.add_argument("--email-pattern", default=DEFAULT_EMAIL_PATTERN,
                        help="account per virtual user; {n} is the user index")
    parser.add_argument("--password", default=DEFAULT_PASSWORD)
    parser.add_argument("--target", action="append",
                        help="path to hit; repeat to weight the mix")
    parser.add_argument("--generate", action="store_true",
                        help="insert synthetic data, then exit")
    parser.add_argument("--jobs", type=int, default=100)
    parser.add_argument("--candidates", type=int, default=200)
    args = parser.parse_args()

    if args.generate:
        generate(args.jobs, args.candidates)
        return 0
    return asyncio.run(run(args))


if __name__ == "__main__":
    raise SystemExit(main())
