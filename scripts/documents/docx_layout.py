"""DOCX layout post-process: tables, typography, heading keep-with-next (DOC-TOOL-7)."""

from __future__ import annotations

import re
import zipfile
from pathlib import Path

# ~16 cm usable on A4 with 25 mm margins (210−50 mm).
_PAGE_CONTENT_TWIPS = 9070
_TABLE_WIDTH = int(_PAGE_CONTENT_TWIPS * 0.98)

# Half-points: 16 = 8pt table body; header 18 = 9pt.
_TABLE_BODY_SZ = "16"
_TABLE_HEAD_SZ = "18"

_SHADE_HEADER = "EEF3F6"
_SHADE_ZEBRA = "F7F9FA"
_BORDER_COLOR = "E0E4E8"

_PROFILES: list[tuple[tuple[str, ...], list[int]]] = [
    (("Campo", "Valor"), [2200, _TABLE_WIDTH - 2200]),
    (
        ("Ref. interna", "Decisão (resumo)", "Data", "Impacto para este dossier"),
        [1180, 4180, 1320, _TABLE_WIDTH - 1180 - 4180 - 1320],
    ),
    (
        ("Ref. interna", "Resumo", "Prioridade interna", "Impacto"),
        [1380, 3680, 1680, _TABLE_WIDTH - 1380 - 3680 - 1680],
    ),
    (("Ref.", "Descrição", "Nota"), [720, 4680, _TABLE_WIDTH - 720 - 4680]),
]

# Legacy header (source MD before compose rename) — still match if present.
_LEGACY_DEC = ("ID", "Decisão (resumo)", "Data", "Impacto para este dossier")
_LEGACY_LAC = ("ID", "Resumo", "Prioridade interna", "Impacto")


def _normalize_header(text: str) -> str:
    return " ".join(text.split())


def _header_signature(tbl_xml: str) -> tuple[str, ...] | None:
    row = re.search(r"<w:tr[\s>].*?</w:tr>", tbl_xml, re.DOTALL)
    if not row:
        return None
    cells = re.findall(r"<w:tc[\s>].*?</w:tc>", row.group(0), re.DOTALL)
    texts: list[str] = []
    for cell in cells:
        parts = re.findall(r"<w:t[^>]*>([^<]*)</w:t>", cell)
        texts.append(_normalize_header("".join(parts)))
    if not texts:
        return None
    return tuple(texts)


def _match_widths(header: tuple[str, ...]) -> list[int] | None:
    h = list(header)
    if len(h) >= 2 and h[0] == "Campo" and h[1] == "Valor":
        return list(_PROFILES[0][1])
    if len(h) >= 4 and h[0] in ("Ref. interna", "ID") and "Decis" in h[1]:
        return list(_PROFILES[1][1])
    if len(h) >= 4 and h[0] in ("Ref. interna", "ID") and h[1] == "Resumo" and "Prioridade" in h[2]:
        return list(_PROFILES[2][1])
    if len(h) == 3 and h[0] == "Ref.":
        return list(_PROFILES[3][1])
    return None


def _row_count(tbl_xml: str) -> int:
    return len(re.findall(r"<w:tr[\s>]", tbl_xml))


def _is_large_table(tbl_xml: str) -> bool:
    return _row_count(tbl_xml) > 22


def _set_tbl_pr(tbl_xml: str, total: int) -> str:
    layout = '<w:tblLayout w:type="fixed"/>'
    tbl_w = f'<w:tblW w:w="{total}" w:type="dxa"/>'
    borders = (
        f'<w:tblBorders>'
        f'<w:top w:val="single" w:sz="4" w:space="0" w:color="{_BORDER_COLOR}"/>'
        f'<w:left w:val="single" w:sz="4" w:space="0" w:color="{_BORDER_COLOR}"/>'
        f'<w:bottom w:val="single" w:sz="4" w:space="0" w:color="{_BORDER_COLOR}"/>'
        f'<w:right w:val="single" w:sz="4" w:space="0" w:color="{_BORDER_COLOR}"/>'
        f'<w:insideH w:val="single" w:sz="4" w:space="0" w:color="{_BORDER_COLOR}"/>'
        f'<w:insideV w:val="single" w:sz="4" w:space="0" w:color="{_BORDER_COLOR}"/>'
        f"</w:tblBorders>"
    )
    if re.search(r"<w:tblPr>", tbl_xml):
        block = re.search(r"<w:tblPr>.*?</w:tblPr>", tbl_xml, re.DOTALL)
        assert block
        inner = block.group(0)
        inner = re.sub(r"<w:tblLayout[^/]*/>", "", inner)
        inner = re.sub(r"<w:tblW[^/]*/>", "", inner)
        inner = re.sub(r"<w:tblBorders>.*?</w:tblBorders>", "", inner, flags=re.DOTALL)
        inner = inner.replace("</w:tblPr>", f"{layout}{tbl_w}{borders}</w:tblPr>")
        return tbl_xml[: block.start()] + inner + tbl_xml[block.end() :]
    return tbl_xml.replace("<w:tbl>", f"<w:tbl><w:tblPr>{layout}{tbl_w}{borders}</w:tblPr>", 1)


def _set_grid(tbl_xml: str, widths: list[int]) -> str:
    grid = "".join(f'<w:gridCol w:w="{w}"/>' for w in widths)
    if re.search(r"<w:tblGrid>", tbl_xml):
        return re.sub(
            r"<w:tblGrid>.*?</w:tblGrid>",
            f"<w:tblGrid>{grid}</w:tblGrid>",
            tbl_xml,
            count=1,
            flags=re.DOTALL,
        )
    return tbl_xml.replace(
        "<w:tblPr>",
        f"<w:tblPr></w:tblPr><w:tblGrid>{grid}</w:tblGrid>",
        1,
    )


def _inject_run_font_size(run_xml: str, *, header: bool) -> str:
    sz_val = _TABLE_HEAD_SZ if header else _TABLE_BODY_SZ
    sz = f'<w:sz w:val="{sz_val}"/><w:szCs w:val="{sz_val}"/>'
    if "<w:rPr>" in run_xml:
        inner = re.sub(r"<w:sz[^/]*/>", "", run_xml)
        inner = re.sub(r"<w:szCs[^/]*/>", "", inner)
        return inner.replace("<w:rPr>", f"<w:rPr>{sz}", 1)
    return run_xml.replace("<w:r>", f"<w:r><w:rPr>{sz}</w:rPr>", 1)


_TC_MAR = (
    "<w:tcMar>"
    '<w:top w:w="80" w:type="dxa"/>'
    '<w:left w:w="100" w:type="dxa"/>'
    '<w:bottom w:w="80" w:type="dxa"/>'
    '<w:right w:w="100" w:type="dxa"/>'
    "</w:tcMar>"
)


def _inject_cell_margins(cell_xml: str) -> str:
    if "<w:tcMar>" in cell_xml:
        return re.sub(r"<w:tcMar>.*?</w:tcMar>", _TC_MAR, cell_xml, count=1, flags=re.DOTALL)
    if "<w:tcPr>" in cell_xml:
        return cell_xml.replace("<w:tcPr>", f"<w:tcPr>{_TC_MAR}", 1)
    return cell_xml


def _cell_shading(cell_xml: str, fill: str | None) -> str:
    if not fill:
        cell_xml = re.sub(r"<w:shd[^/]*/>", "", cell_xml)
        return cell_xml
    shd = f'<w:shd w:val="clear" w:color="auto" w:fill="{fill}"/>'
    if "<w:shd" in cell_xml:
        return re.sub(r"<w:shd[^/]*/>", shd, cell_xml, count=1)
    if "<w:tcPr>" in cell_xml:
        return cell_xml.replace("<w:tcPr>", f"<w:tcPr>{shd}", 1)
    return cell_xml.replace("<w:tc>", f"<w:tc><w:tcPr>{shd}</w:tcPr>", 1)


def _typography_in_cell(cell_xml: str, *, header: bool) -> str:
    cell_xml = re.sub(
        r"<w:r[\s>].*?</w:r>",
        lambda m: _inject_run_font_size(m.group(0), header=header),
        cell_xml,
        flags=re.DOTALL,
    )

    spacing = (
        '<w:spacing w:before="60" w:after="60" w:line="240" w:lineRule="auto"/>'
        if not header
        else '<w:spacing w:before="80" w:after="80" w:line="260" w:lineRule="auto"/>'
    )

    def tighten_paragraph(match: re.Match[str]) -> str:
        p_xml = match.group(0)
        if "<w:pPr>" in p_xml:
            if "<w:spacing" in p_xml:
                return re.sub(r"<w:spacing[^/]*/>", spacing, p_xml, count=1)
            return p_xml.replace("<w:pPr>", f"<w:pPr>{spacing}", 1)
        return p_xml.replace("<w:p>", f"<w:p><w:pPr>{spacing}</w:pPr>", 1)

    return re.sub(r"<w:p[\s>].*?</w:p>", tighten_paragraph, cell_xml, flags=re.DOTALL)


def _patch_cell_widths(tbl_xml: str, widths: list[int], *, zebra: bool) -> str:
    rows = list(re.finditer(r"<w:tr[\s>].*?</w:tr>", tbl_xml, re.DOTALL))
    if not rows:
        return tbl_xml

    parts: list[str] = []
    last = 0
    for ri, row_m in enumerate(rows):
        row_xml = row_m.group(0)
        is_header = ri == 0
        if is_header:
            if "<w:trPr>" in row_xml:
                if "tblHeader" not in row_xml:
                    row_xml = row_xml.replace("<w:trPr>", "<w:trPr><w:tblHeader/><w:cantSplit/>", 1)
            else:
                row_xml = row_xml.replace(
                    "<w:tr>",
                    "<w:tr><w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>",
                    1,
                )
        elif "<w:trPr>" not in row_xml:
            row_xml = row_xml.replace("<w:tr>", "<w:tr><w:trPr><w:cantSplit/></w:trPr>", 1)

        fill = _SHADE_HEADER if is_header else (_SHADE_ZEBRA if zebra and ri % 2 == 1 else None)

        cells = list(re.finditer(r"<w:tc[\s>].*?</w:tc>", row_xml, re.DOTALL))
        new_cells: list[str] = []
        for ci, cell_m in enumerate(cells):
            cell = cell_m.group(0)
            w = widths[ci] if ci < len(widths) else widths[-1]
            tc_w = f'<w:tcW w:w="{w}" w:type="dxa"/>'
            v_top = '<w:vAlign w:val="top"/>'
            if "<w:tcPr>" in cell:
                cell = re.sub(r"<w:tcW[^/]*/>", "", cell)
                cell = re.sub(r"<w:vAlign[^/]*/>", "", cell)
                cell = cell.replace("<w:tcPr>", f"<w:tcPr>{tc_w}{v_top}", 1)
                cell = _inject_cell_margins(cell)
            else:
                cell = cell.replace(
                    "<w:tc>",
                    f"<w:tc><w:tcPr>{tc_w}{v_top}{_TC_MAR}</w:tcPr>",
                    1,
                )
            cell = _cell_shading(cell, fill)
            cell = _typography_in_cell(cell, header=is_header)
            new_cells.append(cell)
        if cells:
            rebuilt = row_xml[: cells[0].start()] + "".join(new_cells) + row_xml[cells[-1].end() :]
        else:
            rebuilt = row_xml
        parts.append(tbl_xml[last : row_m.start()])
        parts.append(rebuilt)
        last = row_m.end()
    parts.append(tbl_xml[last:])
    return "".join(parts)


def _patch_single_table(tbl_xml: str) -> str:
    header = _header_signature(tbl_xml)
    if not header:
        return tbl_xml
    widths = _match_widths(header)
    if not widths:
        return tbl_xml
    large = _is_large_table(tbl_xml)
    total = sum(widths)
    out = _set_tbl_pr(tbl_xml, total)
    out = _set_grid(out, widths)
    out = _patch_cell_widths(out, widths, zebra=not large)
    return out


def _is_metadata_table(tbl_xml: str) -> bool:
    header = _header_signature(tbl_xml)
    return bool(header and len(header) >= 2 and header[0] == "Campo" and header[1] == "Valor")


def _patch_metadata_page_break(xml: str) -> str:
    """Page 2 starts at ficha Campo/Valor (not a second cover block)."""

    def break_before(m: re.Match[str]) -> str:
        tbl = m.group(0)
        if not _is_metadata_table(tbl):
            return tbl
        pre = xml[: m.start()]
        if "pageBreakBefore" in pre[-400:]:
            return tbl
        return '<w:p><w:pPr><w:pageBreakBefore/></w:pPr></w:p>' + tbl

    return re.sub(r"<w:tbl>.*?</w:tbl>", break_before, xml, count=1, flags=re.DOTALL)


def _patch_heading2_before_table(xml: str) -> str:
    """Heading2 stays separate from following table (no keepNext glue)."""

    def fix(m: re.Match[str]) -> str:
        heading = m.group(1)
        heading = re.sub(r"<w:keepNext/>", "", heading)
        spacing = '<w:spacing w:before="0" w:after="200" w:line="276" w:lineRule="auto"/>'
        if "<w:spacing" in heading:
            heading = re.sub(r"<w:spacing[^/]*/>", spacing, heading, count=1)
        else:
            heading = heading.replace("</w:pPr>", f"{spacing}</w:pPr>", 1)
        return heading + m.group(2)

    return re.sub(
        r"(<w:p>\s*<w:pPr>(?:(?!</w:pPr>).)*<w:pStyle w:val=\"Heading2\" />(?:(?!</w:pPr>).)*</w:pPr>(?:(?!</w:p>).)*</w:p>)\s*(<w:tbl>)",
        fix,
        xml,
        flags=re.DOTALL,
    )


def _patch_headings(xml: str) -> str:
    def add_keep(m: re.Match[str]) -> str:
        block = m.group(0)
        if "<w:keepNext" in block:
            return block
        if "<w:jc " in block and 'w:val="center"' in block:
            block = re.sub(r'<w:jc w:val="center"[^/]*/>', "", block)
        return block.replace("</w:pPr>", "<w:keepNext/></w:pPr>", 1)

    # Heading2 often precedes tables — keepNext skipped; Q-EXT use Heading3.
    return re.sub(
        r'<w:p>\s*<w:pPr>(?:(?!</w:pPr>).)*<w:pStyle w:val="Heading3" />(?:(?!</w:pPr>).)*</w:pPr>',
        add_keep,
        xml,
        flags=re.DOTALL,
    )


def patch_docx_layout(docx_path: Path) -> None:
    with zipfile.ZipFile(docx_path, "r") as zin:
        names = zin.namelist()
        buffers = {name: zin.read(name) for name in names}

    doc = buffers.get("word/document.xml")
    if not doc:
        return
    xml = doc.decode("utf-8")
    xml = re.sub(r"<w:tbl>.*?</w:tbl>", lambda m: _patch_single_table(m.group(0)), xml, flags=re.DOTALL)
    xml = _patch_heading2_before_table(xml)
    xml = _patch_headings(xml)
    xml = _patch_metadata_page_break(xml)
    buffers["word/document.xml"] = xml.encode("utf-8")

    tmp = docx_path.with_suffix(".layout.docx")
    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        for name, content in buffers.items():
            zout.writestr(name, content)
    tmp.replace(docx_path)
