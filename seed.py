"""Populate the database with demo employers, candidates, and jobs.

Run:  python seed.py
Login with any account below (password: password123).
"""
from app.db import init_db, _connect
from app import auth
from app.matching import match_pct

EMPLOYERS = [
    ("hr@acme.io", "Acme Cloud", "Priya Nair"),
    ("talent@nimbus.dev", "Nimbus Labs", "Raj Malhotra"),
]

JOBS = [
    # (employer_email, title, location, required_skills, description)
    ("hr@acme.io", "Backend Engineer", "Remote", "python, fastapi, sql, docker, aws",
     "Build low-latency APIs on our cloud platform."),
    ("hr@acme.io", "Data Engineer", "Bengaluru", "python, sql, airflow, spark, aws",
     "Own our batch and streaming data pipelines."),
    ("talent@nimbus.dev", "Frontend Engineer", "Remote", "javascript, react, css, typescript",
     "Craft delightful UIs for our design tools."),
    ("talent@nimbus.dev", "DevOps Engineer", "Hyderabad", "docker, kubernetes, aws, terraform, python",
     "Keep our infra fast, cheap, and reliable."),
]

CANDIDATES = [
    # (email, name, headline, skills, auto_apply)
    ("asha@example.com", "Asha Verma", "Backend Engineer", "python, fastapi, sql, docker", 1),
    ("dev@example.com", "Dev Kumar", "Full-stack Developer", "javascript, react, css, python", 0),
    ("sam@example.com", "Sam Iyer", "Platform / DevOps", "docker, kubernetes, aws, terraform", 1),
]


def main() -> None:
    init_db()
    conn = _connect()
    pw = auth.hash_password("password123")

    email_to_id = {}
    for email, company, name in EMPLOYERS:
        cur = conn.execute(
            "INSERT OR IGNORE INTO users (email, password_hash, role, name, company_name) "
            "VALUES (?, ?, 'employer', ?, ?)", (email, pw, name, company))
        email_to_id[email] = cur.lastrowid or conn.execute(
            "SELECT id FROM users WHERE email = ?", (email,)).fetchone()[0]

    for email, name, headline, skills, auto in CANDIDATES:
        cur = conn.execute(
            "INSERT OR IGNORE INTO users (email, password_hash, role, name) "
            "VALUES (?, ?, 'candidate', ?)", (email, pw, name))
        cid = cur.lastrowid or conn.execute(
            "SELECT id FROM users WHERE email = ?", (email,)).fetchone()[0]
        conn.execute(
            "INSERT OR REPLACE INTO candidate_profiles (user_id, headline, skills, auto_apply) "
            "VALUES (?, ?, ?, ?)", (cid, headline, skills, auto))
        email_to_id[email] = cid

    conn.commit()

    for emp_email, title, loc, req, desc in JOBS:
        cur = conn.execute(
            "INSERT INTO jobs (employer_id, title, location, required_skills, description) "
            "VALUES (?, ?, ?, ?, ?)", (email_to_id[emp_email], title, loc, req, desc))
        job_id = cur.lastrowid
        # Auto-apply matching candidates to this fresh job.
        for email, name, headline, skills, auto in CANDIDATES:
            if not auto:
                continue
            pct = match_pct(skills, req)
            if pct <= 0:
                continue
            conn.execute(
                "INSERT OR IGNORE INTO applications "
                "(job_id, candidate_id, match_pct, source) VALUES (?, ?, ?, 'auto')",
                (job_id, email_to_id[email], pct))
    conn.commit()
    conn.close()
    print("Seeded. Log in with any email above / password: password123")


if __name__ == "__main__":
    main()
