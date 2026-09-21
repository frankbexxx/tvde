"""Local filesystem storage for driver document uploads (MVP).

Upload type policy aligned with ``vehicle_document_upload`` (L-SEC-16):
PDF / JPEG / PNG only. Legacy files already on disk remain readable; new uploads
must pass the allowlist.
"""

from __future__ import annotations

import re
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.driver import Driver
from app.services.driver_documents import (
    _utc_iso_now,
    get_documents_for_driver,
    serialize_state,
)


_DOC_KEY_RE = re.compile(r"^[a-z0-9_]{2,64}$")
_MAX_BYTES = 5 * 1024 * 1024
_ALLOWED_EXTS = frozenset({".pdf", ".jpg", ".jpeg", ".png"})
_ALLOWED_MIMES = frozenset({"application/pdf", "image/jpeg", "image/png"})
_MEDIA_BY_EXT = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
}


def _upload_root() -> Path:
    root = Path(settings.UPLOAD_DIR)
    root.mkdir(parents=True, exist_ok=True)
    return root


def _validate_driver_document_file(upload: UploadFile) -> str:
    """Return normalised extension or raise 415 (same contract as vehicle uploads)."""
    ext = Path(upload.filename or "").suffix.lower()[:12]
    if ext not in _ALLOWED_EXTS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="invalid_file_type",
        )
    mime = (upload.content_type or "").split(";")[0].strip().lower()
    if mime and mime not in _ALLOWED_MIMES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="invalid_file_type",
        )
    return ext


def media_type_for_stored_driver_document(path: Path) -> str:
    """Explicit Content-Type for download. Unknown legacy suffixes → octet-stream."""
    return _MEDIA_BY_EXT.get(path.suffix.lower(), "application/octet-stream")


def file_response_for_driver_document(path: Path) -> FileResponse:
    """Serve with allowlist-derived MIME and attachment disposition (no inline HTML/SVG)."""
    return FileResponse(
        path,
        filename=path.name,
        media_type=media_type_for_stored_driver_document(path),
        content_disposition_type="attachment",
    )


def save_driver_document_file(
    db: Session,
    *,
    driver_user_id: uuid.UUID,
    doc_key: str,
    upload: UploadFile,
) -> dict:
    # 1) auth/ownership (caller role) + doc_key / driver row
    if not _DOC_KEY_RE.match(doc_key):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_doc_key"
        )
    driver = db.get(Driver, driver_user_id)
    if not driver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")

    # 2) size (before write)
    raw = upload.file.read(_MAX_BYTES + 1)
    if len(raw) > _MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="file_too_large",
        )
    if len(raw) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="empty_file"
        )

    # 3–4) extension + MIME allowlist (do not trust filename alone)
    ext = _validate_driver_document_file(upload)

    # 5) safe storage path (UUID name; only validated ext)
    rel = Path(str(driver_user_id)) / doc_key / f"{uuid.uuid4().hex}{ext}"
    dest = _upload_root() / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(raw)

    state = get_documents_for_driver(db, driver_user_id)
    docs = dict(state.get("docs") or {})
    entry = dict(docs.get(doc_key) or {})
    entry["file_path"] = str(rel).replace("\\", "/")
    entry["file_name"] = upload.filename or dest.name
    entry["status"] = "pending_review"
    entry["submitted_at"] = _utc_iso_now()
    docs[doc_key] = entry
    state["docs"] = docs
    driver.documents = serialize_state(state)
    db.commit()
    db.refresh(driver)
    return state


def resolve_driver_document_path(
    db: Session,
    *,
    driver_user_id: uuid.UUID,
    doc_key: str,
    partner_id: uuid.UUID | None = None,
) -> Path:
    driver = db.get(Driver, driver_user_id)
    if not driver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
    if partner_id is not None and driver.partner_id != partner_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
    state = get_documents_for_driver(db, driver_user_id)
    entry = (state.get("docs") or {}).get(doc_key) or {}
    rel = entry.get("file_path")
    if not rel or not isinstance(rel, str):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="file_not_found"
        )
    if Path(rel).is_absolute() or ".." in Path(rel).parts:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="file_not_found"
        )
    root = _upload_root().resolve()
    path = (root / rel).resolve()
    if not path.is_file() or root not in path.parents:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="file_not_found"
        )
    return path
