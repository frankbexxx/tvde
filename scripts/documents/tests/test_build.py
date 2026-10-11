"""Build pipeline tests (mocked Pandoc unless integration)."""

from __future__ import annotations

import json
import zipfile
from pathlib import Path
from unittest.mock import patch

import pytest
import yaml

from scripts.documents.build import BuildError, build_dossier
from scripts.documents.hashes import sha256_file
from scripts.documents.manifest import MANIFEST_NAME, DOCX_NAME, inspect_output_dir
from scripts.documents.paths import OutputPathError, assert_output_allowed
from scripts.documents.validator import REPO_ROOT

FIXTURE_YAML = REPO_ROOT / "docs/external/sources/EXT-FIXTURE-001/dossier.yaml"


def _fake_pandoc_run(*, pandoc, markdown, reference_docx, output_docx, metadata):
    output_docx.parent.mkdir(parents=True, exist_ok=True)
    # Minimal OOXML zip so inspect/hash tests have a file
    with zipfile.ZipFile(output_docx, "w") as zf:
        zf.writestr("[Content_Types].xml", '<?xml version="1.0"?><Types/>')
        zf.writestr("word/document.xml", "<w:document/>")
    return [str(pandoc), str(markdown), "-o", str(output_docx)]


def test_output_inside_repo_rejected(tmp_path):
    inside = REPO_ROOT / "tmp-build-test"
    with pytest.raises(OutputPathError):
        assert_output_allowed(inside, REPO_ROOT)


@patch("scripts.documents.build.pandoc_version", return_value="pandoc 3.12.1 (mock)")
@patch("scripts.documents.build.run_pandoc", side_effect=_fake_pandoc_run)
@patch("scripts.documents.build.find_pandoc")
def test_default_build_docx_only_no_pdf(mock_find, mock_run, _mock_ver, tmp_path):
    mock_find.return_value = Path("/usr/bin/pandoc")
    out = tmp_path / "EXT-DOCX-ONLY"
    build_dossier(FIXTURE_YAML, out, formats=None)
    data = json.loads((out / MANIFEST_NAME).read_text(encoding="utf-8"))
    assert data["pdf_generated"] is False
    assert data.get("canonical_artifact") == "docx"
    assert data["output_pdf_sha256"] is None
    insp = inspect_output_dir(out)
    assert insp.ok
    assert "PDF not generated" in " ".join(insp.messages)


@patch("scripts.documents.build.pandoc_version", return_value="pandoc 3.12.1 (mock)")
@patch("scripts.documents.build.run_pandoc", side_effect=_fake_pandoc_run)
@patch("scripts.documents.build.find_pandoc")
def test_build_creates_manifest_and_docx(mock_find, mock_run, _mock_ver, tmp_path):
    mock_find.return_value = Path("/usr/bin/pandoc")
    out = tmp_path / "EXT-TEST-BUILD"
    result = build_dossier(FIXTURE_YAML, out, allow_in_repo=False, formats="docx")
    assert result.docx_path.is_file()
    assert result.manifest_path.is_file()
    data = json.loads(result.manifest_path.read_text(encoding="utf-8"))
    assert data["external_id"] == "EXT-FIXTURE-001"
    assert data["output_docx_sha256"] == sha256_file(result.docx_path)
    assert data["source_hashes"]
    insp = inspect_output_dir(out)
    assert insp.ok


@patch("scripts.documents.build.pandoc_version", return_value="pandoc 3.12.1 (mock)")
@patch("scripts.documents.build.run_pandoc", side_effect=_fake_pandoc_run)
@patch("scripts.documents.build.find_pandoc")
def test_build_blocks_validation_fail(mock_find, mock_run, _mock_ver, tmp_path):
    mock_find.return_value = Path("/usr/bin/pandoc")
    bad = tmp_path / "bad.yaml"
    bad.write_text(
        yaml.safe_dump(
            {
                "external_id": "EXT-BAD-001",
                "title": "x",
                "version": "v0.1",
                "created": "2026-10-11",
                "updated": "2026-10-11",
                "status": "DRAFT",
                "audience": "x",
                "confidentiality": "INTERNAL",
                "owner": "x",
                "profile": "generic",
                "q_ext": ["Q-EXT-LEG-999"],
                "dec_refs": [],
                "find_refs": [],
                "sources": [{"path": "docs/registers/DECISIONS.md"}],
                "output": {},
            }
        ),
        encoding="utf-8",
    )
    (tmp_path / "dossier.md").write_text("ok\n", encoding="utf-8")
    with pytest.raises(BuildError, match="validation FAIL"):
        build_dossier(bad, tmp_path / "out", allow_in_repo=False, formats="docx")


@patch("scripts.documents.build.run_pandoc", side_effect=_fake_pandoc_run)
@patch("scripts.documents.build.find_pandoc")
def test_build_requires_pandoc(mock_find, mock_run, tmp_path):
    mock_find.side_effect = FileNotFoundError("no pandoc")
    with pytest.raises(FileNotFoundError):
        build_dossier(FIXTURE_YAML, tmp_path / "out", formats="docx")


@patch("scripts.documents.build.pandoc_version", return_value="pandoc 3.12.1 (mock)")
@patch("scripts.documents.build.run_pandoc", side_effect=_fake_pandoc_run)
@patch("scripts.documents.build.find_pandoc")
@patch("scripts.documents.build.git_commit_and_dirty")
def test_dirty_flag_recorded(mock_dirty, mock_find, mock_run, _mock_ver, tmp_path):
    mock_find.return_value = Path("/usr/bin/pandoc")
    mock_dirty.return_value = ("abc123", True)
    out = tmp_path / "EXT-FIXTURE-001"
    build_dossier(FIXTURE_YAML, out, formats="docx")
    data = json.loads((out / MANIFEST_NAME).read_text(encoding="utf-8"))
    assert data["git_dirty"] is True
    assert data["git_commit"] == "abc123"


@patch("scripts.documents.build.pandoc_version", return_value="pandoc 3.12.1 (mock)")
@patch("scripts.documents.build.run_pandoc", side_effect=_fake_pandoc_run)
@patch("scripts.documents.build.find_pandoc")
def test_source_hash_changes_when_markdown_changes(mock_find, mock_run, _mock_ver, tmp_path):
    mock_find.return_value = Path("/usr/bin/pandoc")
    out = tmp_path / "EXT-FIXTURE-001"
    build_dossier(FIXTURE_YAML, out, formats="docx")
    h1 = json.loads((out / MANIFEST_NAME).read_text())["source_hashes"]

    md = FIXTURE_YAML.parent / "dossier.md"
    original = md.read_text(encoding="utf-8")
    try:
        md.write_text(original + "\n<!-- touch -->\n", encoding="utf-8")
        build_dossier(FIXTURE_YAML, out, formats="docx")
        h2 = json.loads((out / MANIFEST_NAME).read_text())["source_hashes"]
        md_key = "docs/external/sources/EXT-FIXTURE-001/dossier.md"
        assert h1[md_key] != h2[md_key]
    finally:
        md.write_text(original, encoding="utf-8")


@pytest.mark.integration
def test_real_pandoc_build_if_available(tmp_path):
    from scripts.documents.pandoc_util import find_pandoc

    try:
        find_pandoc()
    except FileNotFoundError:
        pytest.skip("pandoc not installed")
    out = tmp_path / "EXT-FIXTURE-001"
    result = build_dossier(FIXTURE_YAML, out, formats="docx")
    assert result.docx_path.stat().st_size > 1000
    with zipfile.ZipFile(result.docx_path) as zf:
        assert "word/document.xml" in zf.namelist()
