"""Heuristic PT date extraction from pasted PDF text (MVP; no binary PDF parser)."""

from __future__ import annotations

import re
from datetime import date


_DATE_PATTERNS = [
    re.compile(
        r"\b(?:validade|válida\s+até|válido\s+até|expira|expir[ea])\s*[:\s-]*"
        r"(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b",
        re.IGNORECASE,
    ),
    re.compile(r"\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b"),
    re.compile(r"\b(20\d{2})-(\d{2})-(\d{2})\b"),
]


def _to_iso(d: date) -> str:
    return d.isoformat()


def suggest_expiry_iso_from_text(text: str) -> str | None:
    """Return YYYY-MM-DD for the latest plausible date mention, or None."""
    if not text or not text.strip():
        return None
    found: list[date] = []
    for rx in _DATE_PATTERNS:
        for m in rx.finditer(text):
            g = m.groups()
            try:
                if len(g) == 3 and len(g[0]) == 4 and g[0].startswith("20"):
                    y, mo, d = int(g[0]), int(g[1]), int(g[2])
                else:
                    d, mo, y = int(g[0]), int(g[1]), int(g[2])
                    if y < 100:
                        y += 2000
                cand = date(y, mo, d)
                if 1990 <= y <= 2100:
                    found.append(cand)
            except (ValueError, IndexError):
                continue
    if not found:
        return None
    return _to_iso(max(found))
