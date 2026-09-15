"""Razorpay integration for the prepaid employer wallet.

The on-demand job-posting meter in ``app/pricing.py`` computes cost but never
collected it — this module is the seam that lets it. Employers top up a
balance via a one-time Razorpay Checkout payment; ``app/web.py`` draws that
balance down as jobs accrue cost (see ``_finalize_job_billing``).

Degrades cleanly when unconfigured: :func:`is_configured` is false, the
wallet page shows a "not set up" notice, and nothing here makes a network
call — the same pattern ``app/ai.py`` uses for ``AI_MODEL``.

Two secrets, two different jobs, both required only when actually used:
``RAZORPAY_KEY_SECRET`` signs *our* requests to Razorpay's API (order
creation) and verifies the signature Razorpay hands back after a successful
checkout. ``RAZORPAY_WEBHOOK_SECRET`` is a separate secret configured in the
Razorpay dashboard, used only to verify that a POST to /webhooks/razorpay
actually came from Razorpay.
"""
from __future__ import annotations

import hashlib
import hmac
import logging
import os

import httpx

log = logging.getLogger("catchablepro.wallet")

KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "").strip()
KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "").strip()
WEBHOOK_SECRET = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "").strip()

ORDERS_ENDPOINT = "https://api.razorpay.com/v1/orders"
_TIMEOUT = 20.0

#: What an employer can top up in one go. Enforced server-side in the route,
#: not just the UI — never trust a client-supplied amount past sanity bounds.
MIN_TOPUP_PAISE = 100_00      # ₹100
MAX_TOPUP_PAISE = 50_000_00   # ₹50,000
PRESET_TOPUPS_PAISE = [500_00, 1_000_00, 2_000_00, 5_000_00]


class WalletUnavailable(RuntimeError):
    """A wallet operation was attempted but Razorpay isn't configured or the call failed."""


def is_configured() -> bool:
    return bool(KEY_ID and KEY_SECRET)


def create_order(amount_paise: int, receipt: str) -> dict:
    """Create a Razorpay order for a top-up. Raises WalletUnavailable on failure."""
    if not is_configured():
        raise WalletUnavailable("Razorpay is not configured")
    try:
        resp = httpx.post(
            ORDERS_ENDPOINT,
            auth=(KEY_ID, KEY_SECRET),
            json={
                "amount": amount_paise,
                "currency": "INR",
                "receipt": receipt,
                "payment_capture": 1,
            },
            timeout=_TIMEOUT,
        )
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPError as exc:
        log.exception("razorpay order creation failed")
        raise WalletUnavailable(f"Could not create the order: {exc}") from exc


def verify_payment_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """Verify the signature Razorpay's Checkout hands back on payment success.

    Per Razorpay's documented scheme: HMAC-SHA256 of "{order_id}|{payment_id}"
    keyed with the account's key secret, compared to the signature they sent.
    """
    if not KEY_SECRET or not order_id or not payment_id or not signature:
        return False
    expected = hmac.new(
        KEY_SECRET.encode(), f"{order_id}|{payment_id}".encode(), hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def verify_webhook_signature(raw_body: bytes, signature: str) -> bool:
    """Verify the X-Razorpay-Signature header on an incoming webhook POST.

    Must be checked against the exact raw request bytes — re-serializing the
    parsed JSON before hashing can change the byte content and break the
    signature even for a genuine event.
    """
    if not WEBHOOK_SECRET or not signature:
        return False
    expected = hmac.new(
        WEBHOOK_SECRET.encode(), raw_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
