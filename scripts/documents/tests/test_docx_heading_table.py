"""Heading2 + table separation in docx_layout."""

from __future__ import annotations

from scripts.documents.docx_layout import _patch_heading2_before_table


def test_heading2_before_table_removes_keep_next():
    xml = """<w:body>
    <w:p><w:pPr><w:pStyle w:val="Heading2" /><w:keepNext/></w:pPr><w:r><w:t>Decisões</w:t></w:r></w:p>
    <w:tbl><w:tr><w:tc><w:p><w:r><w:t>ID</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
    </w:body>"""
    out = _patch_heading2_before_table(xml)
    assert "keepNext" not in out.split("<w:tbl>")[0]
    assert "w:after=\"200\"" in out
