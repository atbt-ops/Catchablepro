"""Sanitize employer-supplied rich text before it is ever stored or rendered.

Job descriptions come from a contenteditable editor, so the payload is HTML the
client controls. Rendering that unescaped would be stored XSS, so everything is
run through a strict allowlist: only formatting tags survive, all attributes are
dropped except a scheme-checked ``href``.
"""
from __future__ import annotations

import re
from html import escape

# Bleach strips disallowed *tags* but keeps their text, so a pasted
# "<script>alert(1)</script>" would survive as the visible words "alert(1)".
# Remove these elements along with their contents before cleaning.
_DROP_WITH_CONTENT = re.compile(
    r"<\s*(script|style|iframe|object|embed|noscript)\b.*?<\s*/\s*\1\s*>",
    re.IGNORECASE | re.DOTALL,
)

try:
    import bleach

    _HAS_BLEACH = True
except ImportError:  # pragma: no cover - fallback keeps us safe, never unsafe
    _HAS_BLEACH = False

ALLOWED_TAGS = [
    "p", "br", "b", "strong", "i", "em", "u",
    "ul", "ol", "li", "blockquote", "h3", "h4", "a",
]
ALLOWED_ATTRS = {"a": ["href", "title"]}
ALLOWED_PROTOCOLS = ["http", "https", "mailto"]


def sanitize_html(value: str) -> str:
    """Return ``value`` with only allowlisted formatting tags left intact."""
    if not value:
        return ""
    if not _HAS_BLEACH:
        # Without a vetted sanitizer, degrade to plain text rather than risk XSS.
        return escape(value)
    value = _DROP_WITH_CONTENT.sub("", value)
    return bleach.clean(
        value,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRS,
        protocols=ALLOWED_PROTOCOLS,
        strip=True,
    ).strip()


def is_effectively_empty(html: str) -> bool:
    """True when the markup carries no visible text (e.g. '<p><br></p>')."""
    if not html:
        return True
    if _HAS_BLEACH:
        text = bleach.clean(html, tags=[], strip=True)
    else:
        text = html
    return not text.replace("&nbsp;", " ").strip()
