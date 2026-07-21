"""Local filesystem storage for vehicle document uploads (PARTNER-FLEET-3A)."""

from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.schemas.partner_vehicle_documents import PartnerVehicleDocumentItem
from app.services.partner_vehicle_documents import (
    document_to_item,
    get_document_for_partner_or_404,
)

_MAX_BYTES = 5 * 1024 * 1024


def _upload_root() -> Path:
    root = Path(settings.UPLOAD_DIR)
    root.mkdir(parents=True, exist_ok=True)
    return root


def save_vehicle_document_file(
    db: Session,
    *,
    partner_id: str,
    vehicle_id: uuid.UUID,
    document_id: uuid.UUID,
    upload: UploadFile,
) -> PartnerVehicleDocumentItem:
    doc = get_document_for_partner_or_404(
        db,
        partner_id=partner_id,
        vehicle_id=vehicle_id,
        document_id=document_id,
    )

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

    ext = Path(upload.filename or "file.bin").suffix.lower()[:12] or ".bin"
    rel = (
        Path(str(doc.partner_id))
        / "vehicles"
        / str(doc.vehicle_id)
        / doc.document_type
        / f"{uuid.uuid4().hex}{ext}"
    )
    dest = _upload_root() / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(raw)

    doc.file_path = str(rel).replace("\\", "/")
    doc.file_name = upload.filename or dest.name
    doc.status = "pending_review"
    doc.reviewed_by = None
    doc.reviewed_at = None
    db.commit()
    db.refresh(doc)
    return document_to_item(doc)


def resolve_vehicle_document_path(
    db: Session,
    *,
    partner_id: str,
    vehicle_id: uuid.UUID,
    document_id: uuid.UUID,
) -> Path:
    doc = get_document_for_partner_or_404(
        db,
        partner_id=partner_id,
        vehicle_id=vehicle_id,
        document_id=document_id,
    )
    rel = doc.file_path
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
