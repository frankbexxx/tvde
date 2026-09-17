#!/usr/bin/env python3
"""AUDIT-ONLY: inventory large modules, test sleeps, TODO markers, unbounded .all().

Not imported by the app. Safe to delete. See scripts/audit/README.md.
"""

from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

SKIP_DIRS = {
    ".git",
    "node_modules",
    "dist",
    "build",
    ".venv",
    "venv",
    "__pycache__",
    ".mypy_cache",
    "coverage",
    "test-results",
    "playwright-report",
}

CODE_EXT = {".py", ".ts", ".tsx", ".mjs", ".js"}


def iter_files() -> list[Path]:
    out: list[Path] = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")]
        p = Path(dirpath)
        if any(part in SKIP_DIRS for part in p.parts):
            continue
        for name in filenames:
            fp = p / name
            if fp.suffix in CODE_EXT:
                out.append(fp)
    return out


def line_count(path: Path) -> int:
    try:
        return sum(1 for _ in path.open(encoding="utf-8", errors="replace"))
    except OSError:
        return 0


def main() -> None:
    files = iter_files()
    sized = sorted(((line_count(p), p) for p in files), reverse=True)

    print("=== AUDIT-ONLY scan_repo_health ===")
    print(f"root={ROOT}")
    print(f"code_files={len(files)}")
    print()
    print("--- largest files (>= 400 lines) ---")
    for n, p in sized:
        if n < 400:
            break
        print(f"{n:5d}  {p.relative_to(ROOT).as_posix()}")

    print()
    print("--- time.sleep in backend/tests ---")
    tests = ROOT / "backend" / "tests"
    for p in sorted(tests.rglob("*.py")):
        text = p.read_text(encoding="utf-8", errors="replace")
        if "time.sleep" in text:
            for i, line in enumerate(text.splitlines(), 1):
                if "time.sleep" in line and not line.strip().startswith("#"):
                    print(f"{p.relative_to(ROOT).as_posix()}:{i}: {line.strip()}")

    print()
    print("--- TODO/FIXME/HACK (src + backend/app) ---")
    needles = ("TODO", "FIXME", "HACK", "XXX")
    for folder in (ROOT / "backend" / "app", ROOT / "web-app" / "src"):
        for p in folder.rglob("*"):
            if p.suffix not in {".py", ".ts", ".tsx"}:
                continue
            try:
                lines = p.read_text(encoding="utf-8", errors="replace").splitlines()
            except OSError:
                continue
            for i, line in enumerate(lines, 1):
                if any(n in line for n in needles) and not line.strip().startswith("*"):
                    # skip false positives like "Todos"
                    if "TODO" in line and "TODO" not in line.upper().replace("TODOS", ""):
                        continue
                    if any(
                        tok in line
                        for tok in ("TODO", "FIXME", "HACK", "XXX")
                    ) and "Todos" not in line:
                        if any(f"{t}" in line for t in ("TODO", "FIXME", "HACK")):
                            print(f"{p.relative_to(ROOT).as_posix()}:{i}: {line.strip()[:160]}")

    print()
    print("--- heuristic: .scalars().all() / .all() in routers/services (sample) ---")
    hits = 0
    for folder in (ROOT / "backend" / "app" / "api", ROOT / "backend" / "app" / "services"):
        for p in folder.rglob("*.py"):
            text = p.read_text(encoding="utf-8", errors="replace")
            if ".all()" not in text:
                continue
            for i, line in enumerate(text.splitlines(), 1):
                if ".all()" in line and "limit" not in line.lower():
                    print(f"{p.relative_to(ROOT).as_posix()}:{i}: {line.strip()[:160]}")
                    hits += 1
                    if hits >= 40:
                        print("... truncated ...")
                        return


if __name__ == "__main__":
    main()
