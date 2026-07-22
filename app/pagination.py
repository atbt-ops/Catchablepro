"""Tiny pagination helper shared by the list views."""
from __future__ import annotations

from dataclasses import dataclass
from typing import List, Sequence


@dataclass
class Page:
    """Page metadata for rendering a pager and slicing a result set."""

    page: int
    per_page: int
    total: int

    @property
    def pages(self) -> int:
        return max(1, -(-self.total // self.per_page))  # ceil division

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.per_page

    @property
    def has_prev(self) -> bool:
        return self.page > 1

    @property
    def has_next(self) -> bool:
        return self.page < self.pages

    @property
    def prev_page(self) -> int:
        return max(1, self.page - 1)

    @property
    def next_page(self) -> int:
        return min(self.pages, self.page + 1)

    @property
    def first_item(self) -> int:
        """1-based index of the first row on this page (0 when empty)."""
        return 0 if not self.total else self.offset + 1

    @property
    def last_item(self) -> int:
        return min(self.offset + self.per_page, self.total)

    def window(self, span: int = 2) -> List[int]:
        """Page numbers to show around the current one."""
        lo = max(1, self.page - span)
        hi = min(self.pages, self.page + span)
        return list(range(lo, hi + 1))

    def slice(self, items: Sequence) -> list:
        """Slice an already-ordered in-memory sequence to this page."""
        return list(items[self.offset:self.offset + self.per_page])


def paginate(total: int, page: int, per_page: int) -> Page:
    """Build a :class:`Page`, clamping ``page`` into a valid range."""
    per_page = max(1, per_page)
    pages = max(1, -(-total // per_page))
    try:
        page = int(page)
    except (TypeError, ValueError):
        page = 1
    page = min(max(1, page), pages)
    return Page(page=page, per_page=per_page, total=total)
