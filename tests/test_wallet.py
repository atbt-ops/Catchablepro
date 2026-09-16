"""app/wallet.py and the /employer/wallet* routes.

The pure module tests (order creation, signature verification) don't need a
DB or a live Razorpay account. The route tests below add the top-up flow:
create an order, confirm payment, credit the balance — exercised the same
way tests/test_pricing.py exercises the job-status/sweep routes.
"""
import hashlib
import hmac
import sqlite3

import httpx
import pytest

from app import db as dbmod
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


# --------------------------------------------------------------------------- #
# Route tests: /employer/wallet, /employer/wallet/topup, /employer/wallet/verify
# --------------------------------------------------------------------------- #
def _stub_create_order(monkeypatch, order_id="order_xyz"):
    monkeypatch.setattr(
        wallet, "create_order", lambda amount_paise, receipt: {"id": order_id, "amount": amount_paise}
    )


def _wallet_balance_paise(email: str) -> int:
    conn = sqlite3.connect(dbmod.DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute(
        "SELECT c.wallet_balance_paise FROM company_profiles c "
        "JOIN users u ON u.id = c.user_id WHERE u.email = ?",
        (email,),
    ).fetchone()
    conn.close()
    return row["wallet_balance_paise"]


def _wallet_tx_rows(email: str):
    conn = sqlite3.connect(dbmod.DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT t.* FROM wallet_transactions t JOIN users u ON u.id = t.user_id "
        "WHERE u.email = ? ORDER BY t.id",
        (email,),
    ).fetchall()
    conn.close()
    return rows


def _sign(order_id: str, payment_id: str, secret: str = "testsecret") -> str:
    return hmac.new(
        secret.encode(), f"{order_id}|{payment_id}".encode(), hashlib.sha256
    ).hexdigest()


def test_wallet_page_shows_not_configured_notice(client, register):
    register("nopay@x.io", "employer", company_name="NoPayCo")
    page = client.get("/employer/wallet").text
    assert "aren't set up" in page


def test_wallet_page_shows_balance_and_presets_when_configured(monkeypatch, client, register):
    _configure(monkeypatch)
    register("pay@x.io", "employer", company_name="PayCo")
    page = client.get("/employer/wallet").text
    assert "₹0" in page
    assert "data-topup-amount" in page


def test_topup_creates_an_order_and_a_pending_transaction(monkeypatch, client, register, post):
    _configure(monkeypatch)
    _stub_create_order(monkeypatch, order_id="order_111")
    register("topup1@x.io", "employer", company_name="Topup1Co")

    resp = post("/employer/wallet/topup", data={"amount_paise": "50000"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["order_id"] == "order_111"
    assert body["key_id"] == "rzp_test_abc"
    assert body["amount_paise"] == 50000

    rows = _wallet_tx_rows("topup1@x.io")
    assert len(rows) == 1
    assert rows[0]["type"] == "topup"
    assert rows[0]["status"] == "created"
    assert rows[0]["amount_paise"] == 50000
    assert rows[0]["razorpay_order_id"] == "order_111"


def test_topup_rejects_amount_outside_bounds(monkeypatch, client, register, post):
    _configure(monkeypatch)
    _stub_create_order(monkeypatch)
    register("topup2@x.io", "employer", company_name="Topup2Co")

    too_small = post("/employer/wallet/topup", data={"amount_paise": "100"})
    too_big = post("/employer/wallet/topup", data={"amount_paise": str(wallet.MAX_TOPUP_PAISE + 1)})

    assert too_small.status_code == 400
    assert too_big.status_code == 400
    assert _wallet_tx_rows("topup2@x.io") == []


def test_topup_without_configuration_is_refused(monkeypatch, client, register, post):
    monkeypatch.setattr(wallet, "KEY_ID", "")
    monkeypatch.setattr(wallet, "KEY_SECRET", "")
    register("topup3@x.io", "employer", company_name="Topup3Co")

    resp = post("/employer/wallet/topup", data={"amount_paise": "50000"})

    assert resp.status_code == 503


def test_verify_credits_the_balance_on_a_valid_signature(monkeypatch, client, register, post):
    _configure(monkeypatch)
    _stub_create_order(monkeypatch, order_id="order_222")
    register("verify1@x.io", "employer", company_name="Verify1Co")
    post("/employer/wallet/topup", data={"amount_paise": "150000"})

    signature = _sign("order_222", "pay_222")
    resp = post("/employer/wallet/verify", data={
        "razorpay_order_id": "order_222",
        "razorpay_payment_id": "pay_222",
        "razorpay_signature": signature,
    })

    assert resp.status_code == 200
    assert resp.json() == {"ok": True}
    assert _wallet_balance_paise("verify1@x.io") == 150000
    row = _wallet_tx_rows("verify1@x.io")[0]
    assert row["status"] == "paid"
    assert row["razorpay_payment_id"] == "pay_222"


def test_verify_rejects_a_tampered_signature(monkeypatch, client, register, post):
    _configure(monkeypatch)
    _stub_create_order(monkeypatch, order_id="order_333")
    register("verify2@x.io", "employer", company_name="Verify2Co")
    post("/employer/wallet/topup", data={"amount_paise": "50000"})

    resp = post("/employer/wallet/verify", data={
        "razorpay_order_id": "order_333",
        "razorpay_payment_id": "pay_333",
        "razorpay_signature": "not-the-real-signature",
    })

    assert resp.status_code == 400
    assert _wallet_balance_paise("verify2@x.io") == 0
    assert _wallet_tx_rows("verify2@x.io")[0]["status"] == "created"


def test_verify_is_idempotent(monkeypatch, client, register, post):
    """A second confirmation for the same order (e.g. webhook + client both
    firing) must not double-credit the wallet."""
    _configure(monkeypatch)
    _stub_create_order(monkeypatch, order_id="order_444")
    register("verify3@x.io", "employer", company_name="Verify3Co")
    post("/employer/wallet/topup", data={"amount_paise": "50000"})
    signature = _sign("order_444", "pay_444")
    data = {
        "razorpay_order_id": "order_444",
        "razorpay_payment_id": "pay_444",
        "razorpay_signature": signature,
    }

    first = post("/employer/wallet/verify", data=data)
    second = post("/employer/wallet/verify", data=data)

    assert first.status_code == 200 and second.status_code == 200
    assert _wallet_balance_paise("verify3@x.io") == 50000  # not 100000


def test_verify_without_csrf_is_rejected(client, register):
    register("verify4@x.io", "employer", company_name="Verify4Co")
    resp = client.post("/employer/wallet/verify", data={
        "razorpay_order_id": "order_1", "razorpay_payment_id": "pay_1",
        "razorpay_signature": "sig",
    })
    assert resp.status_code == 403


def test_dashboard_shows_the_wallet_balance(monkeypatch, client, register, post):
    _configure(monkeypatch)
    _stub_create_order(monkeypatch, order_id="order_555")
    register("dash@x.io", "employer", company_name="DashCo")
    post("/employer/wallet/topup", data={"amount_paise": "75000"})
    signature = _sign("order_555", "pay_555")
    post("/employer/wallet/verify", data={
        "razorpay_order_id": "order_555", "razorpay_payment_id": "pay_555",
        "razorpay_signature": signature,
    })

    page = client.get("/employer").text
    assert "Wallet balance" in page
    assert "₹750" in page
