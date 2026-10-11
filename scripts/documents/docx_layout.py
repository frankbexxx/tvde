"""DOCX layout post-process: table column widths and heading keep-with-next."""

from __future__ import annotations

import re
import zipfile
from pathlib import Path

# Usable width between margins (twips), aligned with Pandoc/reference.docx body tables.
_TABLE_WIDTH_DXA = 9026

# ID | decisão/resumo | data/prioridade | impacto/nota
_PROFILES: list[tuple[tuple[str, ...], list[int]]] = [
    (("Campo", "Valor"), [2200, 6826]),
    (("ID", "Decisão (resumo)", "Data", "Impacto para este dossier"), [1200, 3626, 1000, 3200]),
    (("ID", "Resumo", "Prioridade interna", "Impacto"), [1200, 4206, 1100, 2520]),
    (("Ref.", "Descrição", "Nota"), [1000, 5026, 3000]),
]


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
        return _PROFILES[0][1]
    if len(h) >= 4 and h[0] == "ID" and "Decis" in h[1]:
        return _PROFILES[1][1]
    if len(h) >= 4 and h[0] == "ID" and h[1] == "Resumo" and "Prioridade" in h[2]:
        return _PROFILES[2][1]
    if len(h) == 3 and h[0] == "Ref.":
        return _PROFILES[3][1]
    return None


def _scale_widths(widths: list[int], total: int = _TABLE_WIDTH_DXA) -> list[int]:
    s = sum(widths)
    if s <= 0:
        return widths
    scaled = [max(600, int(w * total / s)) for w in widths]
    delta = total - sum(scaled)
    scaled[-1] += delta
    return scaled


def _set_tbl_pr(tbl_xml: str, total: int) -> str:
    layout = '<w:tblLayout w:type="fixed"/>'
    tbl_w = f'<w:tblW w:w="{total}" w:type="dxa"/>'
    if re.search(r"<w:tblPr>", tbl_xml):
        block = re.search(r"<w:tblPr>.*?</w:tblPr>", tbl_xml, re.DOTALL)
        assert block
        inner = block.group(0)
        inner = re.sub(r"<w:tblLayout[^/]*/>", "", inner)
        inner = re.sub(r"<w:tblW[^/]*/>", "", inner)
        inner = inner.replace("</w:tblPr>", f"{layout}{tbl_w}</w:tblPr>")
        return tbl_xml[: block.start()] + inner + tbl_xml[block.end() :]
    return tbl_xml.replace("<w:tbl>", f"<w:tbl><w:tblPr>{layout}{tbl_w}</w:tblPr>", 1)


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
    return tbl_xml.replace("<w:tblPr>", f"<w:tblPr></w:tblPr><w:tblGrid>{grid}</w:tblGrid>", 1)


def _patch_cell_widths(tbl_xml: str, widths: list[int]) -> str:
    rows = list(re.finditer(r"<w:tr[\s>].*?</w:tr>", tbl_xml, re.DOTALL))
    if not rows:
        return tbl_xml

    parts: list[str] = []
    last = 0
    for ri, row_m in enumerate(rows):
        row_xml = row_m.group(0)
        if ri == 0:
            if "<w:trPr>" in row_xml:
                if "tblHeader" not in row_xml:
                    row_xml = row_xml.replace("<w:trPr>", "<w:trPr><w:tblHeader/><w:cantSplit/>", 1)
            else:
                row_xml = row_xml.replace("<w:tr>", "<w:tr><w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>", 1)

        cells = list(re.finditer(r"<w:tc[\s>].*?</w:tc>", row_xml, re.DOTALL))
        new_cells: list[str] = []
        c_last = 0
        for ci, cell_m in enumerate(cells):
            cell = cell_m.group(0)
            w = widths[ci] if ci < len(widths) else widths[-1]
            tc_w = f'<w:tcW w:w="{w}" w:type="dxa"/>'
            v_top = '<w:vAlign w:val="top"/>'
            if "<w:tcPr>" in cell:
                cell = re.sub(r"<w:tcW[^/]*/>", "", cell)
                cell = re.sub(r"<w:vAlign[^/]*/>", "", cell)
                cell = cell.replace("<w:tcPr>", f"<w:tcPr>{tc_w}{v_top}", 1)
            else:
                cell = cell.replace("<w:tc>", f"<w:tc><w:tcPr>{tc_w}{v_top}</w:tcPr>", 1)
            new_cells.append(cell)
            c_last = cell_m.end()
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
    widths = _scale_widths(widths)
    total = sum(widths)
    out = _set_tbl_pr(tbl_xml, total)
    out = _set_grid(out, widths)
    out = _patch_cell_widths(out, widths)
    return out


def _patch_headings(xml: str) -> str:
    def add_keep(m: re.Match[str]) -> str:
        block = m.group(0)
        if "<w:keepNext" in block:
            return block
        if "<w:jc " in block and 'w:val="center"' in block:
            block = re.sub(r"<w:jc w:val=\"center\"[^/]*/>", "", block)
        return block.replace("</w:pPr>", "<w:keepNext/></w:pPr>", 1)

    return re.sub(
        r"<w:p>\s*<w:pPr>(?:(?!</w:pPr>).)*<w:pStyle w:val=\"Heading[123]\" />(?:(?!</w:pPr>).)*</w:pPr>",
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
    xml = _patch_headings(xml)
    buffers["word/document.xml"] = xml.encode("utf-8")

    tmp = docx_path.with_suffix(".layout.docx")
    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        for name, content in buffers.items():
            zout.writestr(name, content)
    tmp.replace(docx_path)
