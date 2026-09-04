# Runbook

What to do when Catchablepro is broken. Written to be followed at 2am without
thinking, by one person with no colleagues to escalate to.

Anything marked **⚠ not possible yet** is a procedure whose prerequisite does
not exist. Those are honest gaps, not oversights — closing them is tracked in
the launch-readiness list.

---

## 0. What you are operating

| | |
|---|---|
| Runtime | One container, FastAPI + uvicorn, Docker image from this repo |
| Host | Render, blueprint in `render.yaml`, `autoDeploy: true` from `main` |
| Database | **In-process SQLite** at `/app/data/portal.db` — one instance, always |
| Uploads | Resumes on local disk at `/app/data/uploads` |
| Health | `/healthz` liveness · `/readyz` readiness (Render routes on `/readyz`) |
| Logs | One JSON object per line on stdout, each carrying a `request_id` |
| Metrics | `/metrics`, bearer-token guarded — scrape config in `ops/`, see `docs/monitoring.md` |

**The single most important fact:** on Render's `free` plan there is no
persistent disk. Every restart, redeploy and idle spin-down destroys the
database and every uploaded resume. Until the plan changes, *any* deploy is a
data-loss event, and no procedure below can undo one.

---

## 1. Someone says it's broken

Work in this order. Each step tells you which of the next ones to skip.

**1.1 — Is it serving at all?**

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://<your-app>/healthz
```

- **200** → the process is alive. Skip to 1.2.
- **timeout / connection refused / 502** → the process is down or never
  started. Go to **§2 It will not start**.

**1.2 — Are its dependencies working?**

```bash
curl -sS https://<your-app>/readyz | jq
```

- **200** → the app is healthy. The problem is narrower than "the site is
  down": get a `request_id` from the user and go to **§4 Find the request**.
- **503** → read `checks` in the body. It names what failed:

| Failing check | Means | Go to |
|---|---|---|
| `database` | The DB file is missing, unreadable, or has no schema | §3 |
| `uploads` | The volume is gone, read-only, or the disk is full | §5 |

`/readyz` returning 503 also means Render has stopped routing traffic to the
instance, so users see an error page rather than a half-working site. That is
the design working, not an extra fault.

---

## 2. It will not start

Two config guards deliberately refuse to boot rather than run wrong. Both print
the reason as the last line of the deploy log.

| Message contains | Cause | Fix |
|---|---|---|
| `SECRET_KEY must be set` | `ENV=production` with the dev default | Set a real `SECRET_KEY` (Render generates one; if it was cleared, generate: `python -c "import secrets; print(secrets.token_urlsafe(48))"`) |
| `Email is not deliverable` | `ENV=production` with a mailer that sends nothing | Configure `EMAIL_BACKEND` + credentials, **or** set `ALLOW_CONSOLE_EMAIL=1` to knowingly run a demo that sends no mail |

Neither is a bug. Both are the app refusing to look healthy while being unable
to do its job.

**Rotating `SECRET_KEY` logs out every user at once.** Expected, not an
incident — but do not do it during another incident.

---

## 3. The database is broken or empty

**3.1 — Confirm what you are looking at.** `/readyz` reporting
`"database": {"ok": false}` with `unable to open database file` means the file
is not there. On the free plan the overwhelmingly likely cause is a restart,
not corruption.

**3.2 — Restore from backup.** ⚠ **not possible yet — no backups exist.**
When they do, the procedure is:

```bash
# On a machine with the backup and access to the data volume
sqlite3 /app/data/portal.db ".restore /path/to/backup.db"
# then restart the service so the app reopens the file
```

**3.3 — If there is no backup**, the data is gone. Say so plainly to affected
users; do not imply it may come back. Then stop the bleeding: move off the free
plan (`plan: starter` + the `disk:` block in `render.yaml`) before taking more
signups, or you will do this again.

**3.4 — A brand-new empty database** is not corruption: the app creates the
schema on startup, so the site will work and simply have no accounts in it.

---

## 4. Find the request behind a complaint

Every response carries `X-Request-ID`, and every log line produced while
serving that request carries the same value.

```bash
# The user quotes an id, or you find theirs by path and time
grep '"request_id": "<id>"' <log stream>

# All failures in a window
grep '"status": 5' <log stream>

# Everything one user did (their numeric id, from the admin console)
grep '"user_id": 42' <log stream>
```

Ask the user for the id if they have it — it turns a search into a lookup. The
access line carries `method`, `path`, `status`, `duration_ms` and `user_id`.

---

## 5. Uploads failing

`/readyz` reports `uploads: {"ok": false}` with:

- **`Permission denied`** → the data directory is not writable by the app user.
  The container runs as UID `10001`; a **bind mount** must be
  `chown -R 10001:10001`'d on the host. A Render disk or a Docker named volume
  inherits the right ownership from the image and does not need this.
- **`No space left on device`** → the disk is full. Resumes accumulate and are
  never pruned. Free space, then raise the disk size.
- **`No such file or directory`** → the volume is not mounted.

---

## 6. Roll back a deploy

`autoDeploy: true` means every push to `main` ships. Two ways back:

**Fastest — Render dashboard:** the service's *Deploys* tab → pick the last
good deploy → **Redeploy**. No git archaeology, no CI wait.

**From git**, when the bad change must also leave `main`:

```bash
git revert <bad-sha>      # a revert commit, not a force-push
git push origin main      # autoDeploy ships it
```

**Never force-push `main` to roll back.** It rewrites history other checkouts
depend on, and Render will happily deploy whatever it finds.

⚠ **On the free plan a rollback still restarts the container, which still
destroys the data.** Rolling back a bad deploy costs you every account created
since the previous one.

---

## 7. Take the site offline deliberately

There is no built-in maintenance page. In order of preference:

1. **Suspend the service** in the Render dashboard — visitors get Render's
   error page. Blunt but instant.
2. **Scale to zero** if the plan allows it.

Both drop the data on the free plan. Prefer fixing forward.

---

## 8. Admin access

Admin rights are not self-service by design: no signup path grants them, and
the register form ignores `is_admin`.

```bash
python manage.py list-admins
python manage.py make-admin <email>
python manage.py revoke-admin <email>
```

This needs a shell **on the instance holding the database** — on Render, a paid
plan. Running it locally edits your local copy, not production. Every grant and
revocation is written to the audit log at `/admin/audit`.

An admin cannot suspend themselves, suspend another admin, or delete their own
account. If you are locked out, `make-admin` is the only way back in.

---

## 9. What wakes you, what waits

| Wake up | Wait for morning |
|---|---|
| `/readyz` failing (site out of rotation) | One user's 500 |
| 5xx rate climbing across many users | A slow page |
| The site not responding at all | A single failed email |
| Data loss suspected | A spam signup |

An alert that fires for everything trains you to ignore it, which is worse than
no alert.

That table is implemented, not just asserted. `ops/prometheus/alerts.yml`
carries one alert per fault, each labelled `severity: page` (wake up) or
`severity: ticket` (morning), each annotated with the section below that says
what to do:

| Alert | Means | Go to |
|---|---|---|
| `CatchableproDown` | No successful scrape for 2m — **or the scrape token is wrong** | §2 |
| `CatchableproDependencyDown` | `{{ check }}` failed readiness; out of rotation | §3 or §5 |
| `CatchableproErrorRateHigh` | >5% of requests are 5xx | §4 |
| `CatchableproLatencyHigh` | p95 above 2s | `docs/performance.md` |
| `CatchableproRestarted` | The process restarted — on the free plan, the data is gone | §3.3 |

Before believing `CatchableproDown`, curl `/healthz`. A 200 there means the
scrape credential is wrong, not that the site is down — `/metrics` answers 404
to a caller without the token, which is indistinguishable from an outage to
Prometheus. Setup and the rest of the reasoning: `docs/monitoring.md`.

---

## 10. Never, during an incident

- **Never force-push `main`.** Revert instead.
- **Never rotate `SECRET_KEY`** to fix something unrelated — it logs out every
  user mid-incident.
- **Never delete a user to clear a problem.** Deletion is irreversible and
  cascades to their applications; suspend instead (`/admin/users`), which is
  reversible.
- **Never edit the production database by hand** to work around a bug, unless
  you have a backup you have actually restored from before.
- **Never redeploy "to see if it helps"** while on the free plan. It will not
  help, and it will destroy the data.

---

## 11. Rehearse this

A procedure you have never run is a guess. Before real users arrive, do each of
these once, deliberately:

- [ ] Take a backup, restore it into a scratch environment, and log in.
- [ ] Roll back a deploy on purpose and confirm the previous version serves.
- [ ] Break `/readyz` (rename the database file) and watch traffic stop.
- [ ] Find one specific request in the logs from its `request_id`.
- [ ] Fire a test alert at Alertmanager and confirm your phone buzzes
      (`docs/monitoring.md`, "Prove the alerts deliver"). Alerting nobody has
      ever received is not alerting.

The restore is the one that matters most, and the one most often skipped. An
untested backup is not a backup.
