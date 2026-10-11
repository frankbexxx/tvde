"""Post-render placeholder scan on DOCX (and optional PDF text)."""

from __future__ import annotations

import re
import zipfile
from pathlib import Path

from scripts.documents.validator import PLACEHOLDER_PATTERNS


def extract_docx_text(docx_path: Path) -> str:
    try:
        with zipfile.ZipFile(docx_path) as zf:
            xml = zf.read("word/document.xml").decode("utf-8", errors="ignore")
    except (KeyError, zipfile.BadZipFile, OSError):
        return ""
    text = re.sub(r"<w:tab[^/]*/>", "\t", xml)
    text = re.sub(r"</w:p>", "\n", text)
    text = re.sub(r"<[^>]+>", "", text)
    return text


def find_placeholders_in_text(text: str) -> list[str]:
    hits: list[str] = []
    for name, pattern in PLACEHOLDER_PATTERNS:
        if pattern.search(text):
            hits.append(name)
    return hits


def assert_no_placeholders_post_render(text: str, *, dossier_status: str) -> None:
    if dossier_status != "APPROVED":
        return
    hits = find_placeholders_in_text(text)
    if hits:
        raise ValueError(
            f"APPROVED dossier: placeholders remain after render: {', '.join(hits)}"
        )
