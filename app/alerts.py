"""Job-match email alerts.

Candidates opt in on their dashboard (``candidate_profiles.job_alerts``). This
module finds, per opted-in candidate, the active jobs posted since their last
alert that match their skills well enough, and emails a short digest. It is run
from the outside on a schedule:

    python manage.py send-job-alerts           # send
    python manage.py send-job-alerts --dry-run # show what would go, send nothing

Nothing here runs inside a web request. Mail delivery uses whatever
``EMAIL_BACKEND`` is configured; with the ``console`` backend the digests are
logged, not sent.
"""
from __future__ import annotations

import os

from . import mailer
from .db import _connect, init_db
from .matching import match_pct

#: Minimum skill-match % for a job to be worth emailing about.
ALERT_MATCH_THRESHOLD = 45
#: How far back to look the first time a candidate has never had an alert.
FIRST_RUN_LOOKBACK_DAYS = 7
MAX_JOBS_PER_EMAIL = 8


def _public_url() -> str:
    return os.environ.get("PUBLIC_URL", "").strip().rstrip("/")


def run(dry_run: bool = False) -> str:
    """Send (or preview) one round of job-match alerts. Returns a summary line."""
    init_db()
    conn = _connect()
    base = _public_url()
    sent = skipped = 0
    try:
        candidates = conn.execute(
            "SELECT u.id, u.name, u.email, p.skills, p.last_alert_at "
            "FROM candidate_profiles p JOIN users u ON u.id = p.user_id "
            "WHERE p.job_alerts = 1 AND u.is_suspended = 0 "
            "AND u.email_verified = 1 AND p.skills != ''"
        ).fetchall()

        for cand in candidates:
            if cand["last_alert_at"]:
                jobs = conn.execute(
                    "SELECT j.title, j.location, j.required_skills, j.id, "
                    "u.company_name FROM jobs j JOIN users u ON u.id = j.employer_id "
                    "WHERE j.status = 'active' AND u.is_suspended = 0 "
                    "AND j.created_at > ? ORDER BY j.created_at DESC",
                    (cand["last_alert_at"],),
                ).fetchall()
            else:
                jobs = conn.execute(
                    "SELECT j.title, j.location, j.required_skills, j.id, "
                    "u.company_name FROM jobs j JOIN users u ON u.id = j.employer_id "
                    "WHERE j.status = 'active' AND u.is_suspended = 0 "
                    f"AND j.created_at > datetime('now', '-{FIRST_RUN_LOOKBACK_DAYS} days') "
                    "ORDER BY j.created_at DESC"
                ).fetchall()

            matches = []
            for job in jobs:
                pct = match_pct(cand["skills"], job["required_skills"])
                if pct >= ALERT_MATCH_THRESHOLD:
                    matches.append((pct, job))
            matches.sort(key=lambda m: m[0], reverse=True)
            matches = matches[:MAX_JOBS_PER_EMAIL]

            if not matches:
                skipped += 1
                # Still advance the cursor so the first-run window doesn't keep
                # re-scanning the same week forever.
                if not dry_run:
                    conn.execute(
                        "UPDATE candidate_profiles SET last_alert_at = datetime('now') "
                        "WHERE user_id = ?",
                        (cand["id"],),
                    )
                continue

            lines = [
                f"Hi {cand['name'] or 'there'},",
                "",
                f"{len(matches)} new job{'s' if len(matches) != 1 else ''} "
                "match your skills:",
                "",
            ]
            for pct, job in matches:
                loc = f" · {job['location']}" if job["location"] else ""
                lines.append(f"  {pct}%  {job['title']} — {job['company_name']}{loc}")
                if base:
                    lines.append(f"        {base}/jobs/{job['id']}")
            lines += [
                "",
                f"See all your matches: {base}/candidate" if base else "",
                "",
                "Turn these emails off any time from your dashboard.",
            ]
            body = "\n".join(x for x in lines if x is not None)

            if dry_run:
                print(f"[dry-run] would email {cand['email']}: {len(matches)} jobs")
            else:
                mailer.send_email(
                    to=cand["email"],
                    subject=f"{len(matches)} new job"
                    f"{'s' if len(matches) != 1 else ''} match your skills",
                    body=body,
                )
                conn.execute(
                    "UPDATE candidate_profiles SET last_alert_at = datetime('now') "
                    "WHERE user_id = ?",
                    (cand["id"],),
                )
            sent += 1

        if not dry_run:
            conn.commit()
    finally:
        conn.close()

    verb = "would send" if dry_run else "sent"
    return f"{verb} {sent} alert email(s); {skipped} candidate(s) had no new matches."
