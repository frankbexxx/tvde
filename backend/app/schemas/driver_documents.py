"""JSON document vault for driver ↔ partner (MVP; see Manel backlog P0)."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class DriverDocumentEntryPayload(BaseModel):
    status: str | None = None
    expires_at: str | None = None
    submitted_at: str | None = None
    partner_note: str | None = None
    ocr_suggested_expires_at: str | None = None


class DriverDocumentsStateResponse(BaseModel):
    version: int
    docs: dict[str, dict[str, Any]]


class DriverDocumentsPatchRequest(BaseModel):
    docs: dict[str, DriverDocumentEntryPayload] = Field(default_factory=dict)


class DriverDocumentsSuggestExpiryRequest(BaseModel):
    text: str = Field(..., min_length=3, max_length=50_000)


class DriverDocumentsSuggestExpiryResponse(BaseModel):
    suggested_expires_at: str | None


class PartnerDriverDocumentsPatchRequest(BaseModel):
    docs: dict[str, DriverDocumentEntryPayload] = Field(default_factory=dict)
