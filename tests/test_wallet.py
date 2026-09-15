"""app/wallet.py: Razorpay order creation and signature verification.

No routes exist yet (this is the schema + module PR) — these tests exercise
wallet.py directly, the same way test_ai_feedback.py exercises ai._chat_json
before any route calls into it.
"""
import hashlib
import hmac

import httpx
import pytest

from app import wallet


def _configure(monkeypatch, key_id="rzp_test_abc", key_secret="testsecret", webhook_secret="whsecret"):
    monkeypatch.setattr(wallet, "KEY_ID", key_id)
    monkeypatch.setattr(wallet, "KEY_SECRET", key_secret)
    monkeypatch.setattr(wallet, "WEBHOOK_SECRET", webhook_secret)


# --------------------------------------------------------------------------- #
# is_configured
# --------------------------------------------------------------------------- #
def test_unconfigured_by_default(monkeypatch):
    monkeypatch.setattr(wallet, "KEY_ID", "")
    monkeypatch.setattr(wallet, "KEY_SECRET", "")
    assert wallet.is_configured() is False


def test_configured_once_both_keys_are_set(monkeypatch):
    _configure(monkeypatch)
    assert wallet.is_configured() is True


def test_missing_secret_alone_is_not_configured(monkeypatch):
    monkeypatch.setattr(wallet, "KEY_ID", "rzp_test_abc")
    monkeypatch.setattr(wallet, "KEY_SECRET", "")
    assert wallet.is_configured() is False


# --------------------------------------------------------------------------- #
# create_order
# --------------------------------------------------------------------------- #
def test_create_order_without_configuration_raises(monkeypatch):
    monkeypatch.setattr(wallet, "KEY_ID", "")
    monkeypatch.setattr(wallet, "KEY_SECRET", "")
    with pytest.raises(wallet.WalletUnavailable):
        wallet.create_order(50_000, receipt="r1")


def test_create_order_posts_amount_and_receipt(monkeypatch):
    _configure(monkeypatch)
    captured = {}

    class _Resp:
        def raise_for_status(self):
            pass

        def json(self):
            return {"id": "order_123", "amount": captured["kwargs"]["json"]["amount"]}

    def fake_post(url, **kwargs):
        captured["url"] = url
        captured["kwargs"] = kwargs
        return _Resp()

    monkeypatch.setattr(httpx, "post", fake_post)

    order = wallet.create_order(50_000, receipt="emp-1-123")

    assert captured["url"] == wallet.ORDERS_ENDPOINT
    assert captured["kwargs"]["auth"] == ("rzp_test_abc", "testsecret")
    assert captured["kwargs"]["json"]["amount"] == 50_000
    assert captured["kwargs"]["json"]["currency"] == "INR"
    assert captured["kwargs"]["json"]["receipt"] == "emp-1-123"
    assert order["id"] == "order_123"


def test_create_order_wraps_http_errors(monkeypatch):
    _configure(monkeypatch)

    def fake_post(url, **kwargs):
        raise httpx.ConnectError("boom")

    monkeypatch.setattr(httpx, "post", fake_post)

    with pytest.raises(wallet.WalletUnavailable):
        wallet.create_order(50_000, receipt="r1")


# --------------------------------------------------------------------------- #
# verify_payment_signature
# --------------------------------------------------------------------------- #
def test_a_valid_payment_signature_is_accepted(monkeypatch):
    _configure(monkeypatch)
    order_id, payment_id = "order_123", "pay_456"
    signature = hmac.new(
        b"testsecret", f"{order_id}|{payment_id}".encode(), hashlib.sha256
    ).hexdigest()

    assert wallet.verify_payment_signature(order_id, payment_id, signature) is True


def test_a_tampered_payment_signature_is_rejected(monkeypatch):
    _configure(monkeypatch)
    order_id, payment_id = "order_123", "pay_456"
    signature = hmac.new(
        b"testsecret", f"{order_id}|{payment_id}".encode(), hashlib.sha256
    ).hexdigest()

    # A different payment_id than what was signed for.
    assert wallet.verify_payment_signature(order_id, "pay_999", signature) is False


def test_payment_signature_check_fails_closed_without_config(monkeypatch):
    monkeypatch.setattr(wallet, "KEY_SECRET", "")
    assert wallet.verify_payment_signature("order_123", "pay_456", "anything") is False


def test_payment_signature_check_requires_all_fields(monkeypatch):
    _configure(monkeypatch)
    assert wallet.verify_payment_signature("", "pay_456", "sig") is False
    assert wallet.verify_payment_signature("order_123", "", "sig") is False
    assert wallet.verify_payment_signature("order_123", "pay_456", "") is False


# --------------------------------------------------------------------------- #
# verify_webhook_signature
# --------------------------------------------------------------------------- #
def test_a_valid_webhook_signature_is_accepted(monkeypatch):
    _configure(monkeypatch)
    body = b'{"event": "payment.captured"}'
    signature = hmac.new(b"whsecret", body, hashlib.sha256).hexdigest()

    assert wallet.verify_webhook_signature(body, signature) is True


def test_a_tampered_webhook_body_is_rejected(monkeypatch):
    _configure(monkeypatch)
    body = b'{"event": "payment.captured"}'
    signature = hmac.new(b"whsecret", body, hashlib.sha256).hexdigest()

    tampered = b'{"event": "payment.captured", "extra": "injected"}'
    assert wallet.verify_webhook_signature(tampered, signature) is False


def test_webhook_signature_check_fails_closed_without_config(monkeypatch):
    monkeypatch.setattr(wallet, "WEBHOOK_SECRET", "")
    assert wallet.verify_webhook_signature(b"anything", "sig") is False
