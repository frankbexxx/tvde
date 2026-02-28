from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.enums import TripStatus


class TripStatusChangedEvent(BaseModel):
    event: str = Field(default="trip.status_changed")
    trip_id: str
    status: TripStatus
    timestamp: datetime


class DriverLocationEvent(BaseModel):
    event: str = Field(default="driver.location")
    trip_id: str
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)
    heading: Optional[float] = Field(None, ge=0.0, le=360.0)
    speed: Optional[float] = Field(None, ge=0.0)
    timestamp: datetime

