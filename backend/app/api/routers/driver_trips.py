import time
from typing import List

from fastapi import APIRouter, Body, Depends
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_db, require_role
from app.db.models.trip import Trip
from app.db.models.trip_offer import TripOffer
from app.models.enums import OfferStatus
from app.models.enums import Role
from app.schemas.trip import (
    TripAvailableItem,
    TripCancelRequest,
    TripCompletionRequest,
    TripDetailResponse,
    TripHistoryItem,
    TripRateRequest,
    TripStatusResponse,
)
from app.api.serializers import (
    trip_to_detail,
    trip_to_history_item,
    trip_to_status_response,
)
from app.services.interaction_logging import log_interaction
from app.services.trips import (
    accept_offer as accept_offer_service,
    accept_trip as accept_trip_service,
    cancel_trip_by_driver,
    complete_trip as complete_trip_service,
    list_available_trips as list_available_trips_service,
    get_trip_for_driver,
    list_completed_trips_for_driver,
    mark_trip_arriving as mark_trip_arriving_service,
    rate_trip_as_driver,
    start_trip as start_trip_service,
)


router = APIRouter(prefix="/driver/trips", tags=["driver"])


@router.get("/history", response_model=List[TripHistoryItem])
async def trip_history(
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> List[TripHistoryItem]:
    """Completed trips for driver. Read-only."""
    trips = list_completed_trips_for_driver(db=db, driver_id=user.user_id)
    return [trip_to_history_item(t, include_stripe_pi=False) for t in trips]


@router.get("/available", response_model=List[TripAvailableItem])
async def list_available_trips(
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> List[TripAvailableItem]:
    items = list_available_trips_service(
        db=db,
        driver_id=user.user_id,
    )
    return [
        TripAvailableItem(
            trip_id=str(trip.id),
            origin_lat=float(trip.origin_lat),
            origin_lng=float(trip.origin_lng),
            destination_lat=float(trip.destination_lat),
            destination_lng=float(trip.destination_lng),
            estimated_price=float(trip.estimated_price),
            vehicle_category=(trip.vehicle_category or "x"),
            vehicle_categories=[(trip.vehicle_category or "x")],
            offer_id=str(offer.id) if offer else None,
        )
        for trip, offer in items
    ]


@router.get("/{trip_id}", response_model=TripDetailResponse)
async def get_trip_detail(
    trip_id: str,
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> TripDetailResponse:
    """Full trip detail for driver (must be assigned). Read-only."""
    trip = get_trip_for_driver(
        db=db,
        driver_id=user.user_id,
        trip_id=trip_id.strip(),
    )
    return trip_to_detail(trip, include_stripe_pi=False)


@router.post("/{trip_id}/accept", response_model=TripStatusResponse)
async def accept_trip(
    trip_id: str,
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> TripStatusResponse:
    tid = trip_id.strip()
    prev = db.execute(select(Trip).where(Trip.id == tid)).scalar_one_or_none()
    previous_state = prev.status.value if prev else None
    t0 = time.perf_counter()
    # If driver has pending offer for this trip, use accept_offer (multi-offer flow)
    offer = db.execute(
        select(TripOffer).where(
            and_(
                TripOffer.trip_id == tid,
                TripOffer.driver_id == user.user_id,
                TripOffer.status == OfferStatus.pending,
            )
        )
    ).scalar_one_or_none()
    if offer:
        trip, client_secret = accept_offer_service(
            db=db,
            driver_id=user.user_id,
            offer_id=str(offer.id),
        )
    else:
        trip, client_secret = accept_trip_service(
            db=db,
            driver_id=user.user_id,
            trip_id=tid,
        )
    latency_ms = int((time.perf_counter() - t0) * 1000)
    payment = trip.payment
    log_interaction(
        db=db,
        user_id=user.user_id,
        role="driver",
        action="accept_trip",
        trip_id=str(trip.id),
        previous_state=previous_state,
        new_state=trip.status.value,
        latency_ms=latency_ms,
        payment_status=payment.status.value if payment else None,
    )
    return trip_to_status_response(
        trip,
        include_stripe_pi=False,
        payment_intent_client_secret=client_secret,
    )


@router.post("/{trip_id}/arriving", response_model=TripStatusResponse)
async def mark_arriving(
    trip_id: str,
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> TripStatusResponse:
    tid = trip_id.strip()
    prev = db.execute(select(Trip).where(Trip.id == tid)).scalar_one_or_none()
    previous_state = prev.status.value if prev else None
    t0 = time.perf_counter()
    trip = mark_trip_arriving_service(
        db=db,
        driver_id=user.user_id,
        trip_id=tid,
    )
    latency_ms = int((time.perf_counter() - t0) * 1000)
    payment = trip.payment
    log_interaction(
        db=db,
        user_id=user.user_id,
        role="driver",
        action="arriving",
        trip_id=str(trip.id),
        previous_state=previous_state,
        new_state=trip.status.value,
        latency_ms=latency_ms,
        payment_status=payment.status.value if payment else None,
    )
    return trip_to_status_response(trip, include_stripe_pi=False)


@router.post("/{trip_id}/start", response_model=TripStatusResponse)
async def start_trip(
    trip_id: str,
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> TripStatusResponse:
    tid = trip_id.strip()
    prev = db.execute(select(Trip).where(Trip.id == tid)).scalar_one_or_none()
    previous_state = prev.status.value if prev else None
    t0 = time.perf_counter()
    trip = start_trip_service(
        db=db,
        driver_id=user.user_id,
        trip_id=tid,
    )
    latency_ms = int((time.perf_counter() - t0) * 1000)
    payment = trip.payment
    log_interaction(
        db=db,
        user_id=user.user_id,
        role="driver",
        action="start_trip",
        trip_id=str(trip.id),
        previous_state=previous_state,
        new_state=trip.status.value,
        latency_ms=latency_ms,
        payment_status=payment.status.value if payment else None,
    )
    return trip_to_status_response(trip, include_stripe_pi=False)


@router.post("/{trip_id}/complete", response_model=TripStatusResponse)
async def complete_trip(
    trip_id: str,
    payload: TripCompletionRequest,
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> TripStatusResponse:
    _ = payload  # final_price sera tratado na fase de pagamentos
    tid = trip_id.strip()
    prev = db.execute(select(Trip).where(Trip.id == tid)).scalar_one_or_none()
    previous_state = prev.status.value if prev else None
    t0 = time.perf_counter()
    trip = complete_trip_service(
        db=db,
        driver_id=user.user_id,
        trip_id=tid,
    )
    latency_ms = int((time.perf_counter() - t0) * 1000)
    payment = trip.payment
    log_interaction(
        db=db,
        user_id=user.user_id,
        role="driver",
        action="complete_trip",
        trip_id=str(trip.id),
        previous_state=previous_state,
        new_state=trip.status.value,
        latency_ms=latency_ms,
        payment_status=payment.status.value if payment else None,
    )
    return trip_to_status_response(trip, include_stripe_pi=False)


@router.post("/{trip_id}/rate", response_model=TripStatusResponse)
async def rate_trip(
    trip_id: str,
    payload: TripRateRequest,
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> TripStatusResponse:
    """Driver rates passenger after trip completion."""
    trip = rate_trip_as_driver(
        db=db,
        driver_id=user.user_id,
        trip_id=trip_id.strip(),
        rating=payload.rating,
    )
    return trip_to_status_response(trip, include_stripe_pi=False)


@router.post("/{trip_id}/cancel", response_model=TripStatusResponse)
async def cancel_trip(
    trip_id: str,
    payload: TripCancelRequest | None = Body(None),
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> TripStatusResponse:
    tid = trip_id.strip()
    reason = (payload.reason if payload else None) or None
    prev = db.execute(select(Trip).where(Trip.id == tid)).scalar_one_or_none()
    previous_state = prev.status.value if prev else None
    t0 = time.perf_counter()
    trip = cancel_trip_by_driver(
        db=db,
        driver_id=user.user_id,
        trip_id=tid,
        reason=reason,
    )
    latency_ms = int((time.perf_counter() - t0) * 1000)
    payment = trip.payment
    log_interaction(
        db=db,
        user_id=user.user_id,
        role="driver",
        action="cancel_trip",
        trip_id=str(trip.id),
        previous_state=previous_state,
        new_state=trip.status.value,
        latency_ms=latency_ms,
        payment_status=payment.status.value if payment else None,
    )
    return trip_to_status_response(trip, include_stripe_pi=False)
