"""Extract plain text from an uploaded resume file.

Supports .txt/.md natively, and .pdf/.docx when the optional parsers are
installed (pypdf, python-docx). Any failure degrades gracefully to "".
"""
from __future__ import annotations

from pathlib import Path


def extract_text(path: Path) -> str:
    suffix = path.suffix.lower()
    try:
        if suffix in (".txt", ".md", ".text"):
            return path.read_text(encoding="utf-8", errors="ignore")
        if suffix == ".pdf":
            return _from_pdf(path)
        if suffix in (".docx",):
            return _from_docx(path)
        # Unknown type: try as UTF-8 text, else give up.
        return path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""


def _from_pdf(path: Path) -> str:
    try:
        from pypdf import PdfReader
    except ImportError:
        return ""
    reader = PdfReader(str(path))
    return "\n".join((page.extract_text() or "") for page in reader.pages)


def _from_docx(path: Path) -> str:
    try:
        import docx  # python-docx
    except ImportError:
        return ""
    document = docx.Document(str(path))
    return "\n".join(p.text for p in document.paragraphs)
