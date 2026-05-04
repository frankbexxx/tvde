from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field
from typing import Literal


class DriverZoneBudgetResponse(BaseModel):
    service_date: date
    used_changes: int
    max_changes: int
    remaining: int
    timezone: str
    resets_at_next_midnight_local: bool = Field(
        default=True,
        description="v1: counter resets at 00:00 local (Europe/Lisbon).",
    )


class DriverZoneSessionCreateRequest(BaseModel):
    zone_id: str = Field(..., min_length=1, max_length=128)
    eta_seconds_baseline: int = Field(..., gt=0, le=86400 * 2)
    eta_margin_percent: int = Field(default=25, ge=0, le=200)


class DriverZoneSessionResponse(BaseModel):
    id: uuid.UUID
    driver_id: uuid.UUID
    zone_id: str
    started_at: datetime
    eta_seconds_baseline: int
    eta_margin_percent: int
    deadline_at: datetime
    arrived_at: datetime | None = None
    first_completed_trip_id: uuid.UUID | None = None
    first_completed_at: datetime | None = None
    consume_reason: str | None = None
    status: str
    extension_requested: bool = False
    extension_reason: str | None = None
    extension_seconds_approved: int | None = None
    approved_by_partner_user_id: uuid.UUID | None = None

    model_config = {"from_attributes": True}


class DriverZoneSessionCancelRequest(BaseModel):
    cancel_reason: str | None = Field(default=None, max_length=2000)


class DriverZoneSessionExtensionRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=2000)


class PartnerZoneSessionApproveExtensionRequest(BaseModel):
    extra_seconds: int = Field(..., gt=0, le=86400 * 2)


class DriverZoneCatalogItem(BaseModel):
    zone_id: str
    label_pt: str
    kind: Literal["generic", "airport"] = "generic"
    ops_note_pt: str | None = Field(
        default=None,
        max_length=2000,
        description="Optional operator-facing note for this zone (e.g. airport queue UX roadmap).",
    )
    arrived_anchor_lat: float | None = Field(
        default=None,
        description="WGS84 anchor used with arrived_max_km when validating «Cheguei».",
    )
    arrived_anchor_lng: float | None = Field(
        default=None,
        description="WGS84 anchor used with arrived_max_km when validating «Cheguei».",
    )
    arrived_max_km: float | None = Field(
        default=None,
        description="Max great-circle distance (km) from anchor for «Cheguei»; null = no server-side gate.",
    )


class DriverZoneCatalogResponse(BaseModel):
    zones: list[DriverZoneCatalogItem]
