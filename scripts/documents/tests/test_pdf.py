"""PDF pipeline tests."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import patch

import pytest

from scripts.documents.build import BuildError, build_dossier
from scripts.documents.hashes import sha256_file
from scripts.documents.manifest import MANIFEST_NAME, PDF_NAME, inspect_output_dir
from scripts.documents.validator import REPO_ROOT

FIXTURE_YAML = REPO_ROOT / "docs/external/sources/EXT-FIXTURE-001/dossier.yaml"


@patch("scripts.documents.build.pandoc_version", return_value="pandoc 3.12.1 (mock)")
@patch("scripts.documents.build.run_pandoc")
@patch("scripts.documents.build.find_pandoc")
@patch("scripts.documents.build.find_soffice")
def test_pdf_required_without_lo_fails(mock_lo, mock_pandoc, mock_run, _ver, tmp_path):
    from scripts.documents.tests.test_build import _fake_pandoc_run

    mock_run.side_effect = _fake_pandoc_run
    mock_pandoc.return_value = Path("/usr/bin/pandoc")
    mock_lo.side_effect = FileNotFoundError("no lo")

    out = tmp_path / "out"
    with pytest.raises(BuildError, match="PDF conversion failed"):
        build_dossier(FIXTURE_YAML, out, formats="docx,pdf")

    manifest = json.loads((out / MANIFEST_NAME).read_text(encoding="utf-8"))
    assert manifest["pdf_generated"] is False
    assert "pdf_error" in manifest


@patch("scripts.documents.build.pandoc_version", return_value="pandoc 3.12.1 (mock)")
@patch("scripts.documents.build.run_pandoc")
@patch("scripts.documents.build.find_pandoc")
@patch("scripts.documents.build.convert_docx_to_pdf")
@patch("scripts.documents.build.find_soffice")
@patch("scripts.documents.build.validate_pdf_file")
@patch("scripts.documents.build.libreoffice_version", return_value="LibreOffice 26.8 mock")
def test_pdf_generated_and_manifest(
    mock_lo_ver, mock_validate, mock_lo, mock_convert, mock_pandoc, mock_run, _pver, tmp_path
):
    from scripts.documents.pdf_check import PdfCheckResult

    mock_validate.return_value = PdfCheckResult(True, 64, 1, ["ok"])
    from scripts.documents.tests.test_build import _fake_pandoc_run

    mock_run.side_effect = _fake_pandoc_run
    mock_pandoc.return_value = Path("/usr/bin/pandoc")
    mock_lo.return_value = Path("/usr/bin/soffice")

    out = tmp_path / "EXT-FIXTURE-001"

    def _fake_convert(docx_path, output_dir, soffice=None):
        pdf = output_dir / PDF_NAME
        pdf.write_bytes(b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\nxref\n0 0\ntrailer\n<<>>\nstartxref\n0\n%%EOF\n")
        return pdf, ["soffice", "--headless", str(docx_path)]

    mock_convert.side_effect = _fake_convert

    build_dossier(FIXTURE_YAML, out, formats="docx,pdf")
    data = json.loads((out / MANIFEST_NAME).read_text(encoding="utf-8"))
    assert data["pdf_generated"] is True
    assert data["libreoffice_version"] == "LibreOffice 26.8 mock"
    assert data["output_pdf_sha256"] == sha256_file(out / PDF_NAME)

    with patch("scripts.documents.manifest.validate_pdf_file") as mock_inspect_pdf:
        mock_inspect_pdf.return_value = PdfCheckResult(True, 69, 1, ["ok"])
        insp = inspect_output_dir(out)
    assert insp.pdf_generated
    assert insp.pdf_hash_match


@patch("scripts.documents.build.pandoc_version", return_value="pandoc 3.12.1 (mock)")
@patch("scripts.documents.build.run_pandoc")
@patch("scripts.documents.build.find_pandoc")
@patch("scripts.documents.build.convert_docx_to_pdf")
@patch("scripts.documents.build.find_soffice")
@patch("scripts.documents.build.validate_pdf_file")
@patch("scripts.documents.build.libreoffice_version", return_value="LibreOffice mock")
def test_pdf_hash_mismatch_detected_on_inspect(
    _lo_ver, mock_validate, mock_lo, mock_convert, mock_pandoc, mock_run, _pver, tmp_path
):
    from scripts.documents.pdf_check import PdfCheckResult

    mock_validate.return_value = PdfCheckResult(True, 64, 1, ["ok"])
    from scripts.documents.tests.test_build import _fake_pandoc_run

    mock_run.side_effect = _fake_pandoc_run
    mock_pandoc.return_value = Path("/usr/bin/pandoc")
    mock_lo.return_value = Path("/usr/bin/soffice")

    out = tmp_path / "out"

    def _fake_convert(docx_path, output_dir, soffice=None):
        pdf = output_dir / PDF_NAME
        pdf.write_bytes(b"%PDF-1.4\n% minimal\n%%EOF\n")
        return pdf, ["soffice"]

    mock_convert.side_effect = _fake_convert
    build_dossier(FIXTURE_YAML, out, formats="docx,pdf")
    (out / PDF_NAME).write_bytes(b"%PDF-1.4\nTAMPERED\n%%EOF\n")
    insp = inspect_output_dir(out)
    assert not insp.ok
    assert not insp.pdf_hash_match


def test_docx_only_format_skips_pdf(tmp_path):
    with patch("scripts.documents.build.pandoc_version", return_value="mock"):
        with patch("scripts.documents.build.run_pandoc") as mock_run:
            with patch("scripts.documents.build.find_pandoc") as mock_find:
                from scripts.documents.tests.test_build import _fake_pandoc_run

                mock_run.side_effect = _fake_pandoc_run
                mock_find.return_value = Path("/usr/bin/pandoc")
                with patch("scripts.documents.build.find_soffice") as mock_lo:
                    build_dossier(FIXTURE_YAML, tmp_path / "o", formats="docx")
                    mock_lo.assert_not_called()


@pytest.mark.integration
def test_real_pdf_build_if_libreoffice_available(tmp_path):
    from scripts.documents.libreoffice_util import find_soffice
    from scripts.documents.pandoc_util import find_pandoc

    try:
        find_pandoc()
        find_soffice()
    except FileNotFoundError:
        pytest.skip("pandoc or libreoffice not installed")

    out = tmp_path / "EXT-FIXTURE-001"
    build_dossier(FIXTURE_YAML, out, formats="docx,pdf")
    insp = inspect_output_dir(out)
    assert insp.ok
    assert (out / PDF_NAME).stat().st_size > 500
