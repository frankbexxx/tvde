"""Multi-offer dispatch: create offers for top N drivers when trip is requested."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.driver import Driver, DriverLocation
from app.db.models.trip import Trip
from app.db.models.trip_offer import TripOffer
from app.models.enums import DriverStatus, OfferStatus
from app.utils.geo import haversine_km

logger = logging.getLogger(__name__)


def create_offers_for_trip(
    *,
    db: Session,
    trip: Trip,
) -> list[TripOffer]:
    """
    Find drivers within GEO_RADIUS_KM, sort by distance, create offers for top N.
    Returns list of created offers.
    """
    top_n = getattr(settings, "OFFER_TOP_N", 5)
    radius_km = settings.GEO_RADIUS_KM
    timeout_min = getattr(settings, "OFFER_TIMEOUT_MINUTES", 2)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=timeout_min)

    origin_lat = float(trip.origin_lat)
    origin_lng = float(trip.origin_lng)

    drivers_with_loc = list(
        db.execute(
            select(Driver, DriverLocation)
            .join(DriverLocation, DriverLocation.driver_id == Driver.user_id)
            .where(Driver.status == DriverStatus.approved)
            .where(Driver.is_available == True)
        ).all()
    )

    candidates: list[tuple[Driver, float]] = []
    for driver, loc in drivers_with_loc:
        dist_km = haversine_km(
            origin_lat, origin_lng,
            float(loc.lat), float(loc.lng),
        )
        if dist_km <= radius_km:
            candidates.append((driver, dist_km))

    candidates.sort(key=lambda x: x[1])
    selected = candidates[:top_n]

    offers: list[TripOffer] = []
    for driver, dist_km in selected:
        offer = TripOffer(
            trip_id=trip.id,
            driver_id=driver.user_id,
            status=OfferStatus.pending,
            expires_at=expires_at,
        )
        db.add(offer)
        offers.append(offer)
        logger.info(
            "create_offers_for_trip: offer created",
            extra={
                "trip_id": str(trip.id),
                "driver_id": str(driver.user_id),
                "distance_km": round(dist_km, 2),
            },
        )

    return offers
