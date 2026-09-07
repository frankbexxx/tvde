"""Complaint API schemas (L-12 / L-25)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.models.enums import ComplaintCategory, ComplaintSource, ComplaintStatus


DESCRIPTION_MAX = 4000
RESOLUTION_MAX = 4000
EXTERNAL_REF_MAX = 128
NAME_MAX = 200
EMAIL_MAX = 255
PHONE_MAX = 32

ADMIN_EXTERNAL_SOURCES = frozenset(
    {
        ComplaintSource.livro_reclamacoes,
        ComplaintSource.ral,
        ComplaintSource.other,
    }
)


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
    complainant_user_id: Optional[uuid.UUID] = None
    trip_id: Optional[uuid.UUID] = None
    category: str
    description: str
    source: str
    external_reference: Optional[str] = None
    external_response_due_at: Optional[datetime] = None
    external_responded_at: Optional[datetime] = None
    complainant_name: Optional[str] = None
    complainant_email: Optional[str] = None
    complainant_phone: Optional[str] = None
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
    source: str
    external_reference: Optional[str] = None
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


class ComplaintAdminExternalCreateRequest(BaseModel):
    """Admin-only import of external complaints (LRE / RAL / other)."""

    source: ComplaintSource
    category: ComplaintCategory
    description: str = Field(..., min_length=1, max_length=DESCRIPTION_MAX)
    submitted_at: datetime
    external_reference: Optional[str] = Field(None, max_length=EXTERNAL_REF_MAX)
    complainant_name: Optional[str] = Field(None, max_length=NAME_MAX)
    complainant_email: Optional[str] = Field(None, max_length=EMAIL_MAX)
    complainant_phone: Optional[str] = Field(None, max_length=PHONE_MAX)
    external_response_due_at: Optional[datetime] = None

    @field_validator("source")
    @classmethod
    def admin_external_source_only(cls, v: ComplaintSource) -> ComplaintSource:
        if v not in ADMIN_EXTERNAL_SOURCES:
            raise ValueError("invalid_external_source")
        return v

    @field_validator("description")
    @classmethod
    def strip_description(cls, v: str) -> str:
        text = (v or "").strip()
        if not text:
            raise ValueError("description_required")
        return text

    @field_validator(
        "external_reference",
        "complainant_name",
        "complainant_email",
        "complainant_phone",
    )
    @classmethod
    def strip_optional(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        text = v.strip()
        return text or None
