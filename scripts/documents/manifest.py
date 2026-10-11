"""build-manifest.json read/write and inspect."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from scripts.documents.hashes import sha256_file
from scripts.documents.pdf_check import validate_pdf_file

MANIFEST_NAME = "build-manifest.json"
DOCX_NAME = "dossier.docx"
PDF_NAME = "dossier.pdf"


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def write_manifest(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def load_manifest(out_dir: Path) -> dict[str, Any]:
    manifest_path = out_dir / MANIFEST_NAME
    if not manifest_path.is_file():
        raise FileNotFoundError(f"missing {MANIFEST_NAME} in {out_dir}")
    return json.loads(manifest_path.read_text(encoding="utf-8"))


@dataclass
class InspectReport:
    ok: bool
    external_id: str
    manifest_path: Path
    docx_path: Path
    pdf_path: Path
    docx_exists: bool
    pdf_exists: bool
    docx_hash_match: bool
    pdf_hash_match: bool
    docx_size_bytes: int
    pdf_size_bytes: int
    pandoc_version: str
    libreoffice_version: str
    pdf_generated: bool
    messages: list[str] = field(default_factory=list)


def inspect_output_dir(out_dir: Path) -> InspectReport:
    messages: list[str] = []
    manifest_path = out_dir / MANIFEST_NAME
    docx_path = out_dir / DOCX_NAME
    pdf_path = out_dir / PDF_NAME

    if not manifest_path.is_file():
        return InspectReport(
            ok=False,
            external_id="",
            manifest_path=manifest_path,
            docx_path=docx_path,
            pdf_path=pdf_path,
            docx_exists=False,
            pdf_exists=False,
            docx_hash_match=False,
            pdf_hash_match=False,
            docx_size_bytes=0,
            pdf_size_bytes=0,
            pandoc_version="",
            libreoffice_version="",
            pdf_generated=False,
            messages=[f"manifest not found: {manifest_path}"],
        )

    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    external_id = str(data.get("external_id", ""))
    pandoc_ver = str(data.get("pandoc_version", ""))
    lo_ver = str(data.get("libreoffice_version") or "")
    pdf_generated = bool(data.get("pdf_generated"))

    docx_exists = docx_path.is_file()
    pdf_exists = pdf_path.is_file()
    if not docx_exists:
        messages.append(f"missing DOCX: {docx_path}")

    docx_size = docx_path.stat().st_size if docx_exists else 0
    pdf_size = pdf_path.stat().st_size if pdf_exists else 0

    docx_hash_match = False
    expected_docx = str(data.get("output_docx_sha256", ""))
    if docx_exists and expected_docx:
        docx_hash_match = sha256_file(docx_path) == expected_docx
        if not docx_hash_match:
            messages.append("DOCX hash does not match manifest")
    elif docx_exists:
        messages.append("manifest missing output_docx_sha256")

    pdf_hash_match = False
    if pdf_generated:
        expected_pdf = str(data.get("output_pdf_sha256") or "")
        if not pdf_exists:
            messages.append(f"missing PDF (pdf_generated=true): {pdf_path}")
        elif expected_pdf:
            pdf_hash_match = sha256_file(pdf_path) == expected_pdf
            if not pdf_hash_match:
                messages.append("PDF hash does not match manifest")
            else:
                pdf_check = validate_pdf_file(pdf_path)
                if not pdf_check.ok:
                    messages.extend([f"PDF check: {m}" for m in pdf_check.messages])
                    pdf_hash_match = False
        else:
            messages.append("manifest missing output_pdf_sha256")

    ok = docx_exists and docx_hash_match and not messages
    if pdf_generated:
        ok = ok and pdf_exists and pdf_hash_match

    if ok:
        if pdf_generated:
            messages.append("DOCX, PDF and manifest OK")
        else:
            messages.append("DOCX and manifest OK (PDF not generated)")

    return InspectReport(
        ok=ok,
        external_id=external_id,
        manifest_path=manifest_path,
        docx_path=docx_path,
        pdf_path=pdf_path,
        docx_exists=docx_exists,
        pdf_exists=pdf_exists,
        docx_hash_match=docx_hash_match,
        pdf_hash_match=pdf_hash_match,
        docx_size_bytes=docx_size,
        pdf_size_bytes=pdf_size,
        pandoc_version=pandoc_ver,
        libreoffice_version=lo_ver,
        pdf_generated=pdf_generated,
        messages=messages,
    )
