"""Locate and invoke Pandoc."""

from __future__ import annotations

import shutil
import subprocess
import tempfile
from pathlib import Path

import yaml


class PandocNotFoundError(FileNotFoundError):
    pass


def find_pandoc() -> Path:
    exe = shutil.which("pandoc")
    if exe:
        return Path(exe)
    win_default = Path.home() / "AppData" / "Local" / "Pandoc" / "pandoc.exe"
    if win_default.is_file():
        return win_default
    raise PandocNotFoundError(
        "pandoc not found on PATH; install Pandoc 3.x (see scripts/documents/README.md)"
    )


def pandoc_version(pandoc: Path | None = None) -> str:
    exe = pandoc or find_pandoc()
    out = subprocess.run(
        [str(exe), "--version"],
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    return out.splitlines()[0].strip() if out else "unknown"


def run_pandoc(
    *,
    pandoc: Path,
    markdown: Path,
    reference_docx: Path,
    output_docx: Path,
    metadata: dict[str, str],
) -> list[str]:
    output_docx.parent.mkdir(parents=True, exist_ok=True)
    cmd: list[str] = [
        str(pandoc),
        str(markdown),
        "-f",
        "markdown",
        "-t",
        "docx",
        f"--reference-doc={reference_docx}",
        "-o",
        str(output_docx),
    ]
    meta_file: Path | None = None
    filtered = {k: v for k, v in metadata.items() if v}
    if filtered:
        with tempfile.NamedTemporaryFile(
            mode="w",
            suffix=".yaml",
            delete=False,
            encoding="utf-8",
        ) as tmp:
            yaml.safe_dump(filtered, tmp, allow_unicode=True)
            meta_file = Path(tmp.name)
        cmd.extend(["--metadata-file", str(meta_file)])

    try:
        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.returncode != 0:
            raise subprocess.CalledProcessError(
                proc.returncode, cmd, proc.stdout, proc.stderr
            )
    finally:
        if meta_file and meta_file.is_file():
            meta_file.unlink(missing_ok=True)

    return cmd
