"""Authenticated passenger/driver complaint endpoints (L-12)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user, get_db
from app.models.enums import Role
from app.schemas.complaints import (
    ComplaintAttachmentItem,
    ComplaintCreateRequest,
    ComplaintUserItem,
)
from app.services import complaint_attachments as attachment_svc
from app.services import complaints as complaints_svc

router = APIRouter(prefix="/complaints", tags=["complaints"])


@router.post("", response_model=ComplaintUserItem, status_code=status.HTTP_201_CREATED)
async def create_complaint(
    body: ComplaintCreateRequest,
    user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ComplaintUserItem:
    if user.role not in (Role.passenger, Role.driver):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden_role")
    complaint = complaints_svc.create_complaint(
        db,
        user_id=user.user_id,
        role=user.role,
        category=body.category,
        description=body.description,
        trip_id=body.trip_id,
    )
    return complaints_svc.to_user_item(complaint)


@router.get("", response_model=list[ComplaintUserItem])
async def list_my_complaints(
    user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ComplaintUserItem]:
    if user.role not in (Role.passenger, Role.driver):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden_role")
    rows = complaints_svc.list_own_complaints(db, user_id=user.user_id)
    return [complaints_svc.to_user_item(c) for c in rows]


@router.get("/{public_reference}", response_model=ComplaintUserItem)
async def get_my_complaint(
    public_reference: str,
    user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ComplaintUserItem:
    if user.role not in (Role.passenger, Role.driver):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden_role")
    complaint = complaints_svc.get_own_complaint(
        db, user_id=user.user_id, public_reference=public_reference
    )
    return complaints_svc.to_user_item(complaint)


def _attachment_item(row) -> ComplaintAttachmentItem:
    return ComplaintAttachmentItem(
        id=row.id,
        original_file_name=row.original_file_name,
        mime_type=row.mime_type,
        size_bytes=row.size_bytes,
        created_at=row.created_at,
        uploaded_by_user_id=row.uploaded_by_user_id,
    )


@router.get(
    "/{public_reference}/attachments",
    response_model=list[ComplaintAttachmentItem],
)
async def list_my_complaint_attachments(
    public_reference: str,
    user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ComplaintAttachmentItem]:
    attachment_svc.assert_author_role(user.role)
    complaint = attachment_svc.complaint_for_author(
        db, user_id=user.user_id, public_reference=public_reference
    )
    return [_attachment_item(row) for row in attachment_svc.list_attachments(db, complaint)]


@router.post(
    "/{public_reference}/attachments",
    response_model=ComplaintAttachmentItem,
    status_code=status.HTTP_201_CREATED,
)
async def upload_my_complaint_attachment(
    public_reference: str,
    file: UploadFile = File(...),
    user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ComplaintAttachmentItem:
    attachment_svc.assert_author_role(user.role)
    complaint = attachment_svc.complaint_for_author(
        db, user_id=user.user_id, public_reference=public_reference
    )
    row = attachment_svc.add_attachment(
        db,
        complaint=complaint,
        actor_user_id=user.user_id,
        actor_role=user.role.value,
        upload=file,
    )
    return _attachment_item(row)


@router.get(
    "/{public_reference}/attachments/{attachment_id}",
    response_class=FileResponse,
)
async def download_my_complaint_attachment(
    public_reference: str,
    attachment_id: uuid.UUID,
    user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FileResponse:
    attachment_svc.assert_author_role(user.role)
    complaint = attachment_svc.complaint_for_author(
        db, user_id=user.user_id, public_reference=public_reference
    )
    row, path = attachment_svc.get_attachment_file(
        db, complaint=complaint, attachment_id=attachment_id
    )
    return attachment_svc.file_response(row, path)
