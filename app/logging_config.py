"""Structured logging: one JSON object per line, carrying a request id.

Plain text logs are readable by a person watching a terminal and close to
useless afterwards. A log destination can only filter, group and alert on
fields it can parse, so every record is emitted as a single JSON object.

The field that makes the rest worth having is ``request_id``: it ties every
line produced while serving one request — including an exception traceback —
back to the request a user is complaining about. It travels in a
:class:`~contextvars.ContextVar` so application code logs normally and never
has to thread an id through its call signatures.
"""
from __future__ import annotations

import json
import logging
import sys
from contextvars import ContextVar

#: Set per request by the middleware in :mod:`app.main`; empty outside one.
request_id_var: ContextVar[str] = ContextVar("request_id", default="")

#: Marks the handler this module installs, so configuring twice replaces it
#: rather than doubling every line.
_HANDLER_NAME = "catchablepro-json"

# Record attributes present on every LogRecord. Anything else was attached by
# the caller through `extra=` and belongs in the emitted object.
_STANDARD_FIELDS = frozenset(
    logging.LogRecord("", 0, "", 0, "", None, None).__dict__
) | {
    "asctime",
    "message",
    "taskName",
    # uvicorn duplicates its own message here wrapped in ANSI colour codes.
    "color_message",
}


class JsonFormatter(logging.Formatter):
    """Render a record as one JSON object on one line."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }

        request_id = getattr(record, "request_id", "") or request_id_var.get()
        if request_id:
            payload["request_id"] = request_id

        # Fields passed as logger.info(..., extra={"path": "/x"}) land directly
        # on the record; carry them through so they stay queryable.
        for key, value in record.__dict__.items():
            if key not in _STANDARD_FIELDS and key != "request_id":
                payload[key] = value

        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        if record.stack_info:
            payload["stack"] = self.formatStack(record.stack_info)

        # default=str so an unexpected object degrades to its repr instead of
        # raising inside the logger and losing the record entirely.
        return json.dumps(payload, default=str)


def configure(level: int | str = logging.INFO) -> logging.Handler:
    """Send every log record through one JSON handler on stdout.

    Idempotent: calling it again replaces the handler it installed before.
    """
    root = logging.getLogger()
    for existing in list(root.handlers):
        if getattr(existing, "name", None) == _HANDLER_NAME:
            root.removeHandler(existing)

    handler = logging.StreamHandler(sys.stdout)
    handler.name = _HANDLER_NAME
    handler.setFormatter(JsonFormatter())
    root.addHandler(handler)
    root.setLevel(level)

    # app.mailer attaches a plain-text handler at import time so its output is
    # visible when nothing has configured logging. Something has now, and
    # leaving it attached would print every mailer line twice, in two formats.
    mailer_log = logging.getLogger("catchablepro.mailer")
    for existing in list(mailer_log.handlers):
        mailer_log.removeHandler(existing)

    # Let uvicorn's own records through this handler rather than its private
    # ones, and drop its access log: the middleware emits a richer line for the
    # same request, and two access logs are worse than one.
    for name in ("uvicorn", "uvicorn.error"):
        uvicorn_log = logging.getLogger(name)
        uvicorn_log.handlers = []
        uvicorn_log.propagate = True
    logging.getLogger("uvicorn.access").disabled = True

    return handler
