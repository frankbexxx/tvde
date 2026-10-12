"""DOCX layout post-process tests."""

from __future__ import annotations

import zipfile
from pathlib import Path

from scripts.documents.docx_layout import _match_widths, _patch_single_table, patch_docx_layout


def test_match_decision_table_profile():
    w = _match_widths(("Ref. interna", "Decisão (resumo)", "Data", "Impacto para este dossier"))
    assert w is not None
    assert len(w) == 4
    assert sum(w) >= 8800


def test_patch_table_sets_fixed_layout():
    tbl = """<w:tbl>
      <w:tblPr><w:tblStyle w:val="Table"/></w:tblPr>
      <w:tblGrid><w:gridCol w:w="576"/><w:gridCol w:w="2592"/></w:tblGrid>
      <w:tr><w:tc><w:tcPr><w:tcW w:w="576" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>ID</w:t></w:r></w:p></w:tc>
      <w:tc><w:p><w:r><w:t>Resumo</w:t></w:r></w:p></w:tc>
      <w:tc><w:p><w:r><w:t>Prioridade interna</w:t></w:r></w:p></w:tc>
      <w:tc><w:p><w:r><w:t>Impacto</w:t></w:r></w:p></w:tc></w:tr>
    </w:tbl>"""
    out = _patch_single_table(tbl)
    assert 'tblLayout w:type="fixed"' in out
    assert "tblHeader" in out
    assert "w:val=\"top\"" in out


def test_patch_docx_layout_on_minimal_docx(tmp_path: Path):
    docx = tmp_path / "t.docx"
    document = """<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body><w:tbl>
<w:tblPr></w:tblPr><w:tblGrid><w:gridCol w:w="1000"/></w:tblGrid>
<w:tr><w:tc><w:p><w:r><w:t>Campo</w:t></w:r></w:p></w:tc>
<w:tc><w:p><w:r><w:t>Valor</w:t></w:r></w:p></w:tc></w:tr>
</w:tbl></w:body></w:document>"""
    with zipfile.ZipFile(docx, "w") as z:
        z.writestr("word/document.xml", document)
        z.writestr("[Content_Types].xml", "<Types/>")
    patch_docx_layout(docx)
    with zipfile.ZipFile(docx) as z:
        xml = z.read("word/document.xml").decode("utf-8")
    assert 'tblLayout w:type="fixed"' in xml
    assert "8890" in xml or "2200" in xml
