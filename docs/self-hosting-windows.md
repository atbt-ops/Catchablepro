# Hosting Catchablepro from a Windows desktop

This is the supported path for publishing this app from a desktop without
opening router ports. It uses Docker Desktop for the app and a **named
Cloudflare Tunnel** for the public HTTPS connection:

```text
Real users ── HTTPS ──> Cloudflare ── encrypted outbound tunnel ──> this desktop
                                                                    └─ app container
```

The desktop makes the outbound connection; it does not accept inbound Internet
traffic. Cloudflare's current Tunnel documentation describes the domain,
tunnel, and published-hostname requirements. See [Set up Cloudflare Tunnel](https://developers.cloudflare.com/tunnel/setup/).

## Before you start

- Keep this desktop powered on and connected. Configure it never to sleep while
  the site is live, and arrange for Docker Desktop to start after sign-in.
- Install and start [Docker Desktop](https://www.docker.com/products/docker-desktop/).
- Put the public domain or subdomain you will use (for example,
  `jobs.example.com`) on Cloudflare DNS. A named tunnel needs a Cloudflare
  account and a domain on Cloudflare.
- Configure a real email provider and a verified sender. Signup confirmation
  and password reset do not work with the development console mailer.
- Decide where encrypted, off-desktop backups will go. Candidate resumes and
  accounts are personal data; a Docker volume on this desktop is not a backup.

## Configure the app

1. Copy `.env.production.example` to `.env.production` and replace every
   placeholder. `PUBLIC_URL` and `TRUSTED_HOSTS` must exactly match the public
   HTTPS hostname. Generate a fresh `SECRET_KEY`; rotating it later signs every
   user out.
2. In the Cloudflare dashboard, create a **named** tunnel. Use the Docker
   connector option and copy its token into
   `secrets/cloudflare-tunnel-token.txt`. This file is ignored by Git.
3. In that tunnel's **Routes**, add a *Published application*:

   - Hostname: your public hostname, for example `jobs.example.com`
   - Service URL: `http://app:8000`

   `app` is the Compose service name. Do not use `localhost:8000` here: inside
   the connector container, `localhost` is the connector, not the web app.
4. Start the stack from the project directory:

   ```powershell
   docker compose -f compose.production.yaml up -d --build
   ```

5. Check the local health endpoint at `http://127.0.0.1:8000/readyz`, then open
   `https://<your-public-host>/readyz` in a private browser window. It should
   return `"status": "ok"`. The loopback URL is for health checks only;
   production cookies are HTTPS-only, so test sign-in and sign-up at the public
   URL.

The Compose stack only publishes port 8000 on `127.0.0.1`. Cloudflare Tunnel is
the sole Internet path. Docker restarts both containers after a crash or Docker
restart unless you deliberately stop them. Cloudflare maps the public hostname
to the local service and provides the public HTTPS edge; it also supplies its
network protections before traffic reaches the desktop. [Cloudflare's routing
guide](https://developers.cloudflare.com/tunnel/routing/) covers that model.

## What the production package protects

- HTTPS-only session cookies, fixed public URLs in account emails, and an
  optional Host allow-list stop common proxy and Host-header mistakes.
- A persistent named volume stores the SQLite database and resumes across
  container rebuilds. SQLite runs in WAL mode with a short busy timeout for this
  single-instance host.
- The app and connector have restart policies; the app filesystem is read-only
  except for its data volume and temporary upload space.
- Browser responses include framing, MIME, referrer, permission, transport, and
  content-security headers.

## Backups and operations

Run this after the site is started to create a transactionally consistent
SQLite backup on the host:

```powershell
.\scripts\backup.ps1
```

It writes a timestamped `.db` file under `backups/`, which is ignored by Git.
Copy that file to encrypted storage on another device or cloud account. Schedule
the script daily only after you have confirmed the destination is external to
this desktop and that a restore has been tested. A backup left beside the live
volume does not protect against disk loss, ransomware, or theft.

Useful status commands:

```powershell
docker compose -f compose.production.yaml ps
docker compose -f compose.production.yaml logs --tail=100 app
docker compose -f compose.production.yaml logs --tail=100 cloudflared
```

Before opening signups, test the public registration, verification email,
password reset, job posting, resume upload, and a backup/restore drill. Set
Cloudflare rate-limit rules for the login and password-reset routes, and publish
the privacy, terms, retention, and support information appropriate to the
locations of your users. This project includes data export and deletion flows,
but it does not replace legal or operational obligations for a public job
portal.
