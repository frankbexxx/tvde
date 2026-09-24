"""Complaint file attachments stored under settings.UPLOAD_DIR (L-12).

Physical names are UUIDs. The original filename is metadata only.
A future complaint purge must delete these rows and the files on disk.
"""

from __future__ import annotations

import re
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.complaint import Complaint, ComplaintAttachment
from app.models.enums import ComplaintHistoryEventType, ComplaintStatus, Role
from app.services.complaints import (
    _append_history,
    _parse_uuid,
    _record_operational_audit,
    get_complaint_by_public_reference,
    get_own_complaint,
)

_MAX_BYTES = 5 * 1024 * 1024
_MAX_ATTACHMENTS = 5
_ALLOWED_EXTS = frozenset({".pdf", ".jpg", ".jpeg", ".png"})
_ALLOWED_MIMES = frozenset({"application/pdf", "image/jpeg", "image/png"})
_MIME_BY_EXT = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
}
_NAME_RE = re.compile(r"[^A-Za-z0-9._ -]")


def _upload_root() -> Path:
    root = Path(settings.UPLOAD_DIR)
    root.mkdir(parents=True, exist_ok=True)
    return root


def _magic_matches(ext: str, raw: bytes) -> bool:
    if ext == ".pdf":
        return raw.startswith(b"%PDF")
    if ext in {".jpg", ".jpeg"}:
        return raw.startswith(b"\xff\xd8\xff")
    if ext == ".png":
        return raw.startswith(b"\x89PNG\r\n\x1a\n")
    return False


def _safe_original_name(filename: str | None, ext: str) -> str:
    base = Path(filename or "").name
    base = _NAME_RE.sub("_", base).strip(" .")[:180]
    if not base or base in {".", ".."} or ".." in base:
        return f"attachment{ext}"
    if Path(base).suffix.lower() != ext:
        base = f"{Path(base).stem}{ext}"
    return base[:200]


def _validate_bytes(upload: UploadFile, raw: bytes) -> tuple[str, str]:
    ext = Path(upload.filename or "").suffix.lower()[:12]
    if ext not in _ALLOWED_EXTS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="invalid_file_type",
        )
    mime = (upload.content_type or "").split(";")[0].strip().lower()
    expected = _MIME_BY_EXT[ext]
    if mime and mime not in _ALLOWED_MIMES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="invalid_file_type",
        )
    if mime and mime != expected:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="invalid_file_content",
        )
    if not _magic_matches(ext, raw):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="invalid_file_content",
        )
    return ext, expected


def _lock_complaint(db: Session, complaint: Complaint) -> Complaint:
    locked = db.execute(
        select(Complaint).where(Complaint.id == complaint.id).with_for_update()
    ).scalar_one()
    return locked


def _assert_open(complaint: Complaint) -> None:
    if complaint.status == ComplaintStatus.closed.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="complaint_closed",
        )


def add_attachment(
    db: Session,
    *,
    complaint: Complaint,
    actor_user_id: str,
    actor_role: str,
    upload: UploadFile,
) -> ComplaintAttachment:
    actor = _parse_uuid(actor_user_id, detail="user_not_found")
    complaint = _lock_complaint(db, complaint)
    _assert_open(complaint)
    count = db.scalar(
        select(func.count())
        .select_from(ComplaintAttachment)
        .where(ComplaintAttachment.complaint_id == complaint.id)
    )
    if int(count or 0) >= _MAX_ATTACHMENTS:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="attachment_limit",
        )
    raw = upload.file.read(_MAX_BYTES + 1)
    if len(raw) > _MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail="file_too_large",
        )
    if len(raw) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="empty_file")
    ext, mime = _validate_bytes(upload, raw)
    original = _safe_original_name(upload.filename, ext)
    stored_name = f"{uuid.uuid4().hex}{ext}"
    rel = Path("complaints") / str(complaint.id) / stored_name
    if rel.is_absolute() or ".." in rel.parts:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_file_name")
    root = _upload_root().resolve()
    dest = (root / rel).resolve()
    if root not in dest.parents:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_file_name")
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(raw)
    row = ComplaintAttachment(
        id=uuid.uuid4(),
        complaint_id=complaint.id,
        uploaded_by_user_id=actor,
        original_file_name=original,
        stored_path=str(rel).replace("\\", "/"),
        mime_type=mime,
        size_bytes=len(raw),
    )
    db.add(row)
    db.flush()
    _append_history(
        db,
        complaint=complaint,
        event_type=ComplaintHistoryEventType.attachment_added,
        actor_user_id=actor,
        from_status=complaint.status,
        to_status=complaint.status,
        metadata={
            "attachment_id": str(row.id),
            "original_file_name": original,
            "mime_type": mime,
            "size_bytes": len(raw),
        },
    )
    _record_operational_audit(
        db,
        event_type="complaint.attachment_added",
        complaint=complaint,
        actor_user_id=str(actor),
        actor_role=actor_role,
        payload_extra={
            "attachment_id": str(row.id),
            "mime_type": mime,
            "size_bytes": len(raw),
        },
    )
    db.commit()
    db.refresh(row)
    return row


def list_attachments(db: Session, complaint: Complaint) -> list[ComplaintAttachment]:
    return list(
        db.execute(
            select(ComplaintAttachment)
            .where(ComplaintAttachment.complaint_id == complaint.id)
            .order_by(ComplaintAttachment.created_at.asc())
        ).scalars().all()
    )


def get_attachment_file(
    db: Session,
    *,
    complaint: Complaint,
    attachment_id: uuid.UUID,
) -> tuple[ComplaintAttachment, Path]:
    row = db.get(ComplaintAttachment, attachment_id)
    if row is None or row.complaint_id != complaint.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="attachment_not_found")
    rel = Path(row.stored_path)
    if rel.is_absolute() or ".." in rel.parts:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="attachment_not_found")
    root = _upload_root().resolve()
    path = (root / rel).resolve()
    if not path.is_file() or root not in path.parents:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="attachment_not_found")
    return row, path


def file_response(row: ComplaintAttachment, path: Path) -> FileResponse:
    return FileResponse(
        path,
        filename=row.original_file_name,
        media_type=row.mime_type,
        content_disposition_type="attachment",
    )


def complaint_for_author(db: Session, *, user_id: str, public_reference: str) -> Complaint:
    return get_own_complaint(db, user_id=user_id, public_reference=public_reference)


def complaint_for_admin(db: Session, public_reference: str) -> Complaint:
    return get_complaint_by_public_reference(db, public_reference)


def assert_author_role(role: Role) -> None:
    if role not in (Role.passenger, Role.driver):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden_role")
