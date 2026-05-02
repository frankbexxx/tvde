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

    model_config = {"from_attributes": True}


class DriverZoneSessionCancelRequest(BaseModel):
    cancel_reason: str | None = Field(default=None, max_length=2000)


class DriverZoneCatalogItem(BaseModel):
    zone_id: str
    label_pt: str
    kind: Literal["generic", "airport"] = "generic"


class DriverZoneCatalogResponse(BaseModel):
    zones: list[DriverZoneCatalogItem]
