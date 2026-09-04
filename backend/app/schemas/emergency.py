"""M2-L4 Emergency / SOS — schemas (safe public snapshot)."""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class EmergencyEventAction(str, Enum):
    opened = "opened"
    call_initiated = "call_initiated"
    shared = "shared"


class EmergencyLocationSnapshot(BaseModel):
    lat: float
    lng: float
    updated_at: str  # ISO8601 UTC
    map_link: str


class EmergencySnapshotResponse(BaseModel):
    """Public-safe emergency snapshot — no internal UUIDs or tokens."""

    trip_ref: str = Field(..., description="Short public trip reference (not full UUID).")
    status: str
    origin_lat: float
    origin_lng: float
    destination_lat: float
    destination_lng: float
    vehicle_plate: Optional[str] = None
    driver_display_name: Optional[str] = None
    location: Optional[EmergencyLocationSnapshot] = None
    role_view: str = Field(..., description="passenger | driver")


class EmergencyEventRequest(BaseModel):
    action: EmergencyEventAction


class EmergencyEventResponse(BaseModel):
    ok: bool = True
    recorded: bool = True
