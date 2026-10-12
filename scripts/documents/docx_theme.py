"""DOCX theme: ensure custom paragraph styles and heading colours (DOC-TOOL-7)."""

from __future__ import annotations

import re
import zipfile
from pathlib import Path

# From docs/external/brand/tokens.yaml
_COLOR_PRIMARY_DARK = "083A50"
_COLOR_TEXT = "14212B"
_COLOR_MUTED = "5C6B78"
_COLOR_PRIMARY = "0B4F6C"

_EXTRA_STYLES = f"""
<w:style w:type="paragraph" w:customStyle="1" w:styleId="Q-EXTRef">
  <w:name w:val="Q-EXT Ref"/>
  <w:basedOn w:val="BodyText"/>
  <w:pPr><w:spacing w:before="0" w:after="80" w:line="240" w:lineRule="auto"/></w:pPr>
  <w:rPr>
    <w:rFonts w:ascii="Plus Jakarta Sans" w:hAnsi="Plus Jakarta Sans"/>
    <w:i/>
    <w:color w:val="{_COLOR_MUTED}"/>
    <w:sz w:val="18"/>
  </w:rPr>
</w:style>
<w:style w:type="paragraph" w:customStyle="1" w:styleId="FactLabel">
  <w:name w:val="Fact Label"/>
  <w:basedOn w:val="BodyText"/>
  <w:pPr><w:spacing w:before="120" w:after="20" w:line="240" w:lineRule="auto"/></w:pPr>
  <w:rPr>
    <w:rFonts w:ascii="Plus Jakarta Sans" w:hAnsi="Plus Jakarta Sans"/>
    <w:b/>
    <w:color w:val="{_COLOR_PRIMARY_DARK}"/>
    <w:sz w:val="22"/>
  </w:rPr>
</w:style>
<w:style w:type="paragraph" w:customStyle="1" w:styleId="FactBody">
  <w:name w:val="Fact Body"/>
  <w:basedOn w:val="BodyText"/>
  <w:pPr><w:spacing w:before="0" w:after="120" w:line="276" w:lineRule="auto"/></w:pPr>
  <w:rPr>
    <w:rFonts w:ascii="Plus Jakarta Sans" w:hAnsi="Plus Jakarta Sans"/>
    <w:color w:val="{_COLOR_TEXT}"/>
    <w:sz w:val="20"/>
  </w:rPr>
</w:style>
"""


def _ensure_extra_styles(styles_xml: str) -> str:
    if "FactLabel" in styles_xml and "Q-EXTRef" in styles_xml:
        return styles_xml
    return styles_xml.replace("</w:styles>", _EXTRA_STYLES + "</w:styles>", 1)


def _set_style_color(styles_xml: str, style_id: str, color: str) -> str:
    pattern = (
        rf'(<w:style[^>]+w:styleId="{re.escape(style_id)}"[^>]*>.*?<w:rPr>)'
        rf"(.*?)(</w:rPr>)"
    )

    def repl(m: re.Match[str]) -> str:
        inner = m.group(2)
        inner = re.sub(r"<w:color[^/]*/>", "", inner)
        return f'{m.group(1)}{inner}<w:color w:val="{color}"/>{m.group(3)}'

    return re.sub(pattern, repl, styles_xml, count=1, flags=re.DOTALL)


def _patch_heading_colors(styles_xml: str) -> str:
    for sid in ("Heading1", "Heading2", "Title"):
        if f'w:styleId="{sid}"' in styles_xml:
            styles_xml = _set_style_color(styles_xml, sid, _COLOR_PRIMARY)
    return styles_xml


def patch_docx_theme(docx_path: Path) -> None:
    with zipfile.ZipFile(docx_path, "r") as zin:
        names = zin.namelist()
        buffers = {name: zin.read(name) for name in names}

    styles = buffers.get("word/styles.xml")
    if styles:
        xml = styles.decode("utf-8")
        xml = _ensure_extra_styles(xml)
        xml = _patch_heading_colors(xml)
        buffers["word/styles.xml"] = xml.encode("utf-8")

    doc = buffers.get("word/document.xml")
    if doc:
        xml = doc.decode("utf-8")
        xml = _emphasis_bold_to_bold_italic_in_fact_body(xml)
        buffers["word/document.xml"] = xml.encode("utf-8")

    tmp = docx_path.with_suffix(".theme.docx")
    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        for name, content in buffers.items():
            zout.writestr(name, content)
    tmp.replace(docx_path)


def _emphasis_bold_to_bold_italic_in_fact_body(document_xml: str) -> str:
    """Bold+italic for inline emphasis inside FactBody only (skip style definition runs)."""
    parts: list[str] = []
    last = 0
    for m in re.finditer(r"<w:p[\s>].*?</w:p>", document_xml, flags=re.DOTALL):
        block = m.group(0)
        if 'w:val="FactBody"' in block:
            block = re.sub(
                r"<w:r>(?:(?!</w:r>).)*<w:b(?:/>|></w:b>)(?:(?!</w:r>).)*</w:r>",
                lambda rm: rm.group(0) if "<w:i" in rm.group(0) else rm.group(0).replace("<w:b/>", "<w:b/><w:i/>"),
                block,
                flags=re.DOTALL,
            )
        parts.append(document_xml[last : m.start()])
        parts.append(block)
        last = m.end()
    parts.append(document_xml[last:])
    return "".join(parts)
