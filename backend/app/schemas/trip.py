from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.enums import PaymentStatus, TripStatus
from app.schemas.driver import DriverLocationResponse


class PriceBreakdownSchema(BaseModel):
    """PET-1 explicit price breakdown (EUR)."""

    base_fare: float
    distance_amount: float
    duration_amount: float
    minimum_fare_adjustment: float = 0.0
    pet_surcharge: float = 0.0
    tolls_amount: float = 0.0
    fare_subtotal: float
    total: float
    pet_surcharge_rule: str = "pet_surcharge_v1"

class TripCreateRequest(BaseModel):
    origin_lat: float = Field(..., ge=-90.0, le=90.0)
    origin_lng: float = Field(..., ge=-180.0, le=180.0)
    destination_lat: float = Field(..., ge=-90.0, le=90.0)
    destination_lng: float = Field(..., ge=-180.0, le=180.0)
    vehicle_category: Optional[str] = Field(
        default=None,
        description=(
            "Fare category (x=GO, xl, comfort, …). "
            "Legacy value 'pet' is accepted and normalized to x + has_pet=true."
        ),
    )
    has_pet: bool = Field(
        default=False,
        description="Normal Pet attribute (PET-0). Defaults false — old clients unchanged.",
    )
    pet_size: Optional[str] = Field(
        default=None,
        description="small | medium | large (optional until Passenger UX).",
    )
    pet_transport: Optional[str] = Field(
        default=None,
        description="carrier | harness (optional until Passenger UX).",
    )
    is_assistance_animal: bool = Field(
        default=False,
        description="Assistance dog (legal V1); field name kept for API compatibility. No Pet surcharge.",
    )
    pet_occupies_seat: bool = Field(
        default=False,
        description="Animal occupies a passenger seat (PET-4 capacity).",
    )
    passenger_count: int = Field(
        default=1,
        ge=1,
        le=8,
        description="Passengers excluding driver (PET-4). Default 1 for old clients.",
    )


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
    pet_surcharge: float = 0.0
    price_breakdown: Optional[PriceBreakdownSchema] = None
    has_pet: bool = False
    is_assistance_animal: bool = False
    passenger_count: int = 1


class TripCancelRequest(BaseModel):
    """Cancel body. Legacy ``reason`` kept; PET-5A.2 adds structured codes."""

    reason: Optional[str] = Field(None, max_length=280)
    reason_code: Optional[str] = Field(
        None,
        max_length=64,
        description="Structured attendable/cancel reason code (PET-5A.2).",
    )
    reason_detail: Optional[str] = Field(
        None,
        max_length=280,
        description="Internal free text; required for other_attendable_reason.",
    )


class OfferRejectRequest(BaseModel):
    """Reject offer body. Required for pet/assistance trips (PET-5A.2)."""

    reason_code: Optional[str] = Field(None, max_length=64)
    reason_detail: Optional[str] = Field(None, max_length=280)


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

    final_price: float = Field(
        0.0,
        ge=0.0,
        description="Final price (>=0). Currently unused, reserved for future pricing.",
    )


class TripAvailableItem(BaseModel):
    trip_id: str
    origin_lat: float
    origin_lng: float
    destination_lat: float
    destination_lng: float
    estimated_price: float
    vehicle_category: Optional[str] = None
    vehicle_categories: Optional[list[str]] = None
    has_pet: bool = False
    pet_size: Optional[str] = None
    pet_transport: Optional[str] = None
    is_assistance_animal: bool = False
    pet_occupies_seat: bool = False
    passenger_count: int = 1
    pet_surcharge: Optional[float] = None
    offer_id: Optional[str] = None  # When from multi-offer dispatch
    expires_at: Optional[str] = None  # ISO8601 when from multi-offer dispatch


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
    updated_at: Optional[datetime] = None
    passenger_count: int = 1
    has_pet: bool = False
    is_assistance_animal: bool = False
    pet_surcharge: Optional[float] = None
    vehicle_category: Optional[str] = None


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
    cancellation_reason: Optional[str] = Field(
        default=None,
        description=(
            "Passenger-safe label when code present; else legacy free text. "
            "Never exposes driver free-text detail when structured code is set."
        ),
    )
    cancellation_reason_code: Optional[str] = Field(
        default=None,
        description="Structured cancel reason code (PET-5A.2).",
    )
    cancelled_by: Optional[str] = None
    passenger_count: int = 1
    has_pet: bool = False
    is_assistance_animal: bool = False
    pet_surcharge: Optional[float] = None
    vehicle_category: Optional[str] = None


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
    stripe_dashboard_url: Optional[str] = Field(
        default=None,
        description="Link para o pagamento no dashboard Stripe (só admin, se PI real).",
    )
    driver_location: Optional[DriverLocationResponse] = Field(
        default=None,
        description="Última posição do motorista quando a viagem permite rasto (accepted/arriving/ongoing).",
    )
    driver_rating: Optional[int] = Field(
        default=None,
        description="Avaliação do passageiro ao motorista (1–5), após conclusão.",
    )
    passenger_rating: Optional[int] = Field(
        default=None,
        description="Avaliação do motorista ao passageiro (1–5), após conclusão.",
    )
    cancellation_reason: Optional[str] = Field(
        default=None,
        description=(
            "Passenger-safe label when structured code present; "
            "legacy free text otherwise. Admin/Partner may also receive detail fields."
        ),
    )
    cancellation_reason_code: Optional[str] = Field(
        default=None,
        description="Structured cancel reason code (PET-5A.2).",
    )
    cancellation_reason_detail: Optional[str] = Field(
        default=None,
        description="Internal free text (Partner/Admin audit). Never for Passenger.",
    )
    cancelled_by: Optional[str] = Field(
        default=None,
        description="Quem cancelou: passenger, driver ou admin (quando aplicável).",
    )
    payment_intent_client_secret: Optional[str] = Field(
        default=None,
        description="Secret para Stripe.js (só GET /trips/:id como passageiro; requer confirm_on_accept_effective — nunca em prod/staging live).",
    )
    vehicle_category: Optional[str] = Field(
        default=None,
        description="Fare category (x=GO, …). Legacy may still show pet.",
    )
    has_pet: bool = False
    pet_size: Optional[str] = None
    pet_transport: Optional[str] = None
    is_assistance_animal: bool = False
    pet_occupies_seat: bool = False
    passenger_count: int = 1
    pet_surcharge: Optional[float] = None
    price_breakdown: Optional[PriceBreakdownSchema] = None
    vehicle_plate: Optional[str] = None
    offer_rejections: list[dict] = Field(
        default_factory=list,
        description="Rejected offers with attendable reasons (Partner/Admin audit).",
    )
