"""Local filesystem storage for driver document uploads (MVP)."""

from __future__ import annotations

import re
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
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


def _upload_root() -> Path:
    root = Path(settings.UPLOAD_DIR)
    root.mkdir(parents=True, exist_ok=True)
    return root


def save_driver_document_file(
    db: Session,
    *,
    driver_user_id: uuid.UUID,
    doc_key: str,
    upload: UploadFile,
) -> dict:
    if not _DOC_KEY_RE.match(doc_key):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_doc_key")
    driver = db.get(Driver, driver_user_id)
    if not driver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")

    raw = upload.file.read(_MAX_BYTES + 1)
    if len(raw) > _MAX_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="file_too_large")
    if len(raw) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="empty_file")

    ext = Path(upload.filename or "file.bin").suffix.lower()[:12] or ".bin"
    rel = Path(str(driver_user_id)) / doc_key / f"{uuid.uuid4().hex}{ext}"
    dest = _upload_root() / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(raw)

    state = get_documents_for_driver(db, driver_user_id)
    docs = dict(state.get("docs") or {})
    entry = dict(docs.get(doc_key) or {})
    entry["file_path"] = str(rel).replace("\\", "/")
    entry["file_name"] = upload.filename or dest.name
    # A new file invalidates any previous partner decision for this document.
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="file_not_found")
    path = (_upload_root() / rel).resolve()
    if not path.is_file() or _upload_root().resolve() not in path.parents:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="file_not_found")
    return path
