from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_db, require_role
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
from app.services.trips import (
    cancel_trip_by_passenger,
    create_trip as create_trip_service,
    get_trip_for_passenger,
    list_completed_trips_for_passenger,
)


router = APIRouter(prefix="/trips", tags=["passenger"])


@router.get("/history", response_model=List[TripHistoryItem])
async def trip_history(
    user: UserContext = Depends(require_role(Role.passenger)),
    db: Session = Depends(get_db),
) -> List[TripHistoryItem]:
    """Completed trips for passenger. Read-only."""
    trips = list_completed_trips_for_passenger(db=db, passenger_id=user.user_id)
    return [trip_to_history_item(t, include_stripe_pi=False) for t in trips]


@router.get("/{trip_id}", response_model=TripDetailResponse)
async def get_trip_detail(
    trip_id: str,
    user: UserContext = Depends(require_role(Role.passenger)),
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
    user: UserContext = Depends(require_role(Role.passenger)),
    db: Session = Depends(get_db),
) -> TripCreateResponse:
    trip, eta = create_trip_service(
        db=db,
        passenger_id=user.user_id,
        payload=payload,
    )
    payment = trip.payment
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
    user: UserContext = Depends(require_role(Role.passenger)),
    db: Session = Depends(get_db),
) -> TripStatusResponse:
    _ = payload
    trip = cancel_trip_by_passenger(
        db=db,
        passenger_id=user.user_id,
        trip_id=trip_id.strip(),
    )
    payment = trip.payment
    return TripStatusResponse(
        trip_id=str(trip.id),
        status=trip.status,
        payment_status=payment.status if payment else None,
        final_price=float(trip.final_price) if trip.final_price is not None else None,
        commission_amount=float(payment.commission_amount) if payment else None,
        driver_payout=float(payment.driver_payout) if payment and payment.driver_payout else None,
        stripe_payment_intent_id=None,
    )

