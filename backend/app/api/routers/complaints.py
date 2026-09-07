"""Authenticated passenger/driver complaint endpoints (L-12)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user, get_db
from app.models.enums import Role
from app.schemas.complaints import ComplaintCreateRequest, ComplaintUserItem
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
