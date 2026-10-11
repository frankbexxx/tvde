"""Minimal DOCX post-process: footer metadata from dossier YAML."""

from __future__ import annotations

import re
import zipfile
from pathlib import Path
from typing import Any


def _replace_footer_line(xml: str, line1: str) -> str:
    """Replace demo footer text while preserving PAGE/NUMPAGES fields."""
    if "EXT-YYYY-MM-DD-EXAMPLE" in xml:
        return re.sub(
            r"(<w:t[^>]*>)([^<]*EXT-YYYY-MM-DD-EXAMPLE[^<]*)(</w:t>)",
            lambda m: f"{m.group(1)}{line1}{m.group(3)}",
            xml,
            count=1,
        )
    return xml


def patch_docx_header_footer(docx_path: Path, data: dict[str, Any]) -> None:
    external_id = str(data.get("external_id", ""))
    version = str(data.get("version", ""))
    confidentiality = str(data.get("confidentiality", ""))
    footer_line = f"{external_id} · {version} · {confidentiality}"

    with zipfile.ZipFile(docx_path, "r") as zin:
        names = zin.namelist()
        buffers = {name: zin.read(name) for name in names}

    for name in names:
        if not name.startswith("word/footer") or not name.endswith(".xml"):
            continue
        raw = buffers[name].decode("utf-8")
        updated = _replace_footer_line(raw, footer_line)
        if updated != raw:
            buffers[name] = updated.encode("utf-8")

    tmp = docx_path.with_suffix(".patched.docx")
    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        for name, content in buffers.items():
            zout.writestr(name, content)
    tmp.replace(docx_path)
