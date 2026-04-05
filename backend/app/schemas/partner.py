from datetime import datetime

from pydantic import BaseModel, Field


class PartnerDriverUserBrief(BaseModel):
    name: str | None = None
    phone: str | None = None


class PartnerDriverLastLocation(BaseModel):
    lat: float
    lng: float
    timestamp: str


class PartnerDriverItem(BaseModel):
    user_id: str
    partner_id: str
    status: str
    is_available: bool
    user: PartnerDriverUserBrief
    last_location: PartnerDriverLastLocation | None = None


class PartnerTripItem(BaseModel):
    trip_id: str
    status: str
    passenger_id: str
    driver_id: str | None = None
    created_at: str
    started_at: str | None = None
    completed_at: str | None = None
    updated_at: str


class PartnerMetricsResponse(BaseModel):
    trips_today: int
    trips_total: int
    active_drivers: int


class AdminCreatePartnerRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)


class AdminPartnerCreatedResponse(BaseModel):
    id: str
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminAssignPartnerRequest(BaseModel):
    partner_id: str = Field(..., min_length=1)


class AdminAssignPartnerResponse(BaseModel):
    user_id: str
    partner_id: str


class AdminCreatePartnerOrgAdminRequest(BaseModel):
    """Fleet manager login identity. Email reserved for future profile / notifications (not stored yet)."""

    name: str = Field(..., min_length=1, max_length=120)
    phone: str = Field(..., min_length=3, max_length=32)
    email: str | None = Field(default=None, max_length=255)


class AdminPartnerOrgAdminCreatedResponse(BaseModel):
    user_id: str
    role: str
    partner_id: str
    phone: str
    name: str
