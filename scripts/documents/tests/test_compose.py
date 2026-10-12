"""Cover compose + DOCX footer patch tests."""

from __future__ import annotations

import zipfile
from pathlib import Path

import yaml

from scripts.documents.docx_postprocess import patch_docx_header_footer
from scripts.documents.md_compose import compose_markdown
from scripts.documents.validator import REPO_ROOT

FIXTURE_YAML = REPO_ROOT / "docs/external/sources/EXT-FIXTURE-001/dossier.yaml"
FIXTURE_MD = REPO_ROOT / "docs/external/sources/EXT-FIXTURE-001/dossier.md"


def test_compose_includes_cover_and_icon(tmp_path):
    data = yaml.safe_load(FIXTURE_YAML.read_text(encoding="utf-8"))
    composed, tmp_dir = compose_markdown(data, FIXTURE_MD)
    text = composed.read_text(encoding="utf-8")
    assert "EXT-FIXTURE-001" in text
    assert "vamula-iconmark.png" in text
    assert (tmp_dir / "vamula-iconmark.png").is_file()
    assert "## Objectivo" in text or "## Identificação" in text
    assert "body_preamble" not in text
    assert text.count("| Campo | Valor |") >= 1
    from scripts.documents.md_compose import cleanup_compose_dir

    cleanup_compose_dir(tmp_dir)


def test_patch_footer_replaces_demo(tmp_path):
    docx = tmp_path / "t.docx"
    footer_xml = """<?xml version="1.0"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:p><w:r><w:t>EXT-YYYY-MM-DD-EXAMPLE · v0.1 · EXTERNAL-CONFIDENTIAL</w:t></w:r></w:p>
</w:ftr>"""
    with zipfile.ZipFile(docx, "w") as z:
        z.writestr("word/footer2.xml", footer_xml)
        z.writestr("[Content_Types].xml", "<Types/>")
    data = {
        "external_id": "EXT-FIXTURE-001",
        "version": "v0.1",
        "confidentiality": "INTERNAL",
    }
    patch_docx_header_footer(docx, data)
    with zipfile.ZipFile(docx) as z:
        out = z.read("word/footer2.xml").decode("utf-8")
    assert "EXT-FIXTURE-001" in out
    assert "INTERNAL" in out
    assert "EXT-YYYY-MM-DD-EXAMPLE" not in out
