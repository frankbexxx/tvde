"""Compose dossier Markdown (cover + body) from YAML + source MD."""

from __future__ import annotations

import re
import tempfile
from pathlib import Path
from typing import Any

PROFILE_DOCUMENT_TYPE = {
    "legal": "Consulta jurídica TVDE",
    "fiscal": "Consulta fiscal TVDE",
    "insurance": "Consulta seguradora TVDE",
    "regulator": "Comunicação regulador TVDE",
    "generic": "Dossier de consulta externa",
}

COVER_TEMPLATE = Path(__file__).resolve().parents[2] / "docs/external/brand/cover_preamble.md"
ICONMARK = Path(__file__).resolve().parents[2] / "docs/external/brand/assets/vamula-iconmark.png"


def _strip_leading_yaml_front_matter(md: str) -> str:
    if md.startswith("---"):
        end = md.find("\n---", 3)
        if end != -1:
            return md[end + 4 :].lstrip("\n")
    return md


def compose_markdown(data: dict[str, Any], body_md_path: Path) -> tuple[Path, Path]:
    """Return (composed_md_path, temp_dir) — caller may use temp_dir for cleanup."""
    if not COVER_TEMPLATE.is_file():
        raise FileNotFoundError(f"missing cover template: {COVER_TEMPLATE}")
    if not ICONMARK.is_file():
        raise FileNotFoundError(f"missing iconmark: {ICONMARK}")

    profile = str(data.get("profile", "generic"))
    doc_type = PROFILE_DOCUMENT_TYPE.get(profile, PROFILE_DOCUMENT_TYPE["generic"])

    replacements = {
        "{{ICONMARK_PATH}}": "vamula-iconmark.png",
        "{{DOCUMENT_TYPE}}": doc_type,
        "{{TITLE}}": str(data.get("title", "")),
        "{{AUDIENCE}}": str(data.get("audience", "")),
        "{{EXTERNAL_ID}}": str(data.get("external_id", "")),
        "{{VERSION}}": str(data.get("version", "")),
        "{{UPDATED}}": str(data.get("updated", "")),
        "{{CONFIDENTIALITY}}": str(data.get("confidentiality", "")),
    }

    cover = COVER_TEMPLATE.read_text(encoding="utf-8")
    for key, val in replacements.items():
        cover = cover.replace(key, val)

    body = _strip_leading_yaml_front_matter(body_md_path.read_text(encoding="utf-8"))

    tmp = Path(tempfile.mkdtemp(prefix="tvde-dossier-md-"))
    icon_dest = tmp / "vamula-iconmark.png"
    icon_dest.write_bytes(ICONMARK.read_bytes())
    composed = tmp / "dossier.composed.md"
    composed.write_text(cover + "\n" + body, encoding="utf-8")
    return composed, tmp


def cleanup_compose_dir(tmp_dir: Path) -> None:
    import shutil

    shutil.rmtree(tmp_dir, ignore_errors=True)
