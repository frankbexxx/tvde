"""Heading2 + table separation in docx_layout."""

from __future__ import annotations

from scripts.documents.docx_layout import (
    _normalize_heading2_ppr,
    _patch_all_heading2_paragraphs,
    _patch_heading2_spacer_before_table,
)


def test_heading2_overrides_style_keep_next():
    xml = """<w:p><w:pPr><w:pStyle w:val="Heading2" /><w:keepNext/></w:pPr><w:r><w:t>Decisões</w:t></w:r></w:p>"""
    out = _normalize_heading2_ppr(xml)
    assert 'w:val="0"' in out and "keepNext" in out
    assert 'w:val="left"' in out
    assert "w:left=\"0\"" in out


def test_spacer_inserted_before_table():
    xml = """<w:body>
    <w:p><w:pPr><w:pStyle w:val="Heading2" /></w:pPr><w:r><w:t>Decisões</w:t></w:r></w:p>
    <w:tbl><w:tr><w:tc><w:p><w:r><w:t>ID</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
    </w:body>"""
    out = _patch_heading2_spacer_before_table(_patch_all_heading2_paragraphs(xml))
    assert out.count("<w:tbl>") == 1
    assert out.index("Decisões") < out.index("<w:tbl>")
    assert out.index("<w:tbl>") - out.index("Decisões") > 50
