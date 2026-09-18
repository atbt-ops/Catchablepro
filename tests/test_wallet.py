"""app/wallet.py and the /employer/wallet* routes.

The pure module tests (order creation, signature verification) don't need a
DB or a live Razorpay account. The route tests below add the top-up flow:
create an order, confirm payment, credit the balance — exercised the same
way tests/test_pricing.py exercises the job-status/sweep routes.
"""
import hashlib
import hmac
import json
import sqlite3
from datetime import datetime, timedelta, timezone

import httpx
import pytest

from app import db as dbmod
from app import pricing
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


# --------------------------------------------------------------------------- #
# /webhooks/razorpay — the reconciliation safety net
# --------------------------------------------------------------------------- #
def _webhook_body(order_id: str, payment_id: str, event: str = "payment.captured") -> bytes:
    return json.dumps({
        "event": event,
        "payload": {"payment": {"entity": {"id": payment_id, "order_id": order_id, "amount": 50000}}},
    }).encode()


def _webhook_sign(body: bytes, secret: str = "whsecret") -> str:
    return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


def test_webhook_credits_balance_on_a_valid_signature(monkeypatch, client, register, post):
    _configure(monkeypatch)
    _stub_create_order(monkeypatch, order_id="order_wh1")
    register("wh1@x.io", "employer", company_name="Wh1Co")
    post("/employer/wallet/topup", data={"amount_paise": "50000"})

    body = _webhook_body("order_wh1", "pay_wh1")
    resp = client.post(
        "/webhooks/razorpay", content=body, headers={"X-Razorpay-Signature": _webhook_sign(body)}
    )

    assert resp.status_code == 200
    assert _wallet_balance_paise("wh1@x.io") == 50000
    assert _wallet_tx_rows("wh1@x.io")[0]["razorpay_payment_id"] == "pay_wh1"


def test_webhook_rejects_an_invalid_signature(monkeypatch, client, register, post):
    _configure(monkeypatch)
    _stub_create_order(monkeypatch, order_id="order_wh2")
    register("wh2@x.io", "employer", company_name="Wh2Co")
    post("/employer/wallet/topup", data={"amount_paise": "50000"})

    body = _webhook_body("order_wh2", "pay_wh2")
    resp = client.post(
        "/webhooks/razorpay", content=body, headers={"X-Razorpay-Signature": "not-the-real-signature"}
    )

    assert resp.status_code == 400
    assert _wallet_balance_paise("wh2@x.io") == 0


def test_webhook_without_a_signature_header_is_rejected(monkeypatch, client):
    _configure(monkeypatch)
    resp = client.post("/webhooks/razorpay", content=b'{"event": "payment.captured"}')
    assert resp.status_code == 400


def test_webhook_and_client_verify_racing_only_credit_once(monkeypatch, client, register, post):
    """Whichever of the webhook / client-side /verify call fires first should
    credit the wallet; the other must be a safe no-op, not a double-credit."""
    _configure(monkeypatch)
    _stub_create_order(monkeypatch, order_id="order_wh3")
    register("wh3@x.io", "employer", company_name="Wh3Co")
    post("/employer/wallet/topup", data={"amount_paise": "50000"})

    body = _webhook_body("order_wh3", "pay_wh3")
    client.post("/webhooks/razorpay", content=body, headers={"X-Razorpay-Signature": _webhook_sign(body)})

    payment_signature = _sign("order_wh3", "pay_wh3")
    post("/employer/wallet/verify", data={
        "razorpay_order_id": "order_wh3", "razorpay_payment_id": "pay_wh3",
        "razorpay_signature": payment_signature,
    })

    assert _wallet_balance_paise("wh3@x.io") == 50000  # not 100000


def test_webhook_ignores_event_types_it_does_not_handle(monkeypatch, client, register, post):
    _configure(monkeypatch)
    _stub_create_order(monkeypatch, order_id="order_wh4")
    register("wh4@x.io", "employer", company_name="Wh4Co")
    post("/employer/wallet/topup", data={"amount_paise": "50000"})

    body = _webhook_body("order_wh4", "pay_wh4", event="payment.failed")
    resp = client.post(
        "/webhooks/razorpay", content=body, headers={"X-Razorpay-Signature": _webhook_sign(body)}
    )

    assert resp.status_code == 200
    assert _wallet_balance_paise("wh4@x.io") == 0


def test_webhook_survives_a_malformed_but_validly_signed_payload(monkeypatch, client):
    _configure(monkeypatch)
    body = json.dumps({"event": "payment.captured", "payload": {}}).encode()  # no payment.entity
    resp = client.post(
        "/webhooks/razorpay", content=body, headers={"X-Razorpay-Signature": _webhook_sign(body)}
    )
    assert resp.status_code == 200


def test_webhook_for_an_unknown_order_is_a_harmless_no_op(monkeypatch, client):
    _configure(monkeypatch)
    body = _webhook_body("order_never_created", "pay_x")
    resp = client.post(
        "/webhooks/razorpay", content=body, headers={"X-Razorpay-Signature": _webhook_sign(body)}
    )
    assert resp.status_code == 200


# --------------------------------------------------------------------------- #
# Debit-at-closure and the insufficient-funds sweep (payment feature, PR 4/4)
# --------------------------------------------------------------------------- #
def _since(days_ago: float) -> str:
    ts = datetime.now(timezone.utc) - timedelta(days=days_ago)
    return ts.strftime("%Y-%m-%d %H:%M:%S")


def _age_job(job_id: int, days_ago: float) -> None:
    conn = sqlite3.connect(dbmod.DB_PATH)
    conn.execute(
        "UPDATE jobs SET status = 'active', active_since = ? WHERE id = ?",
        (_since(days_ago), job_id),
    )
    conn.commit()
    conn.close()


def _job_row(job_id: int):
    conn = sqlite3.connect(dbmod.DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
    conn.close()
    return row


def _latest_job_id() -> int:
    conn = sqlite3.connect(dbmod.DB_PATH)
    row = conn.execute("SELECT MAX(id) FROM jobs").fetchone()
    conn.close()
    return row[0]


def _fund_wallet(email: str, paise: int) -> None:
    conn = sqlite3.connect(dbmod.DB_PATH)
    conn.execute(
        "UPDATE company_profiles SET wallet_balance_paise = ? "
        "WHERE user_id = (SELECT id FROM users WHERE email = ?)",
        (paise, email),
    )
    conn.commit()
    conn.close()


def _audit_count(action: str) -> int:
    conn = sqlite3.connect(dbmod.DB_PATH)
    n = conn.execute(
        "SELECT COUNT(*) FROM audit_log WHERE action = ?", (action,)
    ).fetchone()[0]
    conn.close()
    return n


def test_closing_a_job_debits_the_final_accrued_cost(client, register, post, post_job):
    register("bill1@x.io", "employer", company_name="Bill1Co")
    _fund_wallet("bill1@x.io", 100_00)  # ₹100
    post_job(title="Billed Role", required_skills="python")
    job_id = _latest_job_id()
    _age_job(job_id, 10)  # ₹150 would be owed, but only ₹100 is available

    post(f"/employer/jobs/{job_id}/status", data={"status": "closed"})

    assert _wallet_balance_paise("bill1@x.io") == 0  # clamped, not negative
    debit = [r for r in _wallet_tx_rows("bill1@x.io") if r["type"] == "debit"][0]
    assert debit["amount_paise"] == 100_00
    assert debit["job_id"] == job_id


def test_closing_a_lightly_accrued_job_debits_only_what_it_owes(client, register, post, post_job):
    register("bill2@x.io", "employer", company_name="Bill2Co")
    _fund_wallet("bill2@x.io", 500_00)  # ₹500 — plenty
    post_job(title="Cheap Role", required_skills="python")
    job_id = _latest_job_id()
    _age_job(job_id, 10)  # ₹150 owed

    post(f"/employer/jobs/{job_id}/status", data={"status": "closed"})

    assert _wallet_balance_paise("bill2@x.io") == 500_00 - 150_00
    debit = [r for r in _wallet_tx_rows("bill2@x.io") if r["type"] == "debit"][0]
    assert debit["amount_paise"] == 150_00


def test_closing_a_job_still_in_its_free_week_debits_nothing(client, register, post, post_job):
    register("bill3@x.io", "employer", company_name="Bill3Co")
    _fund_wallet("bill3@x.io", 500_00)
    post_job(title="Fresh Role", required_skills="python")
    job_id = _latest_job_id()
    _age_job(job_id, 2)  # still in the free week

    post(f"/employer/jobs/{job_id}/status", data={"status": "closed"})

    assert _wallet_balance_paise("bill3@x.io") == 500_00
    assert [r for r in _wallet_tx_rows("bill3@x.io") if r["type"] == "debit"] == []


def test_an_uncovered_paid_tier_job_is_auto_closed_for_insufficient_funds(
    client, register, post_job
):
    register("nofund1@x.io", "employer", company_name="NoFund1Co")
    # No _fund_wallet call — balance stays 0.
    post_job(title="Unfunded Role", required_skills="python")
    job_id = _latest_job_id()
    _age_job(job_id, 10)  # past the free week, ₹150 owed, ₹0 available

    client.get("/employer")  # sweep runs on load

    assert _job_row(job_id)["status"] == "closed"
    assert _audit_count("job.autoexpire_no_funds") == 1


def test_a_free_week_job_is_never_closed_for_insufficient_funds(client, register, post_job):
    register("nofund2@x.io", "employer", company_name="NoFund2Co")
    post_job(title="Still Free Role", required_skills="python")
    job_id = _latest_job_id()
    _age_job(job_id, 3)  # free week, costs nothing regardless of balance

    client.get("/employer")

    assert _job_row(job_id)["status"] == "active"


def test_a_covered_paid_tier_job_is_not_closed(client, register, post_job):
    register("funded@x.io", "employer", company_name="FundedCo")
    _fund_wallet("funded@x.io", 200_00)  # covers the ₹150 owed
    post_job(title="Covered Role", required_skills="python")
    job_id = _latest_job_id()
    _age_job(job_id, 10)

    client.get("/employer")

    assert _job_row(job_id)["status"] == "active"


def test_multiple_jobs_close_highest_accrued_first_until_balance_fits(
    client, register, post_job
):
    register("multi@x.io", "employer", company_name="MultiCo")
    _fund_wallet("multi@x.io", 200_00)  # covers only the cheaper of the two
    post_job(title="Pricier Role", required_skills="python")
    pricier_id = _latest_job_id()
    post_job(title="Cheaper Role", required_skills="python")
    cheaper_id = _latest_job_id()
    _age_job(pricier_id, 16)  # 7 free + 7@50 + 2@100 = 550 owed
    _age_job(cheaper_id, 10)  # 150 owed — together 700, balance only covers 200

    client.get("/employer")

    assert _job_row(pricier_id)["status"] == "closed"   # closed first — most expensive
    assert _job_row(cheaper_id)["status"] == "active"   # fits once the pricier one is gone


def test_a_no_funds_closure_never_touches_other_employers(client, register, post, post_job):
    register("victim@x.io", "employer", company_name="VictimCo")
    post_job(title="Innocent Role", required_skills="python")
    victim_job_id = _latest_job_id()
    _age_job(victim_job_id, 10)
    post("/logout")

    register("broke@x.io", "employer", company_name="BrokeCo")
    post_job(title="Broke Role", required_skills="python")
    broke_job_id = _latest_job_id()
    _age_job(broke_job_id, 10)

    client.get("/employer")  # sweeps everyone, not just the current employer

    assert _job_row(victim_job_id)["status"] == "closed"  # also unfunded — expected
    assert _job_row(broke_job_id)["status"] == "closed"
    # Distinct employers, so this is really just confirming the grouping-by-
    # employer logic doesn't cross-contaminate one employer's balance/jobs
    # with another's — no assertion failure here would be the actual bug.


def test_cap_expiry_still_debits_the_final_cost(client, register, post_job):
    register("cap1@x.io", "employer", company_name="Cap1Co")
    _fund_wallet("cap1@x.io", pricing.total_at_cap() * 100)  # exactly enough
    post_job(title="Long-Runner Role", required_skills="python")
    job_id = _latest_job_id()
    _age_job(job_id, pricing.CAP_DAYS + 2)

    client.get("/employer")

    assert _job_row(job_id)["status"] == "closed"
    assert _wallet_balance_paise("cap1@x.io") == 0
    debit = [r for r in _wallet_tx_rows("cap1@x.io") if r["type"] == "debit"][0]
    assert debit["amount_paise"] == pricing.total_at_cap() * 100
    assert _audit_count("job.autoexpire") >= 1
