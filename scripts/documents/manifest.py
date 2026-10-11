"""build-manifest.json read/write and inspect."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from scripts.documents.hashes import sha256_file

MANIFEST_NAME = "build-manifest.json"
DOCX_NAME = "dossier.docx"


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
    docx_exists: bool
    hash_match: bool
    size_bytes: int
    pandoc_version: str
    messages: list[str]


def inspect_output_dir(out_dir: Path) -> InspectReport:
    messages: list[str] = []
    manifest_path = out_dir / MANIFEST_NAME
    docx_path = out_dir / DOCX_NAME

    if not manifest_path.is_file():
        return InspectReport(
            ok=False,
            external_id="",
            manifest_path=manifest_path,
            docx_path=docx_path,
            docx_exists=False,
            hash_match=False,
            size_bytes=0,
            pandoc_version="",
            messages=[f"manifest not found: {manifest_path}"],
        )

    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    external_id = str(data.get("external_id", ""))
    pandoc_ver = str(data.get("pandoc_version", ""))
    expected_hash = str(data.get("output_docx_sha256", ""))

    docx_exists = docx_path.is_file()
    if not docx_exists:
        messages.append(f"missing output: {docx_path}")

    size = docx_path.stat().st_size if docx_exists else 0
    hash_match = False
    if docx_exists and expected_hash:
        actual = sha256_file(docx_path)
        hash_match = actual == expected_hash
        if not hash_match:
            messages.append("output DOCX hash does not match manifest")
    elif docx_exists and not expected_hash:
        messages.append("manifest missing output_docx_sha256")

    ok = docx_exists and hash_match and not messages
    if ok:
        messages.append("manifest and output DOCX OK")

    return InspectReport(
        ok=ok,
        external_id=external_id,
        manifest_path=manifest_path,
        docx_path=docx_path,
        docx_exists=docx_exists,
        hash_match=hash_match,
        size_bytes=size,
        pandoc_version=pandoc_ver,
        messages=messages,
    )
