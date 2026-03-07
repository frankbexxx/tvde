import time
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_db, require_role
from app.api.rate_limit import check_request_trip_rate_limit
from app.db.models.trip import Trip
from app.models.enums import Role
from app.schemas.trip import (
    TripCancelRequest,
    TripCreateRequest,
    TripCreateResponse,
    TripDetailResponse,
    TripHistoryItem,
    TripStatusResponse,
)
from app.api.serializers import trip_to_detail, trip_to_history_item
from app.services.interaction_logging import log_interaction
from app.services.trips import (
    cancel_trip_by_passenger,
    create_trip as create_trip_service,
    get_trip_for_passenger,
    list_completed_trips_for_passenger,
)


router = APIRouter(prefix="/trips", tags=["passenger"])


@router.get("/history", response_model=List[TripHistoryItem])
async def trip_history(
    user: UserContext = Depends(require_role(Role.passenger, Role.driver)),
    db: Session = Depends(get_db),
) -> List[TripHistoryItem]:
    """Completed trips for passenger. Read-only."""
    trips = list_completed_trips_for_passenger(db=db, passenger_id=user.user_id)
    return [trip_to_history_item(t, include_stripe_pi=False) for t in trips]


@router.get("/{trip_id}", response_model=TripDetailResponse)
async def get_trip_detail(
    trip_id: str,
    user: UserContext = Depends(require_role(Role.passenger, Role.driver)),
    db: Session = Depends(get_db),
) -> TripDetailResponse:
    """Full trip detail for passenger (must own). Read-only."""
    trip = get_trip_for_passenger(
        db=db,
        passenger_id=user.user_id,
        trip_id=trip_id.strip(),
    )
    return trip_to_detail(trip, include_stripe_pi=False)


@router.post("", response_model=TripCreateResponse)
async def create_trip(
    payload: TripCreateRequest,
    user: UserContext = Depends(require_role(Role.passenger, Role.driver)),
    db: Session = Depends(get_db),
    _rate_limit: None = Depends(check_request_trip_rate_limit),
) -> TripCreateResponse:
    t0 = time.perf_counter()
    trip, eta = create_trip_service(
        db=db,
        passenger_id=user.user_id,
        payload=payload,
    )
    latency_ms = int((time.perf_counter() - t0) * 1000)
    payment = trip.payment
    log_interaction(
        db=db,
        user_id=user.user_id,
        role="passenger",
        action="request_trip",
        trip_id=str(trip.id),
        previous_state=None,
        new_state=trip.status.value,
        latency_ms=latency_ms,
        payment_status=payment.status.value if payment else None,
    )
    return TripCreateResponse(
        trip_id=str(trip.id),
        status=trip.status,
        estimated_price=float(trip.estimated_price),
        eta=eta,
        payment_status=payment.status if payment else None,
        final_price=float(trip.final_price) if trip.final_price is not None else None,
        commission_amount=float(payment.commission_amount) if payment else None,
        driver_payout=float(payment.driver_payout) if payment and payment.driver_payout else None,
        stripe_payment_intent_id=None,
    )


@router.post("/{trip_id}/cancel", response_model=TripStatusResponse)
async def cancel_trip(
    trip_id: str,
    payload: TripCancelRequest,
    user: UserContext = Depends(require_role(Role.passenger, Role.driver)),
    db: Session = Depends(get_db),
) -> TripStatusResponse:
    _ = payload
    tid = trip_id.strip()
    prev = db.execute(select(Trip).where(Trip.id == tid)).scalar_one_or_none()
    t0 = time.perf_counter()
    trip = cancel_trip_by_passenger(
        db=db,
        passenger_id=user.user_id,
        trip_id=tid,
    )
    latency_ms = int((time.perf_counter() - t0) * 1000)
    payment = trip.payment
    log_interaction(
        db=db,
        user_id=user.user_id,
        role="passenger",
        action="cancel_trip",
        trip_id=str(trip.id),
        previous_state=prev.status.value if prev else None,
        new_state=trip.status.value,
        latency_ms=latency_ms,
        payment_status=payment.status.value if payment else None,
    )
    return TripStatusResponse(
        trip_id=str(trip.id),
        status=trip.status,
        payment_status=payment.status if payment else None,
        final_price=float(trip.final_price) if trip.final_price is not None else None,
        commission_amount=float(payment.commission_amount) if payment else None,
        driver_payout=float(payment.driver_payout) if payment and payment.driver_payout else None,
        stripe_payment_intent_id=None,
    )

