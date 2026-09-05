# Architecture, and the constraint behind it

Catchablepro is a web app today. Native iOS and Android clients are planned.

That second sentence is the whole reason this document exists. A phone app is
not a new skin over the same pages — it is a **second consumer of the same
logic**, and the cost of supporting one is set almost entirely by decisions made
before it is written. This file records those decisions while they are still
cheap.

**Status: this describes where the code is going, not where it is.** No handler
follows the rule below yet. That is honest, not aspirational — the rule applies
to code written from here on, and to handlers as they are touched for other
reasons.

---

## The one rule

> A function that gathers data must not also render it.

```
service function (queries, scoring, business rules)  →  plain data
    ├─ Jinja template   → the web app
    └─ JSON response    → iOS, Android, anything else later
```

Everything else in this document follows from that.

### What it looks like here, concretely

`candidate_dashboard()` in `app/main.py` is 129 lines. It checks the session,
sweeps expired jobs, builds a filtered SQL query, scores every active job
against the candidate, ranks, paginates, and — on **one** line near the bottom —
renders a template.

Roughly seventy of those lines are things a phone app needs to do identically.
One line is web-specific. Today they are inseparable, so a mobile endpoint would
have to reimplement the seventy.

Split, it becomes:

```python
def candidate_dashboard_data(db, user, *, filters, page) -> dict:
    """Everything the dashboard shows. No HTTP, no HTML, no templates."""
    ...

@app.get("/candidate")                       # web
def candidate_dashboard(...):
    data = candidate_dashboard_data(db, user, filters=..., page=page)
    return templates.TemplateResponse("candidate.html", {**data, "request": request})

@app.get("/api/v1/candidate/dashboard")      # mobile
def candidate_dashboard_api(...):
    return candidate_dashboard_data(db, user, filters=..., page=page)
```

The mobile endpoint is then three lines, not a second implementation that drifts
out of agreement with the first. This is also why the split is not extra work:
it is the work you would do anyway, done once instead of twice.

A useful side effect: the service function is testable without a `TestClient`,
and the matching logic stops being reachable only through an HTTP round trip.

---

## Three decisions that are expensive to reverse

Web mistakes are cheap — you deploy, and everyone is on the new version within
seconds. **Mobile mistakes are not.** A version you ship today will still be
running on someone's phone years from now, because they never updated and you
cannot make them. Anything the client depends on becomes a contract you cannot
unilaterally break.

### 1. Version the API from the first endpoint: `/api/v1/…`

Not when it seems necessary. From the first one. Without a version prefix there
is no way to change a response shape later without breaking installed apps, and
the workaround — sniffing user agents, guessing client capability — is worse
than the prefix would have been.

Corollaries worth writing down now:

- **Adding a field is safe. Removing or retyping one is not.** Clients parse
  what they were compiled against.
- **Never reuse a field name with different meaning.** Add a new one.
- **The server decides what is deprecated; the client decides when to stop
  using it.** Plan to serve `v1` long after `v2` exists.

### 2. Token auth, not session cookies

Authentication today is a signed session cookie (`SessionMiddleware`,
`SECRET_KEY`), which is right for a server-rendered site and awkward for a phone:
cookie jars, no browser to redirect, no natural place for the login form, and
logout that must work when the app has been offline for a week.

Mobile wants a short-lived access token plus a refresh token, stored in the
platform keychain. That has consequences worth deciding once rather than twice:

- **Revocation.** Cookies die with `SECRET_KEY` rotation, which logs out
  everyone at once (see `docs/runbook.md` §2). Tokens need a real revocation
  path — a token version per user, or a server-side token table.
- **Two-factor.** The 2FA flow currently spans redirects between pages. A token
  API has to express the same states without them.
- **Rate limiting.** `app/ratelimit.py` is per-email and in-process. A mobile
  client retrying in the background will hit it in ways a browser never does.

Retrofitting auth across two shipped clients is genuinely painful. Design it
before the first mobile build, not during it.

### 3. Postgres before mobile, not after

`docs/performance.md` already establishes that in-process SQLite plus a single
uvicorn worker is this app's ceiling. Mobile pushes on that ceiling from a new
direction:

- Push notifications create **synchronised spikes** — you notify ten thousand
  people and a share of them open the app in the same minute.
- Background sync sends requests when nobody is watching, so the load no longer
  follows a human daily rhythm.
- An app in the store raises the cost of downtime: a broken website is a bad
  afternoon, a broken app is a review that stays up for years.

Extra uvicorn workers cannot come first, because they would break the
in-process rate limiter, the in-process metrics counters and the memoized
scorer — each worker would keep its own. Postgres is the change that unblocks
the rest.

---

## Push notifications are the point

For a job-matching product, the reason to be on a phone at all is *"three new
roles match you, one at 94%."* That is the feature; the rest of the app is table
stakes the web already covers.

It needs, at minimum:

- A device-token table — one user has many devices, tokens expire and rotate.
- A send path with retries, and honest handling of the tokens APNs and FCM
  reject as dead.
- Per-user notification preferences, and a real unsubscribe. A job app that
  cannot be told to be quiet gets uninstalled.

**This touches the same tables as persisting match scores** (the open item in
`docs/performance.md`): both need to know a candidate's ranked matches without
recomputing them inside a request. Design them together, or the second one will
force a rewrite of the first.

---

## What this does not decide

Deliberately open, because deciding now would be guessing:

- **React Native, Flutter, or two native apps.** This depends on who is
  building them, and none of the decisions above change with the answer.
- **When.** No date implied.
- **Whether the web app becomes an SPA.** It does not need to. HTMX — server-
  rendered fragments — is the current direction for web interactivity, and it
  shares no code with a mobile client either way. The service-layer split above
  is what serves mobile; the web's rendering choice is independent of it.
- **Offline support.** The hardest thing in mobile engineering. Do not promise
  it before someone asks.

---

## The short version

1. Never write another handler that queries *and* renders.
2. `/api/v1/` from the first JSON endpoint.
3. Decide token auth before the first mobile build.
4. Postgres before push notifications.
5. Design match-score persistence and notifications together.
