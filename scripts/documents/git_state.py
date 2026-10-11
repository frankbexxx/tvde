"""Read-only Git commit / dirty detection."""

from __future__ import annotations

import subprocess
from pathlib import Path


def git_commit_and_dirty(repo_root: Path) -> tuple[str | None, bool]:
    try:
        commit = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=repo_root,
            capture_output=True,
            text=True,
            check=True,
        ).stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None, False

    try:
        status = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=repo_root,
            capture_output=True,
            text=True,
            check=True,
        ).stdout
        dirty = bool(status.strip())
    except (subprocess.CalledProcessError, FileNotFoundError):
        dirty = False

    return commit, dirty
