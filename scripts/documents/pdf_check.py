"""Lightweight PDF structural checks (no OCR)."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass
class PdfCheckResult:
    ok: bool
    size_bytes: int
    page_count: int | None
    messages: list[str]


def validate_pdf_file(path: Path) -> PdfCheckResult:
    messages: list[str] = []
    if not path.is_file():
        return PdfCheckResult(False, 0, None, ["file missing"])

    data = path.read_bytes()
    size = len(data)
    if size == 0:
        return PdfCheckResult(False, 0, None, ["empty file"])

    if not data.startswith(b"%PDF-"):
        return PdfCheckResult(False, size, None, ["missing %PDF- header"])

    page_count: int | None = None
    try:
        from pypdf import PdfReader

        reader = PdfReader(str(path))
        page_count = len(reader.pages)
        if page_count < 1:
            messages.append("page count is zero")
    except ImportError:
        messages.append("pypdf not installed; skipped page count")
    except Exception as exc:  # noqa: BLE001 — broad for corrupt PDF
        messages.append(f"pdf read error: {exc}")

    ok = not any("zero" in m or "missing" in m or "error" in m for m in messages)
    if page_count is not None and page_count < 1:
        ok = False
    if ok and not messages:
        messages.append("pdf header OK")
    return PdfCheckResult(ok=ok, size_bytes=size, page_count=page_count, messages=messages)


def extract_pdf_text(path: Path, max_pages: int = 20) -> str:
    try:
        from pypdf import PdfReader

        reader = PdfReader(str(path))
        parts: list[str] = []
        for i, page in enumerate(reader.pages):
            if i >= max_pages:
                break
            parts.append(page.extract_text() or "")
        return "\n".join(parts)
    except Exception:
        return ""
