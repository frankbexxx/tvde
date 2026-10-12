"""Markdown compose transforms (DOC-TOOL-7)."""

from __future__ import annotations

from pathlib import Path

import yaml

from scripts.documents.md_compose import compose_markdown, prepare_body_markdown, transform_q_ext_sections
from scripts.documents.validator import REPO_ROOT

FIS_YAML = REPO_ROOT / "docs/external/sources/EXT-FIS-2026-10-12/dossier.yaml"
FIS_MD = REPO_ROOT / "docs/external/sources/EXT-FIS-2026-10-12/dossier.md"


def test_strip_corpo_and_q_ext_external_heading():
    data = yaml.safe_load(FIS_YAML.read_text(encoding="utf-8"))
    raw = FIS_MD.read_text(encoding="utf-8")
    out = prepare_body_markdown(raw, data)
    assert "Corpo do dossier fiscal" not in out
    assert "### Questão 1 — Acerto manual semanal com o parceiro" in out
    assert 'Referência interna: Q-EXT-FIS-004' in out
    assert 'custom-style="Q-EXT ID"' not in out
    assert "| Ref. interna |" in out


def test_compose_cover_page_split():
    data = yaml.safe_load(FIS_YAML.read_text(encoding="utf-8"))
    composed, tmp = compose_markdown(data, FIS_MD)
    text = composed.read_text(encoding="utf-8")
    idx = text.index("# Consulta fiscal TVDE")
    pre, post = text[:idx], text[idx:]
    assert "| Campo | Valor |" not in pre
    assert "**Data:**" in pre
    assert "| Campo | Valor |" in post
    assert "# Consulta fiscal TVDE" in post
    assert "## Objectivo da consulta" in post
    from scripts.documents.md_compose import cleanup_compose_dir

    cleanup_compose_dir(tmp)


def test_transform_q_ext_respects_yaml_order():
    md = (
        "### Q-EXT-FIS-002\n\n"
        '::: {custom-style="Q-EXT ID"}\nQ-EXT-FIS-002\n:::\n\n'
        "### Q-EXT-FIS-004\n\n"
        '::: {custom-style="Q-EXT ID"}\nQ-EXT-FIS-004\n:::\n\n'
    )
    data = {"q_ext": ["Q-EXT-FIS-004", "Q-EXT-FIS-002"]}
    out = transform_q_ext_sections(md, data)
    assert "Questão 1 — Acerto manual" in out
    assert "Questão 2 — Comissão de intermediação" in out
