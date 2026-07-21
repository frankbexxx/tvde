"""PARTNER-FLEET-3A — Partner vehicle document schemas."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


VEHICLE_DOCUMENT_TYPES = frozenset(
    {
        "vehicle_registration",
        "vehicle_insurance",
        "periodic_inspection",
        "tvde_sticker",
    }
)

VEHICLE_DOCUMENT_STATUSES = frozenset(
    {
        "pending_review",
        "approved",
        "rejected",
    }
)


class PartnerVehicleDocumentCreateRequest(BaseModel):
    document_type: str = Field(..., min_length=2, max_length=64)
    status: str | None = Field(default="pending_review", max_length=32)
    document_number: str | None = Field(default=None, max_length=120)
    issuer: str | None = Field(default=None, max_length=200)
    valid_from: str | None = None
    expires_at: str | None = None
    issued_at: str | None = None
    metadata: dict[str, Any] | None = None
    notes: str | None = None


class PartnerVehicleDocumentPatchRequest(BaseModel):
    status: str | None = Field(default=None, max_length=32)
    document_number: str | None = Field(default=None, max_length=120)
    issuer: str | None = Field(default=None, max_length=200)
    valid_from: str | None = None
    expires_at: str | None = None
    issued_at: str | None = None
    metadata: dict[str, Any] | None = None
    notes: str | None = None


class PartnerVehicleDocumentItem(BaseModel):
    id: str
    vehicle_id: str
    partner_id: str
    document_type: str
    status: str
    computed_status: str
    file_path: str | None = None
    file_name: str | None = None
    has_file: bool = False
    document_number: str | None = None
    issuer: str | None = None
    valid_from: str | None = None
    expires_at: str | None = None
    issued_at: str | None = None
    metadata: dict[str, Any] | None = None
    notes: str | None = None
    reviewed_by: str | None = None
    reviewed_at: str | None = None
    created_at: str
    updated_at: str


class PartnerVehicleDocumentsSummaryItem(BaseModel):
    document_type: str
    computed_status: str
    document_id: str | None = None
