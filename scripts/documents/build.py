"""Build DOCX from validated dossier sources."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

from scripts.documents.git_state import git_commit_and_dirty
from scripts.documents.hashes import sha256_file
from scripts.documents.manifest import DOCX_NAME, MANIFEST_NAME, utc_now_iso, write_manifest
from scripts.documents.pandoc_util import find_pandoc, pandoc_version, run_pandoc
from scripts.documents.paths import assert_output_allowed, default_output_dir
from scripts.documents.validator import BRAND_REFERENCE, BRAND_TOKENS, REPO_ROOT, validate_dossier


class BuildError(Exception):
    pass


@dataclass
class BuildResult:
    output_dir: Path
    docx_path: Path
    manifest_path: Path
    command: list[str]
    pandoc_version: str


def _load_yaml(path: Path) -> dict[str, Any]:
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def _collect_source_hashes(
    repo_root: Path,
    yaml_path: Path,
    md_path: Path,
    sources: list[dict[str, Any]],
) -> tuple[list[str], dict[str, str]]:
    files: list[str] = []
    hashes: dict[str, str] = {}

    rel_yaml = yaml_path.resolve().relative_to(repo_root.resolve()).as_posix()
    rel_md = md_path.resolve().relative_to(repo_root.resolve()).as_posix()
    files.extend([rel_yaml, rel_md])
    hashes[rel_yaml] = sha256_file(yaml_path)
    hashes[rel_md] = sha256_file(md_path)

    for entry in sources:
        if not isinstance(entry, dict):
            continue
        p = entry.get("path", "").replace("\\", "/").lstrip("/")
        full = (repo_root / p).resolve()
        if full.is_file():
            key = p
            if key not in hashes:
                files.append(key)
                hashes[key] = sha256_file(full)
    return files, hashes


def build_dossier(
    yaml_path: Path,
    out_dir: Path | None = None,
    *,
    repo_root: Path | None = None,
    allow_in_repo: bool = False,
    pandoc_exe: Path | None = None,
) -> BuildResult:
    repo_root = repo_root or REPO_ROOT
    yaml_path = yaml_path.resolve()
    data = _load_yaml(yaml_path)

    report = validate_dossier(yaml_path, repo_root=repo_root)
    status = str(data.get("status", ""))
    if report.result == "FAIL":
        raise BuildError(f"validation FAIL: {'; '.join(report.errors[:5])}")
    if status == "APPROVED" and report.result != "PASS":
        raise BuildError(
            f"APPROVED dossier requires validation PASS (got {report.result})"
        )
    if status in ("DRAFT", "REVIEW") and report.result not in ("PASS", "PASS WITH WARNINGS"):
        raise BuildError(f"unexpected validation result: {report.result}")

    external_id = str(data.get("external_id", "unknown"))
    target = out_dir or default_output_dir(external_id)
    output_dir = assert_output_allowed(target, repo_root, allow_in_repo=allow_in_repo)

    dossier_dir = yaml_path.parent
    md_name = data.get("markdown") or "dossier.md"
    md_path = dossier_dir / md_name
    if not md_path.is_file():
        raise BuildError(f"missing markdown: {md_path}")

    if not BRAND_REFERENCE.is_file():
        raise BuildError(f"missing reference docx: {BRAND_REFERENCE}")
    if not BRAND_TOKENS.is_file():
        raise BuildError(f"missing tokens: {BRAND_TOKENS}")

    pandoc = pandoc_exe or find_pandoc()
    p_version = pandoc_version(pandoc)

    docx_path = output_dir / DOCX_NAME
    metadata = {
        "title": str(data.get("title", "")),
        "subtitle": str(data.get("audience", "")),
        "author": str(data.get("owner", "")),
        "date": str(data.get("updated", "")),
    }
    cmd = run_pandoc(
        pandoc=pandoc,
        markdown=md_path,
        reference_docx=BRAND_REFERENCE,
        output_docx=docx_path,
        metadata=metadata,
    )

    source_files, source_hashes = _collect_source_hashes(
        repo_root, yaml_path, md_path, list(data.get("sources") or [])
    )

    ref_rel = BRAND_REFERENCE.resolve().relative_to(repo_root.resolve()).as_posix()
    tok_rel = BRAND_TOKENS.resolve().relative_to(repo_root.resolve()).as_posix()

    commit, dirty = git_commit_and_dirty(repo_root)
    manifest_path = output_dir / MANIFEST_NAME
    payload = {
        "external_id": external_id,
        "version": str(data.get("version", "")),
        "status": status,
        "built_at": utc_now_iso(),
        "git_commit": commit,
        "git_dirty": dirty,
        "source_files": source_files,
        "source_hashes": source_hashes,
        "reference_docx": ref_rel,
        "reference_docx_sha256": sha256_file(BRAND_REFERENCE),
        "tokens_file": tok_rel,
        "tokens_sha256": sha256_file(BRAND_TOKENS),
        "pandoc_version": p_version,
        "command": cmd,
        "output_docx": str(docx_path),
        "output_docx_sha256": sha256_file(docx_path),
        "output_size_bytes": docx_path.stat().st_size,
    }
    write_manifest(manifest_path, payload)

    return BuildResult(
        output_dir=output_dir,
        docx_path=docx_path,
        manifest_path=manifest_path,
        command=cmd,
        pandoc_version=p_version,
    )
