"""Outbound email.

Three backends, chosen with the ``EMAIL_BACKEND`` environment variable:

* ``console`` (default) — nothing leaves the machine. Messages are appended to
  :data:`outbox` and logged. This is deliberately the default so a
  misconfigured deploy (or a test run) can never send real mail.
* ``smtp``    — stdlib ``smtplib``. Works with Gmail, Amazon SES, Mailgun and
  SendGrid's SMTP relay (``smtp.sendgrid.net``, user ``apikey``).
* ``sendgrid``— SendGrid's HTTPS API, for hosts that block outbound SMTP ports.

The module is named ``mailer`` rather than ``email`` so it cannot shadow the
standard library package that ``smtplib`` depends on.
"""
from __future__ import annotations

import logging
import os
import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage
from typing import List, Optional, Tuple

log = logging.getLogger("skillmatch.mailer")
if not log.handlers:
    # Attach our own handler so console-backend output is visible regardless of
    # how the host (uvicorn, gunicorn, pytest) has configured logging.
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter("%(levelname)s [%(name)s] %(message)s"))
    log.addHandler(_handler)
    log.setLevel(logging.INFO)

SENDGRID_ENDPOINT = "https://api.sendgrid.com/v3/mail/send"


@dataclass
class SentMessage:
    to: str
    subject: str
    body: str
    reply_to: Optional[str] = None


#: Messages captured by the console backend — asserted against in tests.
outbox: List[SentMessage] = []


def _cfg(name: str, default: str = "") -> str:
    return os.environ.get(name, default)


def backend() -> str:
    return _cfg("EMAIL_BACKEND", "console").strip().lower()


def default_from() -> str:
    return _cfg("EMAIL_FROM", "no-reply@skillmatch.local")


def is_configured() -> bool:
    """True when a real provider is wired up (console does not count)."""
    b = backend()
    if b == "smtp":
        return bool(_cfg("SMTP_HOST"))
    if b == "sendgrid":
        return bool(_cfg("SENDGRID_API_KEY"))
    return False


def send_email(
    to: str, subject: str, body: str, reply_to: Optional[str] = None
) -> Tuple[bool, Optional[str]]:
    """Send one plain-text email. Returns ``(ok, error_message)``."""
    if not to or "@" not in to:
        return False, "Invalid recipient address."
    if not subject.strip():
        return False, "Subject is required."

    chosen = backend()
    try:
        if chosen == "smtp":
            return _send_smtp(to, subject, body, reply_to)
        if chosen == "sendgrid":
            return _send_sendgrid(to, subject, body, reply_to)
        return _send_console(to, subject, body, reply_to)
    except Exception as exc:  # noqa: BLE001 - surface any provider failure to the UI
        log.exception("email send failed")
        return False, f"Could not send email: {exc}"


def _send_console(to, subject, body, reply_to):
    outbox.append(SentMessage(to=to, subject=subject, body=body, reply_to=reply_to))
    log.info("[console-email] to=%s reply_to=%s subject=%s", to, reply_to, subject)
    return True, None


def _build(to, subject, body, reply_to) -> EmailMessage:
    msg = EmailMessage()
    msg["From"] = default_from()
    msg["To"] = to
    msg["Subject"] = subject
    if reply_to:
        msg["Reply-To"] = reply_to
    msg.set_content(body)
    return msg


def _send_smtp(to, subject, body, reply_to):
    host = _cfg("SMTP_HOST")
    if not host:
        return False, "SMTP_HOST is not set."
    port = int(_cfg("SMTP_PORT", "587"))
    user, password = _cfg("SMTP_USER"), _cfg("SMTP_PASSWORD")
    use_tls = _cfg("SMTP_USE_TLS", "true").lower() not in ("0", "false", "no")
    msg = _build(to, subject, body, reply_to)

    if port == 465:  # implicit TLS
        with smtplib.SMTP_SSL(host, port, timeout=20,
                              context=ssl.create_default_context()) as server:
            if user:
                server.login(user, password)
            server.send_message(msg)
    else:
        with smtplib.SMTP(host, port, timeout=20) as server:
            server.ehlo()
            if use_tls:
                server.starttls(context=ssl.create_default_context())
                server.ehlo()
            if user:
                server.login(user, password)
            server.send_message(msg)
    return True, None


def _send_sendgrid(to, subject, body, reply_to):
    api_key = _cfg("SENDGRID_API_KEY")
    if not api_key:
        return False, "SENDGRID_API_KEY is not set."
    try:
        import httpx
    except ImportError:
        return False, "httpx is required for the sendgrid backend."

    payload = {
        "personalizations": [{"to": [{"email": to}]}],
        "from": {"email": default_from()},
        "subject": subject,
        "content": [{"type": "text/plain", "value": body}],
    }
    if reply_to:
        payload["reply_to"] = {"email": reply_to}

    resp = httpx.post(
        SENDGRID_ENDPOINT,
        json=payload,
        headers={"Authorization": f"Bearer {api_key}"},
        timeout=20,
    )
    if resp.status_code >= 400:
        return False, f"SendGrid rejected the message ({resp.status_code})."
    return True, None
