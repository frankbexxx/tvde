"""Output path rules — builds must stay outside the Git repo."""

from __future__ import annotations

import os
from pathlib import Path


class OutputPathError(ValueError):
    pass


def default_output_dir(external_id: str) -> Path:
    base = os.environ.get("LOCALAPPDATA")
    if base:
        root = Path(base) / "TVDE" / "documents" / external_id
    else:
        root = Path.home() / ".local" / "share" / "TVDE" / "documents" / external_id
    return root


def assert_output_allowed(
    out_dir: Path,
    repo_root: Path,
    *,
    allow_in_repo: bool = False,
) -> Path:
    resolved = out_dir.expanduser().resolve()
    repo = repo_root.resolve()

    if allow_in_repo:
        return resolved

    try:
        resolved.relative_to(repo)
    except ValueError:
        return resolved

    raise OutputPathError(
        f"output directory must be outside the repository: {resolved}"
    )
