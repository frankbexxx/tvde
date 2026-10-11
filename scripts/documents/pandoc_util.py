"""Locate and invoke Pandoc."""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path


class PandocNotFoundError(FileNotFoundError):
    pass


def find_pandoc() -> Path:
    exe = shutil.which("pandoc")
    if exe:
        return Path(exe)
    # Windows default install path (winget / MSI)
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
    for key, value in metadata.items():
        if value:
            cmd.extend(["-M", f"{key}={value}"])
    subprocess.run(cmd, check=True, capture_output=True, text=True)
    return cmd
