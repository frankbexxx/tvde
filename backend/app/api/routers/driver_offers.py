"""Driver offers: list, accept, reject."""

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_db, require_role
from app.models.enums import Role
from app.schemas.trip import TripOfferItem, TripStatusResponse
from app.services.trips import (
    accept_offer as accept_offer_service,
    list_offers_for_driver,
    reject_offer as reject_offer_service,
)


router = APIRouter(prefix="/driver/offers", tags=["driver"])


@router.get("", response_model=List[TripOfferItem])
async def list_offers(
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> List[TripOfferItem]:
    """List pending offers for the current driver."""
    rows = list_offers_for_driver(db=db, driver_id=user.user_id)
    return [
        TripOfferItem(
            offer_id=str(offer.id),
            trip_id=str(trip.id),
            origin_lat=float(trip.origin_lat),
            origin_lng=float(trip.origin_lng),
            destination_lat=float(trip.destination_lat),
            destination_lng=float(trip.destination_lng),
            estimated_price=float(trip.estimated_price),
            expires_at=offer.expires_at.isoformat(),
        )
        for offer, trip in rows
    ]


@router.post("/{offer_id}/accept", response_model=TripStatusResponse)
async def accept_offer(
    offer_id: str,
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> TripStatusResponse:
    """Accept an offer. First accept wins; others get 409."""
    from app.api.serializers import trip_to_status_response

    trip, _ = accept_offer_service(
        db=db,
        driver_id=user.user_id,
        offer_id=offer_id.strip(),
    )
    return trip_to_status_response(trip, include_stripe_pi=False)


@router.post("/{offer_id}/reject", status_code=200)
async def reject_offer(
    offer_id: str,
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> dict:
    """Reject an offer."""
    reject_offer_service(
        db=db,
        driver_id=user.user_id,
        offer_id=offer_id.strip(),
    )
    return {"status": "rejected"}
