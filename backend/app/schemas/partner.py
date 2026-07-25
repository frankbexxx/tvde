from datetime import datetime
from typing import Any

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
    documents: dict[str, dict[str, Any]] | None = None
    # PARTNER-FLEET-1A: trip activa (assigned|accepted|arriving|ongoing), se existir.
    active_trip_id: str | None = None
    active_trip_status: str | None = None
    # PARTNER-FLEET-2A: viatura activa (0/1).
    active_vehicle_id: str | None = None
    vehicle_plate: str | None = None
    vehicle_make: str | None = None
    vehicle_model: str | None = None
    vehicle_service_categories: list[str] | None = None


class PartnerVehicleCreateRequest(BaseModel):
    plate: str = Field(..., min_length=1, max_length=32)
    make: str = Field(..., min_length=1, max_length=80)
    model: str = Field(..., min_length=1, max_length=80)
    year: int | None = None
    color: str | None = Field(default=None, max_length=40)
    service_categories: list[str] = Field(default_factory=lambda: ["x"])
    status: str | None = Field(default="active", max_length=24)


class PartnerVehiclePatchRequest(BaseModel):
    plate: str | None = Field(default=None, min_length=1, max_length=32)
    make: str | None = Field(default=None, min_length=1, max_length=80)
    model: str | None = Field(default=None, min_length=1, max_length=80)
    year: int | None = None
    color: str | None = Field(default=None, max_length=40)
    service_categories: list[str] | None = None
    status: str | None = Field(default=None, max_length=24)


class PartnerVehicleAssignRequest(BaseModel):
    driver_user_id: str = Field(..., min_length=1)


class PartnerVehicleDocumentSummary(BaseModel):
    """PF3C-2A — aggregate P0 document alert counts (FE-aligned worst_status)."""

    total_required: int
    present_count: int
    missing_count: int
    expired_count: int
    expiring_soon_count: int
    pending_review_count: int
    rejected_count: int
    valid_count: int
    worst_status: str


class PartnerVehicleCompliance(BaseModel):
    """PF3D-2 — read-only vehicle document compliance (no runtime gates).

    Evaluates the vehicle's documents only (``has_active_vehicle=True``).
    ``no_active_vehicle`` is a driver/gate concept — not used on vehicle items.
    """

    compliance_status: str
    blocking_reasons: list[str]
    warning_reasons: list[str]
    worst_status: str | None = None


class PartnerVehicleItem(BaseModel):
    id: str
    partner_id: str
    plate: str
    plate_normalized: str
    make: str
    model: str
    year: int | None = None
    color: str | None = None
    service_categories: list[str]
    status: str
    created_at: str
    updated_at: str
    assigned_driver_id: str | None = None
    assigned_driver_name: str | None = None
    # PF3C-2A — document alert summary (always present; empty fleet = all missing).
    document_summary: PartnerVehicleDocumentSummary
    # PF3D-2 — derived from document_summary; always present; does not gate ops.
    vehicle_compliance: PartnerVehicleCompliance


class PartnerTripItem(BaseModel):
    trip_id: str
    status: str
    passenger_id: str
    driver_id: str | None = None
    origin_lat: float
    origin_lng: float
    destination_lat: float
    destination_lng: float
    estimated_price: float
    final_price: float | None = None
    cancel_reason: str | None = None
    created_at: str
    started_at: str | None = None
    completed_at: str | None = None
    updated_at: str


class PartnerMetricsResponse(BaseModel):
    trips_today: int
    trips_total: int
    active_drivers: int
    trips_completed: int
    trips_cancelled: int
    total_drivers: int
    # PARTNER-FLEET-1A: completed hoje (por completed_at) + receita bruta app (€).
    trips_completed_today: int = 0
    revenue_completed_today: float = 0.0


class PartnerDriverStatusPatchRequest(BaseModel):
    """C013 — enable/disable driver (approved ↔ rejected)."""

    enabled: bool


class PartnerDriverAvailabilityPatchRequest(BaseModel):
    """C014 — force online/offline (is_available)."""

    online: bool


class PartnerTripReassignRequest(BaseModel):
    """I011 — swap driver on an assigned trip within the same fleet."""

    driver_user_id: str = Field(..., min_length=1)


class PartnerDriverDiscoveryItem(BaseModel):
    """C018 — candidate driver to add to this fleet."""

    user_id: str
    name: str | None = None
    phone: str | None = None
    status: str
    partner_id: str


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
