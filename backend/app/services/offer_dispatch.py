"""Multi-offer dispatch: create offers for top N drivers when trip is requested."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import List

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.driver import Driver, DriverLocation
from app.db.models.trip import Trip
from app.db.models.trip_offer import TripOffer
from app.models.enums import DriverStatus, OfferStatus, TripStatus
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
    timeout_sec = getattr(settings, "OFFER_TIMEOUT_SECONDS", 15)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=timeout_sec)

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

    logger.info(
        "create_offers_for_trip: drivers with location",
        extra={
            "trip_id": str(trip.id),
            "drivers_with_loc_count": len(drivers_with_loc),
            "radius_km": radius_km,
            "top_n": top_n,
        },
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

    if not selected:
        logger.warning(
            "create_offers_for_trip: no offers created (no drivers in radius or no drivers with location)",
            extra={
                "trip_id": str(trip.id),
                "drivers_with_loc": len(drivers_with_loc),
                "candidates_in_radius": len(candidates),
                "origin": f"{origin_lat},{origin_lng}",
            },
        )

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

    # Publish new_trip_offer to driver WebSocket subscribers (after flush for offer.id)
    db.flush()
    from app.realtime.driver_offers_hub import driver_offers_hub
    for offer in offers:
        driver_offers_hub.publish_new_offer(
            driver_id=str(offer.driver_id),
            offer_id=str(offer.id),
            trip_id=str(trip.id),
            origin_lat=float(trip.origin_lat),
            origin_lng=float(trip.origin_lng),
            destination_lat=float(trip.destination_lat),
            destination_lng=float(trip.destination_lng),
            estimated_price=float(trip.estimated_price),
            expires_at=expires_at,
        )

    return offers


def expire_stale_offers(db: Session, now: datetime | None = None) -> int:
    """Mark offers with expires_at < now as expired. Returns count updated."""
    now = now or datetime.now(timezone.utc)
    stale = list(
        db.execute(
            select(TripOffer).where(
                TripOffer.status == OfferStatus.pending,
                TripOffer.expires_at < now,
            )
        ).scalars().all()
    )
    for o in stale:
        o.status = OfferStatus.expired
    if stale:
        db.commit()
        logger.info("expire_stale_offers: marked %d expired", len(stale))
    return len(stale)


def redispatch_expired_trips(db: Session) -> List[TripOffer]:
    """
    For trips with status=requested where all offers are expired,
    create new offers (excluding drivers who already had offers).
    Returns list of new offers created.
    """
    now = datetime.now(timezone.utc)
    # First expire stale offers
    expire_stale_offers(db, now)

    # Find trips that are requested and have only expired/rejected offers
    all_requested = list(
        db.execute(select(Trip).where(Trip.status == TripStatus.requested)).scalars().all()
    )
    new_offers: List[TripOffer] = []
    for trip in all_requested:
        offers = list(
            db.execute(select(TripOffer).where(TripOffer.trip_id == trip.id)).scalars().all()
        )
        if not offers:
            continue
        all_expired_or_rejected = all(
            o.status in (OfferStatus.expired, OfferStatus.rejected) for o in offers
        )
        if not all_expired_or_rejected:
            continue
        # Exclude drivers who already had offers
        excluded_ids = {o.driver_id for o in offers}
        top_n = getattr(settings, "OFFER_TOP_N", 5)
        radius_km = settings.GEO_RADIUS_KM
        timeout_sec = getattr(settings, "OFFER_TIMEOUT_SECONDS", 15)
        expires_at = now + timedelta(seconds=timeout_sec)
        origin_lat, origin_lng = float(trip.origin_lat), float(trip.origin_lng)

        q = (
            select(Driver, DriverLocation)
            .join(DriverLocation, DriverLocation.driver_id == Driver.user_id)
            .where(Driver.status == DriverStatus.approved)
            .where(Driver.is_available == True)
        )
        if excluded_ids:
            q = q.where(Driver.user_id.notin_(list(excluded_ids)))
        drivers_with_loc = list(db.execute(q).all())
        candidates: List[tuple] = []
        for driver, loc in drivers_with_loc:
            dist_km = haversine_km(origin_lat, origin_lng, float(loc.lat), float(loc.lng))
            if dist_km <= radius_km:
                candidates.append((driver, dist_km))
        candidates.sort(key=lambda x: x[1])
        for driver, dist_km in candidates[:top_n]:
            offer = TripOffer(
                trip_id=trip.id,
                driver_id=driver.user_id,
                status=OfferStatus.pending,
                expires_at=expires_at,
            )
            db.add(offer)
            new_offers.append((offer, trip))
            logger.info("redispatch_expired_trips: new offer trip_id=%s driver_id=%s", trip.id, driver.user_id)
    if new_offers:
        db.flush()
        from app.realtime.driver_offers_hub import driver_offers_hub
        for offer, t in new_offers:
            driver_offers_hub.publish_new_offer(
                driver_id=str(offer.driver_id),
                offer_id=str(offer.id),
                trip_id=str(t.id),
                origin_lat=float(t.origin_lat),
                origin_lng=float(t.origin_lng),
                destination_lat=float(t.destination_lat),
                destination_lng=float(t.destination_lng),
                estimated_price=float(t.estimated_price),
                expires_at=expires_at,
            )
        db.commit()
    return [o for o, _ in new_offers]
