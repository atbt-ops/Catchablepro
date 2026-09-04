"""Structured logs: JSON records, correlated by a request id."""
import json
import logging

from app import logging_config


def _format(record: logging.LogRecord) -> dict:
    return json.loads(logging_config.JsonFormatter().format(record))


def _record(msg="hello", **extra) -> logging.LogRecord:
    record = logging.LogRecord("catchablepro.test", logging.INFO, __file__, 1, msg, None, None)
    record.__dict__.update(extra)
    return record


def test_record_is_one_json_object():
    line = logging_config.JsonFormatter().format(_record())

    assert "\n" not in line
    payload = json.loads(line)
    assert payload["level"] == "INFO"
    assert payload["logger"] == "catchablepro.test"
    assert payload["msg"] == "hello"
    assert payload["ts"]


def test_extra_fields_are_carried_through():
    payload = _format(_record(path="/candidate", status=200))

    assert payload["path"] == "/candidate"
    assert payload["status"] == 200


def test_uvicorns_ansi_duplicate_is_dropped():
    payload = _format(_record("Uvicorn running", color_message="\x1b[1mUvicorn running"))

    assert "color_message" not in payload


def test_request_id_comes_from_the_context():
    token = logging_config.request_id_var.set("abc123")
    try:
        payload = _format(_record())
    finally:
        logging_config.request_id_var.reset(token)

    assert payload["request_id"] == "abc123"


def test_unserialisable_values_do_not_lose_the_record():
    payload = _format(_record(thing=object()))

    assert "object object" in payload["thing"]


def test_exception_is_captured():
    try:
        raise ValueError("boom")
    except ValueError:
        import sys

        record = _record("failed")
        record.exc_info = sys.exc_info()
        payload = _format(record)

    assert "ValueError: boom" in payload["exc"]


def test_configuring_twice_does_not_double_handlers():
    logging_config.configure()
    logging_config.configure()

    ours = [
        h for h in logging.getLogger().handlers
        if getattr(h, "name", None) == logging_config._HANDLER_NAME
    ]
    assert len(ours) == 1


def test_response_carries_a_request_id(client):
    resp = client.get("/healthz")

    assert resp.headers["x-request-id"]


def test_a_proxy_supplied_request_id_is_reused(client):
    resp = client.get("/healthz", headers={"X-Request-ID": "trace-0001"})

    assert resp.headers["x-request-id"] == "trace-0001"


def test_a_forged_request_id_is_replaced(client):
    forged = 'evil"\ninjected log line'

    resp = client.get("/healthz", headers={"X-Request-ID": forged})

    assert resp.headers["x-request-id"] != forged
    assert "\n" not in resp.headers["x-request-id"]


def test_requests_are_logged_with_their_outcome(client, caplog):
    with caplog.at_level(logging.INFO, logger="catchablepro.access"):
        client.get("/healthz")

    logged = [r for r in caplog.records if r.name == "catchablepro.access"]
    assert logged, "no access log record emitted"
    record = logged[-1]
    assert record.method == "GET"
    assert record.path == "/healthz"
    assert record.status == 200
    assert record.duration_ms >= 0
