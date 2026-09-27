"""Register and deactivate FCM tokens for the authenticated user."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user, get_db
from app.services.device_push_tokens import (
    ALLOWED_PLATFORMS,
    register_device_token,
    unregister_device_token,
)

router = APIRouter(prefix="/push/tokens", tags=["push"])


class PushTokenBody(BaseModel):
    token: str = Field(min_length=20, max_length=512)
    platform: str = Field(min_length=1, max_length=16)


class PushTokenUnregisterBody(BaseModel):
    token: str = Field(min_length=20, max_length=512)


class PushTokenState(BaseModel):
    id: uuid.UUID
    platform: str
    active: bool


def _clean_token(raw: str) -> str:
    token = raw.strip()
    if any(ch.isspace() for ch in token):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid_push_token")
    return token


@router.post("", response_model=PushTokenState)
async def register_push_token(
    body: PushTokenBody,
    user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PushTokenState:
    platform = body.platform.strip().lower()
    if platform not in ALLOWED_PLATFORMS:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="unsupported_platform")
    row = register_device_token(
        db,
        user_id=uuid.UUID(user.user_id),
        token=_clean_token(body.token),
        platform=platform,
    )
    return PushTokenState(id=row.id, platform=row.platform, active=row.active)


@router.post("/unregister", response_model=PushTokenState)
async def unregister_push_token(
    body: PushTokenUnregisterBody,
    user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PushTokenState:
    row = unregister_device_token(
        db,
        user_id=uuid.UUID(user.user_id),
        token=_clean_token(body.token),
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="push_token_not_found")
    return PushTokenState(id=row.id, platform=row.platform, active=row.active)
