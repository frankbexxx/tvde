from pydantic import BaseModel, Field

from app.models.enums import DriverStatus


class DriverStatusResponse(BaseModel):
    driver_id: str
    status: DriverStatus


class DriverLocationPayload(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)
    timestamp: int = Field(
        ..., description="Client-side timestamp in milliseconds since epoch."
    )


class DriverLocationResponse(BaseModel):
    lat: float
    lng: float
    timestamp: int
