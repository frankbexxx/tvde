"""Build DOCX (+ optional PDF) from validated dossier sources."""

from __future__ import annotations

import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

from scripts.documents.git_state import git_commit_and_dirty
from scripts.documents.hashes import sha256_file
from scripts.documents.libreoffice_util import (
    LibreOfficeNotFoundError,
    convert_docx_to_pdf,
    find_soffice,
    libreoffice_version,
)
from scripts.documents.manifest import DOCX_NAME, MANIFEST_NAME, PDF_NAME, utc_now_iso, write_manifest
from scripts.documents.pandoc_util import find_pandoc, pandoc_version, run_pandoc
from scripts.documents.pdf_check import validate_pdf_file
from scripts.documents.paths import assert_output_allowed, default_output_dir
from scripts.documents.docx_layout import patch_docx_layout
from scripts.documents.docx_theme import patch_docx_theme
from scripts.documents.docx_postprocess import patch_docx_header_footer
from scripts.documents.md_compose import cleanup_compose_dir, compose_markdown
from scripts.documents.post_render import assert_no_placeholders_post_render, extract_docx_text
from scripts.documents.validator import BRAND_REFERENCE, BRAND_TOKENS, REPO_ROOT, validate_dossier


class BuildError(Exception):
    pass


@dataclass
class BuildResult:
    output_dir: Path
    docx_path: Path
    manifest_path: Path
    pandoc_command: list[str]
    pandoc_version: str
    pdf_path: Path | None = None
    libreoffice_command: list[str] | None = None
    libreoffice_version: str | None = None
    pdf_generated: bool = False


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


def _parse_formats(formats: str | None) -> tuple[bool, bool, bool]:
    """Returns want_docx, want_pdf, pdf_required."""
    if formats is None:
        return True, False, False
    parts = {p.strip().lower() for p in formats.split(",") if p.strip()}
    if not parts or parts == {"docx"}:
        return True, False, False
    if "docx" not in parts:
        raise BuildError("formats must include docx")
    pdf_required = "pdf" in parts
    return True, pdf_required, pdf_required


def build_dossier(
    yaml_path: Path,
    out_dir: Path | None = None,
    *,
    repo_root: Path | None = None,
    allow_in_repo: bool = False,
    pandoc_exe: Path | None = None,
    soffice_exe: Path | None = None,
    formats: str | None = None,
) -> BuildResult:
    repo_root = repo_root or REPO_ROOT
    yaml_path = yaml_path.resolve()
    data = _load_yaml(yaml_path)

    want_docx, want_pdf, pdf_required = _parse_formats(formats)
    if not want_docx:
        raise BuildError("docx output is required")

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
    # Omit title/subtitle/author/date — evita bloco Title duplicado (capa já no Markdown).
    metadata: dict[str, str] = {}
    composed_md, compose_tmp = compose_markdown(data, md_path)
    try:
        pandoc_cmd = run_pandoc(
            pandoc=pandoc,
            markdown=composed_md,
            reference_docx=BRAND_REFERENCE,
            output_docx=docx_path,
            metadata=metadata,
        )
    finally:
        cleanup_compose_dir(compose_tmp)

    patch_docx_header_footer(docx_path, data)
    patch_docx_theme(docx_path)
    patch_docx_layout(docx_path)

    docx_text = extract_docx_text(docx_path)
    try:
        assert_no_placeholders_post_render(docx_text, dossier_status=status)
    except ValueError as exc:
        raise BuildError(str(exc)) from exc

    source_files, source_hashes = _collect_source_hashes(
        repo_root, yaml_path, md_path, list(data.get("sources") or [])
    )

    ref_rel = BRAND_REFERENCE.resolve().relative_to(repo_root.resolve()).as_posix()
    tok_rel = BRAND_TOKENS.resolve().relative_to(repo_root.resolve()).as_posix()
    commit, dirty = git_commit_and_dirty(repo_root)
    manifest_path = output_dir / MANIFEST_NAME

    pdf_path: Path | None = None
    lo_cmd: list[str] | None = None
    lo_ver: str | None = None
    pdf_generated = False
    pdf_error: str | None = None

    if want_pdf:
        try:
            soffice = soffice_exe or find_soffice()
            lo_ver = libreoffice_version(soffice)
            pdf_path, lo_cmd = convert_docx_to_pdf(docx_path, output_dir, soffice=soffice)
            pdf_check = validate_pdf_file(pdf_path)
            if not pdf_check.ok:
                raise BuildError(f"PDF validation failed: {'; '.join(pdf_check.messages)}")
            pdf_generated = True
        except (LibreOfficeNotFoundError, FileNotFoundError, subprocess.CalledProcessError) as exc:
            pdf_error = str(exc)
            if pdf_required:
                payload = _manifest_payload(
                    external_id=external_id,
                    data=data,
                    status=status,
                    commit=commit,
                    dirty=dirty,
                    source_files=source_files,
                    source_hashes=source_hashes,
                    ref_rel=ref_rel,
                    tok_rel=tok_rel,
                    p_version=p_version,
                    pandoc_cmd=pandoc_cmd,
                    docx_path=docx_path,
                    pdf_generated=False,
                    pdf_path=None,
                    lo_ver=lo_ver,
                    lo_cmd=lo_cmd,
                    pdf_error=pdf_error,
                )
                write_manifest(manifest_path, payload)
                raise BuildError(f"PDF conversion failed: {pdf_error}") from exc

    payload = _manifest_payload(
        external_id=external_id,
        data=data,
        status=status,
        commit=commit,
        dirty=dirty,
        source_files=source_files,
        source_hashes=source_hashes,
        ref_rel=ref_rel,
        tok_rel=tok_rel,
        p_version=p_version,
        pandoc_cmd=pandoc_cmd,
        docx_path=docx_path,
        pdf_generated=pdf_generated,
        pdf_path=pdf_path,
        lo_ver=lo_ver,
        lo_cmd=lo_cmd,
        pdf_error=pdf_error,
    )
    write_manifest(manifest_path, payload)

    return BuildResult(
        output_dir=output_dir,
        docx_path=docx_path,
        manifest_path=manifest_path,
        pandoc_command=pandoc_cmd,
        pandoc_version=p_version,
        pdf_path=pdf_path,
        libreoffice_command=lo_cmd,
        libreoffice_version=lo_ver,
        pdf_generated=pdf_generated,
    )


def _manifest_payload(
    *,
    external_id: str,
    data: dict[str, Any],
    status: str,
    commit: str | None,
    dirty: bool,
    source_files: list[str],
    source_hashes: dict[str, str],
    ref_rel: str,
    tok_rel: str,
    p_version: str,
    pandoc_cmd: list[str],
    docx_path: Path,
    pdf_generated: bool,
    pdf_path: Path | None,
    lo_ver: str | None,
    lo_cmd: list[str] | None,
    pdf_error: str | None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
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
        "command": pandoc_cmd,
        "output_docx": str(docx_path),
        "output_docx_sha256": sha256_file(docx_path),
        "output_size_bytes": docx_path.stat().st_size,
        "libreoffice_version": lo_ver,
        "libreoffice_command": lo_cmd,
        "pdf_generated": pdf_generated,
        "output_pdf": str(pdf_path) if pdf_path else None,
        "output_pdf_sha256": sha256_file(pdf_path) if pdf_path and pdf_path.is_file() else None,
        "output_pdf_size_bytes": pdf_path.stat().st_size if pdf_path and pdf_path.is_file() else None,
        "canonical_artifact": "docx",
    }
    if pdf_error:
        payload["pdf_error"] = pdf_error
    return payload
