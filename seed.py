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

COMPANIES = {
    # employer_email: (industry, size, website, about)
    "hr@acme.io": ("Cloud Infrastructure", "201-500 employees", "https://acme.io",
                   "Acme Cloud builds developer infrastructure for high-scale APIs."),
    "talent@nimbus.dev": ("Product Design Tools", "51-200 employees", "https://nimbus.dev",
                          "Nimbus Labs makes collaborative design tooling for product teams."),
}

JOBS = [
    # employer, title, location, skills, description, dept, emp_type, work_mode,
    # exp_min, exp_max, sal_min, sal_max, hide, vacancies, education, status
    ("hr@acme.io", "Backend Engineer", "Remote", "python, fastapi, sql, docker, aws",
     "<p>Build low-latency APIs on our cloud platform.</p>"
     "<p><strong>What you'll do:</strong></p>"
     "<ul><li>Design and ship high-throughput services</li>"
     "<li>Own reliability and performance budgets</li>"
     "<li>Mentor engineers across the platform team</li></ul>",
     "Engineering", "Full-time", "Remote", 3, 6, 18, 32, 0, 2, "Graduate", "active"),
    ("hr@acme.io", "Data Engineer", "Bengaluru", "python, sql, airflow, spark, aws",
     "Own our batch and streaming data pipelines.",
     "Data Science", "Full-time", "Hybrid", 2, 5, 14, 26, 0, 1, "Graduate", "active"),
    ("talent@nimbus.dev", "Frontend Engineer", "Remote", "javascript, react, css, typescript",
     "Craft delightful UIs for our design tools.",
     "Engineering", "Full-time", "Remote", 1, 4, 10, 20, 0, 3, "Any", "active"),
    ("talent@nimbus.dev", "DevOps Engineer", "Hyderabad", "docker, kubernetes, aws, terraform, python",
     "Keep our infra fast, cheap, and reliable.",
     "Engineering", "Full-time", "On-site", 4, 8, 22, 40, 1, 1, "Graduate", "active"),
    ("talent@nimbus.dev", "ML Intern", "Bengaluru", "python, machine learning, pytorch",
     "<p>Support our applied ML team over a <em>6-month</em> internship.</p>"
     "<ul><li>Prototype models with PyTorch</li><li>Ship evaluation tooling</li></ul>",
     "Data Science", "Internship", "On-site", 0, 0, 3, 5, 0, 2, "Any", "draft"),
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
            "INSERT OR IGNORE INTO users (email, password_hash, role, name, company_name, email_verified) "
            "VALUES (?, ?, 'employer', ?, ?, 1)", (email, pw, name, company))
        email_to_id[email] = cur.lastrowid or conn.execute(
            "SELECT id FROM users WHERE email = ?", (email,)).fetchone()[0]
        industry, size, website, about = COMPANIES[email]
        # onboarding_step 3 = complete, so demo logins land on the dashboard.
        conn.execute(
            "INSERT OR REPLACE INTO company_profiles "
            "(user_id, industry, size, website, about, hq_location, onboarding_step) "
            "VALUES (?, ?, ?, ?, ?, ?, 3)",
            (email_to_id[email], industry, size, website, about, "Bengaluru, India"))

    for email, name, headline, skills, auto in CANDIDATES:
        cur = conn.execute(
            "INSERT OR IGNORE INTO users (email, password_hash, role, name, email_verified) "
            "VALUES (?, ?, 'candidate', ?, 1)", (email, pw, name))
        cid = cur.lastrowid or conn.execute(
            "SELECT id FROM users WHERE email = ?", (email,)).fetchone()[0]
        conn.execute(
            "INSERT OR REPLACE INTO candidate_profiles (user_id, headline, skills, auto_apply) "
            "VALUES (?, ?, ?, ?)", (cid, headline, skills, auto))
        email_to_id[email] = cid

    conn.commit()

    # Stagger active_since across active jobs so the pricing meter demos each
    # tier: free week, a mid paid tier, and one near the auto-close cap.
    _active_ages = [1, 10, 26]  # days since going live, cycled across active jobs
    _age_i = 0
    for (emp_email, title, loc, req, desc, dept, emp_type, mode,
         e_min, e_max, s_min, s_max, hide, vac, edu, status) in JOBS:
        if status == "active":
            age = _active_ages[_age_i % len(_active_ages)]
            _age_i += 1
            active_since = f"datetime('now', '-{age} days')"
        else:
            active_since = "''"
        cur = conn.execute(
            "INSERT INTO jobs (employer_id, title, location, required_skills, description, "
            "department, employment_type, work_mode, exp_min, exp_max, salary_min, "
            "salary_max, hide_salary, vacancies, education, status, active_since) "
            f"VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, {active_since})",
            (email_to_id[emp_email], title, loc, req, desc, dept, emp_type, mode,
             e_min, e_max, s_min, s_max, hide, vac, edu, status))
        job_id = cur.lastrowid
        # Auto-apply matching candidates — drafts are not live, so skip them.
        if status != "active":
            continue
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
