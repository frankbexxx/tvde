"""Validator tests — synthetic content only."""

from __future__ import annotations

from pathlib import Path

import pytest
import yaml

from scripts.documents.validator import REPO_ROOT, validate_dossier

FIXTURE_YAML = REPO_ROOT / "docs/external/sources/EXT-FIXTURE-001/dossier.yaml"


def _base_dossier(**overrides) -> dict:
    data = {
        "external_id": "EXT-TEST-001",
        "title": "Test dossier",
        "version": "v0.1",
        "created": "2026-10-11",
        "updated": "2026-10-11",
        "status": "DRAFT",
        "audience": "Test",
        "confidentiality": "INTERNAL",
        "owner": "Test",
        "profile": "generic",
        "q_ext": ["Q-EXT-LEG-007"],
        "dec_refs": ["DEC-LEG-004"],
        "find_refs": ["FIND-LEG-IMT-01"],
        "sources": [{"path": "docs/registers/DECISIONS.md"}],
        "output": {},
    }
    data.update(overrides)
    return data


def _write_case(tmp_path: Path, dossier: dict, md: str = "Body text.\n") -> Path:
    yaml_path = tmp_path / "dossier.yaml"
    yaml_path.write_text(yaml.safe_dump(dossier, sort_keys=False), encoding="utf-8")
    (tmp_path / "dossier.md").write_text(md, encoding="utf-8")
    return yaml_path


def test_fixture_draft_passes_with_warnings():
    report = validate_dossier(FIXTURE_YAML)
    assert report.external_id == "EXT-FIXTURE-001"
    assert report.status == "DRAFT"
    assert report.result in ("PASS", "PASS WITH WARNINGS")
    assert not any(c.name == "registry refs" and c.status == "FAIL" for c in report.checks)


def test_unknown_q_ext_fails(tmp_path):
    yp = _write_case(tmp_path, _base_dossier(q_ext=["Q-EXT-LEG-999"]))
    report = validate_dossier(yp)
    assert report.result == "FAIL"
    assert any("unknown Q-EXT" in e for e in report.errors)


def test_missing_source_fails(tmp_path):
    yp = _write_case(
        tmp_path,
        _base_dossier(sources=[{"path": "docs/no/such/file.md"}]),
    )
    report = validate_dossier(yp)
    assert report.result == "FAIL"
    assert any("missing source" in e for e in report.errors)


def test_path_escape_fails(tmp_path):
    yp = _write_case(
        tmp_path,
        _base_dossier(sources=[{"path": "docs/../../backend/.env"}]),
    )
    report = validate_dossier(yp)
    assert report.result == "FAIL"


def test_placeholder_approved_fails(tmp_path):
    yp = _write_case(
        tmp_path,
        _base_dossier(status="APPROVED"),
        md="Contacto [NOME] aqui.\n",
    )
    report = validate_dossier(yp)
    assert report.result == "FAIL"
    ph = next(c for c in report.checks if c.name == "placeholders")
    assert ph.status == "FAIL"


def test_iban_detected(tmp_path):
    yp = _write_case(
        tmp_path,
        _base_dossier(),
        md="Conta PT50 0002 0123 1234 5678 9015 4\n",
    )
    report = validate_dossier(yp)
    pii = next(c for c in report.checks if c.name == "possible PII")
    assert pii.status in ("WARN", "FAIL")


def test_stripe_secret_fails(tmp_path):
    # Assemble pattern at runtime (avoid literal secret-like strings in source)
    stripe_like = "sk_" + "live_" + ("x" * 24)
    yp = _write_case(
        tmp_path,
        _base_dossier(),
        md=f"key {stripe_like}\n",
    )
    report = validate_dossier(yp)
    assert report.result == "FAIL"
    cred = next(c for c in report.checks if c.name == "credentials")
    assert cred.status == "FAIL"


def test_duplicate_q_ext_fails(tmp_path):
    yp = _write_case(
        tmp_path,
        _base_dossier(q_ext=["Q-EXT-LEG-007", "Q-EXT-LEG-007"]),
    )
    report = validate_dossier(yp)
    assert report.result == "FAIL"


def test_invalid_date_order_fails(tmp_path):
    yp = _write_case(
        tmp_path,
        _base_dossier(created="2026-10-12", updated="2026-10-11"),
    )
    report = validate_dossier(yp)
    assert report.result == "FAIL"


def test_missing_required_metadata_fails(tmp_path):
    incomplete = _base_dossier()
    del incomplete["owner"]
    yp = _write_case(tmp_path, incomplete)
    report = validate_dossier(yp)
    assert report.result == "FAIL"
    meta = report.checks[0]
    assert meta.name == "metadata" and meta.status == "FAIL"
