"""Compose dossier Markdown (cover + body) from YAML + source MD."""

from __future__ import annotations

import re
import tempfile
from pathlib import Path
from typing import Any

from scripts.documents.q_ext_titles import external_question_heading

PROFILE_DOCUMENT_TYPE = {
    "legal": "Consulta jurídica TVDE",
    "fiscal": "Consulta fiscal TVDE",
    "insurance": "Consulta seguradora TVDE",
    "regulator": "Comunicação regulador TVDE",
    "generic": "Dossier de consulta externa",
}

BRAND_DIR = Path(__file__).resolve().parents[2] / "docs/external/brand"
COVER_TEMPLATE = BRAND_DIR / "cover_preamble.md"
BODY_PREAMBLE = BRAND_DIR / "body_preamble.md"
ICONMARK = BRAND_DIR / "assets/vamula-iconmark.png"

_RE_CORPO_H1 = re.compile(
    r"^#\s+Corpo do dossier[^\n]*\n+",
    re.IGNORECASE | re.MULTILINE,
)
_RE_QEXT_BLOCK = re.compile(
    r"^###\s+(Q-EXT-[A-Z]+-\d{3})\s*\n\n"
    r"::: \{custom-style=\"Q-EXT ID\"\}\s*\n\1\s*\n:::\s*\n\n",
    re.MULTILINE,
)
_RE_FACT_LINE = re.compile(r"^\*\*([^*]+)\.\*\*\s*(.*)$")
_RE_TABLE_ID_HEADER = re.compile(
    r"^(\|\s*)ID(\s*\|)",
    re.MULTILINE,
)


def _strip_leading_yaml_front_matter(md: str) -> str:
    if md.startswith("---"):
        end = md.find("\n---", 3)
        if end != -1:
            return md[end + 4 :].lstrip("\n")
    return md


def _apply_template(text: str, replacements: dict[str, str]) -> str:
    for key, val in replacements.items():
        text = text.replace(key, val)
    return text


def strip_corpo_heading(md: str) -> str:
    return _RE_CORPO_H1.sub("", md, count=1)


def rename_table_ref_column(md: str) -> str:
    """Present decision/finding IDs as «Ref. interna» in table headers."""
    return _RE_TABLE_ID_HEADER.sub(r"\1Ref. interna\2", md)


def transform_q_ext_sections(md: str, data: dict[str, Any]) -> str:
    q_list = list(data.get("q_ext") or [])
    if not q_list:
        return md
    overrides = data.get("q_ext_titles") if isinstance(data.get("q_ext_titles"), dict) else None
    order = {qid: i + 1 for i, qid in enumerate(q_list)}

    def repl(match: re.Match[str]) -> str:
        qid = match.group(1)
        idx = order.get(qid)
        if idx is None:
            return match.group(0)
        heading = external_question_heading(idx, qid, overrides)
        return (
            f"### {heading}\n\n"
            f'::: {{custom-style="Q-EXT Ref"}}\n'
            f"Referência interna: {qid}\n"
            f":::\n\n"
        )

    return _RE_QEXT_BLOCK.sub(repl, md)


def _transform_fact_line(line: str) -> str | None:
    m = _RE_FACT_LINE.match(line.strip())
    if not m:
        return None
    label, rest = m.group(1).strip(), m.group(2).strip()
    blocks = [
        f'::: {{custom-style="Fact Label"}}\n{label}\n:::',
    ]
    if rest:
        blocks.append(f'::: {{custom-style="Fact Body"}}\n{rest}\n:::')
    return "\n\n".join(blocks) + "\n"


def transform_factual_context_blocks(md: str) -> str:
    """Style «**Label.** description» lines in context sections (build-time presentation)."""
    lines = md.splitlines(keepends=True)
    out: list[str] = []
    in_context = False
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        if stripped.startswith("## ") and "contexto" in stripped.lower():
            in_context = True
            out.append(line)
            i += 1
            continue
        if in_context and stripped.startswith("## "):
            in_context = False
        if in_context and stripped and not stripped.startswith("-") and not stripped.startswith("|"):
            fact = _transform_fact_line(stripped)
            if fact:
                out.append(fact + "\n")
                i += 1
                continue
        out.append(line)
        i += 1
    return "".join(out)


def prepare_body_markdown(md: str, data: dict[str, Any]) -> str:
    md = strip_corpo_heading(md)
    md = rename_table_ref_column(md)
    md = transform_factual_context_blocks(md)
    md = transform_q_ext_sections(md, data)
    return md


def compose_markdown(data: dict[str, Any], body_md_path: Path) -> tuple[Path, Path]:
    """Return (composed_md_path, temp_dir) — caller may use temp_dir for cleanup."""
    if not COVER_TEMPLATE.is_file():
        raise FileNotFoundError(f"missing cover template: {COVER_TEMPLATE}")
    if not BODY_PREAMBLE.is_file():
        raise FileNotFoundError(f"missing body preamble: {BODY_PREAMBLE}")
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

    cover = _apply_template(COVER_TEMPLATE.read_text(encoding="utf-8"), replacements)
    body_pre = _apply_template(BODY_PREAMBLE.read_text(encoding="utf-8"), replacements)

    raw_body = _strip_leading_yaml_front_matter(body_md_path.read_text(encoding="utf-8"))
    body = prepare_body_markdown(raw_body, data)

    tmp = Path(tempfile.mkdtemp(prefix="tvde-dossier-md-"))
    icon_dest = tmp / "vamula-iconmark.png"
    icon_dest.write_bytes(ICONMARK.read_bytes())
    composed = tmp / "dossier.composed.md"
    composed.write_text(cover + "\n" + body_pre + "\n" + body, encoding="utf-8")
    return composed, tmp


def cleanup_compose_dir(tmp_dir: Path) -> None:
    import shutil

    shutil.rmtree(tmp_dir, ignore_errors=True)
