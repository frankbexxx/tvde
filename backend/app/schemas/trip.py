from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.enums import PaymentStatus, TripStatus
from app.schemas.driver import DriverLocationResponse


class TripCreateRequest(BaseModel):
    origin_lat: float = Field(..., ge=-90.0, le=90.0)
    origin_lng: float = Field(..., ge=-180.0, le=180.0)
    destination_lat: float = Field(..., ge=-90.0, le=90.0)
    destination_lng: float = Field(..., ge=-180.0, le=180.0)


class TripCreateResponse(BaseModel):
    trip_id: str
    status: TripStatus
    estimated_price: float
    eta: int
    payment_status: Optional[PaymentStatus] = None
    final_price: Optional[float] = None
    commission_amount: Optional[float] = None
    driver_payout: Optional[float] = None
    stripe_payment_intent_id: Optional[str] = None  # Only for admin


class TripCancelRequest(BaseModel):
    reason: Optional[str] = Field(None, max_length=280)


class TripRateRequest(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="Rating 1-5")


class TripStatusResponse(BaseModel):
    trip_id: str
    status: TripStatus
    payment_status: Optional[PaymentStatus] = None
    final_price: Optional[float] = None
    commission_amount: Optional[float] = None
    driver_payout: Optional[float] = None
    stripe_payment_intent_id: Optional[str] = None  # Only for admin
    payment_intent_client_secret: Optional[str] = None  # When ENABLE_CONFIRM_ON_ACCEPT


class TripCompletionRequest(BaseModel):
    """Body for complete_trip. final_price ignored for now (pricing real futuro)."""
    final_price: float = Field(0.0, ge=0.0, description="Final price (>=0). Currently unused, reserved for future pricing.")


class TripAvailableItem(BaseModel):
    trip_id: str
    origin_lat: float
    origin_lng: float
    destination_lat: float
    destination_lng: float
    estimated_price: float
    offer_id: Optional[str] = None  # When from multi-offer dispatch


class TripOfferItem(BaseModel):
    """Offer sent to driver for a requested trip."""
    offer_id: str
    trip_id: str
    origin_lat: float
    origin_lng: float
    destination_lat: float
    destination_lng: float
    estimated_price: float
    expires_at: str


class TripActiveItem(BaseModel):
    trip_id: str
    status: TripStatus
    passenger_id: str
    driver_id: Optional[str] = None
    origin_lat: float
    origin_lng: float
    destination_lat: float
    destination_lng: float


class TripHistoryItem(BaseModel):
    """Completed trip for history list."""

    trip_id: str
    status: TripStatus
    origin_lat: float
    origin_lng: float
    destination_lat: float
    destination_lng: float
    estimated_price: float
    final_price: Optional[float] = None
    completed_at: Optional[datetime] = None
    payment_status: Optional[PaymentStatus] = None
    commission_amount: Optional[float] = None
    driver_payout: Optional[float] = None
    stripe_payment_intent_id: Optional[str] = None  # Only for admin


class TripDetailResponse(BaseModel):
    """Full trip detail with optional payment data."""

    trip_id: str
    status: TripStatus
    passenger_id: str
    driver_id: Optional[str] = None
    origin_lat: float
    origin_lng: float
    destination_lat: float
    destination_lng: float
    estimated_price: float
    final_price: Optional[float] = None
    distance_km: Optional[float] = None
    duration_min: Optional[float] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    payment_status: Optional[PaymentStatus] = None
    commission_amount: Optional[float] = None
    driver_payout: Optional[float] = None
    stripe_payment_intent_id: Optional[str] = None  # Only for admin
    driver_location: Optional[DriverLocationResponse] = Field(
        default=None,
        description="Última posição do motorista quando a viagem permite rasto (accepted/arriving/ongoing).",
    )

