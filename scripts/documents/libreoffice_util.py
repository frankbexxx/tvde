"""Locate and invoke LibreOffice headless for DOCX → PDF."""

from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
from pathlib import Path


class LibreOfficeNotFoundError(FileNotFoundError):
    pass


def find_soffice() -> Path:
    exe = shutil.which("soffice")
    if exe:
        return Path(exe)
    for base in (
        os.environ.get("ProgramFiles", r"C:\Program Files"),
        os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)"),
    ):
        candidate = Path(base) / "LibreOffice" / "program" / "soffice.exe"
        if candidate.is_file():
            return candidate
    raise LibreOfficeNotFoundError(
        "LibreOffice (soffice) not found; install LibreOffice (see scripts/documents/README.md)"
    )


def libreoffice_version(soffice: Path | None = None) -> str:
    exe = soffice or find_soffice()
    try:
        out = subprocess.run(
            [str(exe), "--version"],
            capture_output=True,
            text=True,
            check=True,
            timeout=120,
        ).stdout.strip()
        return out.splitlines()[0] if out else "unknown"
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
        return "unknown"


def convert_docx_to_pdf(
    docx_path: Path,
    output_dir: Path,
    *,
    soffice: Path | None = None,
) -> tuple[Path, list[str]]:
    """Convert DOCX to PDF in output_dir. Returns (pdf_path, command argv)."""
    exe = soffice or find_soffice()
    output_dir.mkdir(parents=True, exist_ok=True)
    docx_path = docx_path.resolve()
    expected_pdf = output_dir / f"{docx_path.stem}.pdf"

    with tempfile.TemporaryDirectory(prefix="tvde-lo-") as tmp:
        tmp_path = Path(tmp)
        cmd = [
            str(exe),
            "--headless",
            "--nologo",
            "--nofirststartwizard",
            "--convert-to",
            "pdf",
            "--outdir",
            str(tmp_path),
            str(docx_path),
        ]
        subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=300)
        produced = tmp_path / f"{docx_path.stem}.pdf"
        if not produced.is_file():
            raise FileNotFoundError(f"LibreOffice did not produce PDF for {docx_path.name}")
        if expected_pdf.exists():
            expected_pdf.unlink()
        produced.replace(expected_pdf)

    return expected_pdf, cmd
