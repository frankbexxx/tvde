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
    if "FactLabel" not in styles_xml or "Q-EXTRef" not in styles_xml:
        styles_xml = styles_xml.replace("</w:styles>", _EXTRA_STYLES + "</w:styles>", 1)
    return _upsert_fact_styles(styles_xml)


def _upsert_fact_styles(styles_xml: str) -> str:
    """Ensure FactLabel/FactBody style defs keep bold 11pt / body 10pt."""
    for sid, sz, bold in (("FactLabel", "22", True), ("FactBody", "20", False)):
        if f'w:styleId="{sid}"' not in styles_xml:
            continue
        pattern = rf'(<w:style[^>]+w:styleId="{sid}"[^>]*>.*?<w:rPr>)(.*?)(</w:rPr>)'

        def repl(m: re.Match[str], *, sz: str = sz, bold: bool = bold) -> str:
            inner = re.sub(r"<w:sz[^/]*/>", "", m.group(2))
            inner = re.sub(r"<w:szCs[^/]*/>", "", inner)
            inner = re.sub(r"<w:b[^/]*/>", "", inner)
            inner = re.sub(r"<w:b></w:b>", "", inner)
            b = "<w:b/>" if bold else ""
            return f'{m.group(1)}{inner}{b}<w:sz w:val="{sz}"/><w:szCs w:val="{sz}"/>{m.group(3)}'

        styles_xml = re.sub(pattern, repl, styles_xml, count=1, flags=re.DOTALL)
    return styles_xml


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


def _patch_heading2_style_no_keep(styles_xml: str) -> str:
    """Heading2 must not inherit keepNext/keepLines (avoids glue to tables)."""
    pattern = r'(<w:style[^>]+w:styleId="Heading2"[^>]*>.*?<w:pPr>)(.*?)(</w:pPr>)'

    def repl(m: re.Match[str]) -> str:
        inner = m.group(2)
        inner = re.sub(r"<w:keepNext[^/]*/>", "", inner)
        inner = re.sub(r"<w:keepLines[^/]*/>", "", inner)
        return f"{m.group(1)}{inner}{m.group(3)}"

    return re.sub(pattern, repl, styles_xml, count=1, flags=re.DOTALL)


def patch_docx_theme(docx_path: Path) -> None:
    with zipfile.ZipFile(docx_path, "r") as zin:
        names = zin.namelist()
        buffers = {name: zin.read(name) for name in names}

    styles = buffers.get("word/styles.xml")
    if styles:
        xml = styles.decode("utf-8")
        xml = _ensure_extra_styles(xml)
        xml = _patch_heading_colors(xml)
        xml = _patch_heading2_style_no_keep(xml)
        buffers["word/styles.xml"] = xml.encode("utf-8")

    doc = buffers.get("word/document.xml")
    if doc:
        xml = doc.decode("utf-8")
        xml = _enforce_fact_run_typography(xml)
        xml = _emphasis_bold_to_bold_italic_in_fact_body(xml)
        buffers["word/document.xml"] = xml.encode("utf-8")

    tmp = docx_path.with_suffix(".theme.docx")
    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        for name, content in buffers.items():
            zout.writestr(name, content)
    tmp.replace(docx_path)


def _enforce_run_pr(run_xml: str, *, sz: str, bold: bool, color: str | None = None) -> str:
    b = "<w:b/>" if bold else ""
    col = f'<w:color w:val="{color}"/>' if color else ""
    sz_tag = f'<w:sz w:val="{sz}"/><w:szCs w:val="{sz}"/>'
    if "<w:rPr>" in run_xml:
        inner = run_xml
        for tag in ("w:sz", "w:szCs", "w:b", "w:color"):
            inner = re.sub(rf"<{tag}[^/]*/>", "", inner)
            inner = re.sub(rf"<{tag}></{tag}>", "", inner)
        return inner.replace("<w:rPr>", f"<w:rPr>{b}{sz_tag}{col}", 1)
    return run_xml.replace("<w:r>", f"<w:r><w:rPr>{b}{sz_tag}{col}</w:rPr>", 1)


def _enforce_fact_run_typography(document_xml: str) -> str:
    def patch_para(m: re.Match[str]) -> str:
        block = m.group(0)
        if 'w:val="FactLabel"' in block:
            return re.sub(
                r"<w:r[\s>].*?</w:r>",
                lambda rm: _enforce_run_pr(rm.group(0), sz="22", bold=True, color=_COLOR_PRIMARY_DARK),
                block,
                flags=re.DOTALL,
            )
        if 'w:val="FactBody"' in block:
            return re.sub(
                r"<w:r[\s>].*?</w:r>",
                lambda rm: _enforce_run_pr(rm.group(0), sz="20", bold=False, color=_COLOR_TEXT),
                block,
                flags=re.DOTALL,
            )
        return block

    return re.sub(r"<w:p[\s>].*?</w:p>", patch_para, document_xml, flags=re.DOTALL)


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
