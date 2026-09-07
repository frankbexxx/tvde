"""Complaint API schemas (L-12)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.models.enums import ComplaintCategory, ComplaintStatus


DESCRIPTION_MAX = 4000
RESOLUTION_MAX = 4000


class ComplaintCreateRequest(BaseModel):
    category: ComplaintCategory
    description: str = Field(..., min_length=1, max_length=DESCRIPTION_MAX)
    trip_id: Optional[uuid.UUID] = None

    @field_validator("description")
    @classmethod
    def strip_description(cls, v: str) -> str:
        text = (v or "").strip()
        if not text:
            raise ValueError("description_required")
        return text


class ComplaintUserItem(BaseModel):
    public_reference: str
    category: str
    description: str
    status: str
    submitted_at: datetime
    trip_id: Optional[uuid.UUID] = None
    resolution: Optional[str] = None


class ComplaintHistoryItem(BaseModel):
    event_type: str
    from_status: Optional[str] = None
    to_status: Optional[str] = None
    actor_user_id: Optional[uuid.UUID] = None
    occurred_at: datetime
    metadata: Optional[dict] = None


class ComplaintAdminItem(BaseModel):
    id: uuid.UUID
    public_reference: str
    complainant_role: str
    complainant_user_id: uuid.UUID
    trip_id: Optional[uuid.UUID] = None
    category: str
    description: str
    source: str
    submitted_at: datetime
    status: str
    assigned_to: Optional[uuid.UUID] = None
    resolution: Optional[str] = None
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    retention_until: datetime
    created_at: datetime
    updated_at: datetime
    history: list[ComplaintHistoryItem] = Field(default_factory=list)


class ComplaintAdminListItem(BaseModel):
    id: uuid.UUID
    public_reference: str
    complainant_role: str
    category: str
    status: str
    submitted_at: datetime
    trip_id: Optional[uuid.UUID] = None
    assigned_to: Optional[uuid.UUID] = None


class ComplaintAdminUpdateRequest(BaseModel):
    status: Optional[ComplaintStatus] = None
    assigned_to: Optional[uuid.UUID] = None
    clear_assigned_to: bool = False
    resolution: Optional[str] = Field(None, max_length=RESOLUTION_MAX)

    @field_validator("resolution")
    @classmethod
    def strip_resolution(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        text = v.strip()
        return text or None
