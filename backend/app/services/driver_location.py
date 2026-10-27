from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import logging

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver, DriverLocation
from app.services.pet_trip import driver_matches_trip_fare_and_pet
from app.services.vehicle_capacity import driver_matches_trip_capacity
from app.utils.geo import haversine_km
from app.utils.logging import log_debug_event, log_event, should_log_driver_location
from app.utils.state_machine import validate_trip_transition
from app.db.models.trip import Trip
from app.models.enums import DriverStatus, Role, TripStatus
from app.schemas.driver import DriverLocationResponse


logger = logging.getLogger(__name__)

# Legacy clients send a client clock. fix-v1 sends the GPS fix instant.
GPS_CONTRACT_HEADER = "X-Gps-Contract"
GPS_CONTRACT_FIX_V1 = "fix-v1"
# Explicit fix-v1 window. Matching freshness (LOCATION_MAX_AGE_SECONDS) is unchanged.
GPS_FIX_V1_FUTURE_SKEW_SECONDS = 60
GPS_FIX_V1_MAX_PAST_SECONDS = 3600
_LEGACY_TIMESTAMP_SKEW_SECONDS = 3600


@dataclass(frozen=True)
class _LocationWrite:
    applied: bool
    is_first_send: bool
    old_lat: float | None
    old_lng: float | None


def gps_contract_from_header(value: str | None) -> str | None:
    """Return fix-v1 only for the exact contract token. Anything else stays legacy."""
    if value is None:
        return None
    token = value.strip()
    if token == GPS_CONTRACT_FIX_V1:
        return GPS_CONTRACT_FIX_V1
    return None


def _validate_location_timestamp(
    *,
    ts: datetime,
    now: datetime,
    gps_contract: str | None,
) -> None:
    delta_seconds = (ts - now).total_seconds()
    if gps_contract == GPS_CONTRACT_FIX_V1:
        if delta_seconds > GPS_FIX_V1_FUTURE_SKEW_SECONDS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="gps_fix_timestamp_in_future",
            )
        if -delta_seconds > GPS_FIX_V1_MAX_PAST_SECONDS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="gps_fix_timestamp_too_old",
            )
        return
    if abs(delta_seconds) > _LEGACY_TIMESTAMP_SKEW_SECONDS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_timestamp",
        )


def _apply_monotonic_location(
    db: Session,
    *,
    driver_id: str,
    lat: float,
    lng: float,
    ts: datetime,
) -> _LocationWrite:
    """Insert or advance the stored position for both legacy and fix-v1 clients.

    ``INSERT … ON CONFLICT DO UPDATE WHERE timestamp < incoming`` locks the primary key
    for the statement. An equal or older timestamp matches zero rows and leaves lat/lng
    and timestamp untouched. A newer timestamp updates even when coordinates are unchanged.
    Contract-specific window checks happen before this write.
    """
    prev = db.execute(
        select(DriverLocation).where(DriverLocation.driver_id == driver_id).limit(1)
    ).scalar_one_or_none()
    old_lat = float(prev.lat) if prev is not None else None
    old_lng = float(prev.lng) if prev is not None else None
    stmt = (
        pg_insert(DriverLocation)
        .values(driver_id=driver_id, lat=lat, lng=lng, timestamp=ts)
        .on_conflict_do_update(
            index_elements=[DriverLocation.driver_id],
            set_={"lat": lat, "lng": lng, "timestamp": ts},
            where=DriverLocation.timestamp < ts,
        )
    )
    result = db.execute(stmt)
    if prev is not None:
        db.expire(prev)
    applied = (result.rowcount or 0) > 0
    return _LocationWrite(
        applied=applied,
        is_first_send=prev is None and applied,
        old_lat=old_lat,
        old_lng=old_lng,
    )


def _ensure_driver_profile(db: Session, driver_id: str) -> Driver:
    """
    Ensure a Driver profile exists for the given user_id.

    When matching fallbacks are enabled we are lenient: if a user has a driver
    token but no Driver row yet, we auto-create an approved driver profile so
    that tracking and matching work without manual admin intervention.
    """
    driver = db.execute(
        select(Driver).where(Driver.user_id == driver_id)
    ).scalar_one_or_none()
    if driver:
        return driver

    if settings.beta_matching_fallbacks_enabled():
        driver = Driver(
            user_id=driver_id,
            partner_id=DEFAULT_PARTNER_UUID,
            status=DriverStatus.approved,
            commission_percent=15,
        )
        db.add(driver)
        db.commit()
        db.refresh(driver)
        return driver

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="driver_not_found",
    )


def upsert_driver_location(
    *,
    db: Session,
    driver_id: str,
    lat: float,
    lng: float,
    timestamp_ms: int,
    gps_contract: str | None = None,
) -> None:
    """Upsert last known location for a driver.

    Validation rules:
    - Latitude:  -90 <= lat <= 90
    - Longitude: -180 <= lng <= 180
    - Legacy (no contract): timestamp within ±1 hour of server time.
    - fix-v1: timestamp is the GPS fix time. Future skew and max age are explicit.
    - Both contracts share one monotonic write. An equal or older timestamp is a
      successful no-op: no coordinate change, no freshness refresh, no side effects.
    """
    driver = _ensure_driver_profile(db, driver_id)

    if not (-90.0 <= lat <= 90.0):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_latitude",
        )
    if not (-180.0 <= lng <= 180.0):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_longitude",
        )

    ts = datetime.fromtimestamp(timestamp_ms / 1000.0, tz=timezone.utc)
    now = datetime.now(timezone.utc)
    contract = gps_contract if gps_contract == GPS_CONTRACT_FIX_V1 else None
    _validate_location_timestamp(ts=ts, now=now, gps_contract=contract)

    write = _apply_monotonic_location(
        db, driver_id=driver_id, lat=lat, lng=lng, ts=ts
    )
    if not write.applied:
        db.commit()
        return
    is_first_send = write.is_first_send
    old_lat = write.old_lat
    old_lng = write.old_lng

    # Broadcast to trip subscribers when driver has an active trip
    active_trip = db.execute(
        select(Trip)
        .where(Trip.driver_id == driver_id)
        .where(
            Trip.status.in_(
                [TripStatus.accepted, TripStatus.arriving, TripStatus.ongoing]
            )
        )
        .limit(1)
    ).scalar_one_or_none()
    has_active_trip = active_trip is not None

    # A008: Only log when first send, significant change (>50m), or has active trip
    if should_log_driver_location(
        is_first_send=is_first_send,
        has_active_trip=has_active_trip,
        old_lat=old_lat,
        old_lng=old_lng,
        new_lat=lat,
        new_lng=lng,
    ):
        log_event("driver_location_update", driver_id=driver_id, lat=lat, lng=lng)
        if is_first_send:
            log_event(
                "driver_location_first_send", driver_id=driver_id, lat=lat, lng=lng
            )

    if active_trip:
        log_debug_event(
            "driver_location_updated",
            trip_id=str(active_trip.id),
            driver_id=driver_id,
            lat=lat,
            lng=lng,
        )
        from app.realtime.hub import hub

        hub.publish_driver_location(
            trip_id=str(active_trip.id),
            lat=lat,
            lng=lng,
            timestamp=ts,
        )

    from app.db.models.trip_offer import TripOffer
    from app.services.offer_dispatch import (
        create_offers_for_trip,
        has_eligible_driver_for_assigned_pool,
        publish_trip_offers,
    )

    location_redispatch_offers: list = []
    location_redispatch_trip = None

    # Re-dispatch when this driver's fresh location can recover a trip that
    # originally produced 0 offers. Skipping trips this driver cannot serve
    # prevents one old impossible trip from starving later serviceable trips.
    if driver.status == DriverStatus.approved and getattr(driver, "is_available", True):
        q = (
            select(Trip)
            .where(Trip.status == TripStatus.requested)
            .where(
                ~select(TripOffer.id)
                .where(TripOffer.trip_id == Trip.id)
                .exists()
            )
            .order_by(Trip.created_at.asc())
        )
        trip_for_dispatch = None
        for candidate_trip in db.execute(q).scalars():
            if not driver_matches_trip_fare_and_pet(driver, candidate_trip):
                continue
            if not driver_matches_trip_capacity(db, driver, candidate_trip):
                continue
            dist_km = haversine_km(
                lat,
                lng,
                float(candidate_trip.origin_lat),
                float(candidate_trip.origin_lng),
            )
            if dist_km <= settings.GEO_RADIUS_KM:
                trip_for_dispatch = candidate_trip
                break
        if trip_for_dispatch is not None:
            db.flush()
            offers = create_offers_for_trip(db=db, trip=trip_for_dispatch)
            if offers:
                location_redispatch_offers = offers
                location_redispatch_trip = trip_for_dispatch
                log_event(
                    "location_redispatch_offers_created",
                    trip_id=str(trip_for_dispatch.id),
                    driver_id=driver_id,
                    offer_count=len(offers),
                )
            else:
                log_event(
                    "location_redispatch_no_offers",
                    trip_id=str(trip_for_dispatch.id),
                    driver_id=driver_id,
                )

    # Fallback auto-dispatch when matching fallbacks ON: multi-offer created 0 offers
    # (no drivers had locations). Promote oldest orphan requested trip that has ≥1
    # currently eligible driver (fare, capacity, vehicle ops/compliance) to the
    # legacy assigned pool — never invent offers or set driver_id.
    # Trips that already have any TripOffer history (pending/rejected/expired/…)
    # stay requested — cron redispatch handles them (BUG-REJECT-BETA-1).
    # Ineligible orphans are skipped (remain requested) so they do not block a
    # later eligible trip in the same location ping.
    matching_fallbacks = settings.beta_matching_fallbacks_enabled()
    if matching_fallbacks and getattr(driver, "is_available", True):
        q = (
            select(Trip)
            .where(Trip.status == TripStatus.requested)
            .where(Trip.driver_id.is_(None))
            .where(
                ~select(TripOffer.id)
                .where(TripOffer.trip_id == Trip.id)
                .exists()
            )
            .order_by(Trip.created_at.asc())
            .with_for_update(of=Trip)
        )
        promoted = False
        for trip in db.execute(q).scalars():
            # Re-check under the row lock: a concurrent accept_offer may have
            # already bound this trip (payment + accepted) while we waited.
            if trip.status != TripStatus.requested or trip.driver_id is not None:
                logger.info(
                    "upsert_driver_location: skip auto-dispatch; trip no longer free",
                    extra={
                        "trip_id": str(trip.id),
                        "status": trip.status.value if trip.status else None,
                        "driver_id": str(trip.driver_id) if trip.driver_id else None,
                    },
                )
                continue
            if not has_eligible_driver_for_assigned_pool(db, trip):
                log_event(
                    "trip_auto_dispatch_skipped_no_eligible",
                    trip_id=str(trip.id),
                    driver_id=driver_id,
                )
                logger.info(
                    "upsert_driver_location: skip auto-dispatch; no eligible driver",
                    extra={
                        "trip_id": str(trip.id),
                        "driver_id": str(driver_id),
                        "matching_fallbacks": matching_fallbacks,
                    },
                )
                continue
            previous_status = trip.status
            validate_trip_transition(
                previous_status, TripStatus.assigned, trip_id=str(trip.id)
            )
            trip.status = TripStatus.assigned
            log_event(
                "trip_auto_dispatched",
                trip_id=trip.id,
                driver_id=driver_id,
            )
            logger.info(
                "upsert_driver_location: auto-dispatch trip",
                extra={
                    "trip_id": str(trip.id),
                    "previous_status": previous_status.value,
                    "new_status": trip.status.value,
                    "driver_id": str(driver_id),
                    "matching_fallbacks": matching_fallbacks,
                },
            )
            promoted = True
            break
        if not promoted:
            logger.info(
                "upsert_driver_location: no requested trips to assign",
                extra={
                    "driver_id": str(driver_id),
                    "matching_fallbacks": matching_fallbacks,
                },
            )

    db.commit()
    if location_redispatch_offers and location_redispatch_trip is not None:
        publish_trip_offers(
            offers=location_redispatch_offers, trip=location_redispatch_trip
        )


def driver_location_embed_for_trip_detail(
    db: Session,
    trip: Trip,
) -> DriverLocationResponse | None:
    """Última posição para anexar ao GET /trips/{{id}}; None se o estado não expõe rasto."""
    if not trip.driver_id:
        return None
    if trip.status not in {
        TripStatus.accepted,
        TripStatus.arriving,
        TripStatus.ongoing,
    }:
        return None
    loc = db.execute(
        select(DriverLocation).where(DriverLocation.driver_id == trip.driver_id)
    ).scalar_one_or_none()
    if not loc:
        return None
    ts = loc.timestamp
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return DriverLocationResponse(
        lat=float(loc.lat),
        lng=float(loc.lng),
        timestamp=int(ts.timestamp() * 1000),
    )


def get_driver_location_for_trip(
    *,
    db: Session,
    user_id: str,
    role: Role,
    trip_id: str,
) -> tuple[float, float, datetime]:
    """
    Return the last known driver location for a given trip.

    - If role=passenger: validates that the passenger owns the trip.
    - If role=driver: validates that the driver is assigned to the trip.
    - Only returns location if the trip has an assigned driver and is active.
    """
    trip = db.execute(select(Trip).where(Trip.id == trip_id)).scalar_one_or_none()
    if not trip:
        logger.info(
            "get_driver_location_for_trip: trip not found",
            extra={
                "trip_id": str(trip_id),
                "user_id": str(user_id),
                "role": role.value,
            },
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="trip_not_found",
        )

    # Matching fallbacks ON: relax strict ownership for multi-device testing.
    # When OFF: keep strict passenger/driver ownership rules.
    matching_fallbacks = settings.beta_matching_fallbacks_enabled()
    is_passenger_owner = str(trip.passenger_id) == str(user_id)
    is_assigned_driver = (
        role == Role.driver
        and trip.driver_id is not None
        and str(trip.driver_id) == str(user_id)
    )
    if not matching_fallbacks:
        if not is_passenger_owner and not is_assigned_driver:
            logger.info(
                "get_driver_location_for_trip: forbidden access",
                extra={
                    "trip_id": str(trip_id),
                    "user_id": str(user_id),
                    "role": role.value,
                    "trip_passenger_id": str(trip.passenger_id),
                    "trip_driver_id": (
                        str(trip.driver_id) if trip.driver_id else None
                    ),
                },
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="forbidden_trip_access",
            )
    else:
        # Fallbacks: still block clearly unrelated passengers, but allow either the
        # real passenger or the assigned driver, regardless of token role.
        if str(trip.passenger_id) != str(user_id) and (
            not trip.driver_id or str(trip.driver_id) != str(user_id)
        ):
            logger.info(
                "get_driver_location_for_trip: forbidden matching-fallback access",
                extra={
                    "trip_id": str(trip_id),
                    "user_id": str(user_id),
                    "role": role.value,
                    "trip_passenger_id": str(trip.passenger_id),
                    "trip_driver_id": str(trip.driver_id) if trip.driver_id else None,
                    "matching_fallbacks": matching_fallbacks,
                },
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="forbidden_trip_access",
            )

    if not trip.driver_id:
        logger.info(
            "get_driver_location_for_trip: driver not assigned",
            extra={
                "trip_id": str(trip_id),
                "user_id": str(user_id),
                "role": role.value,
                "trip_passenger_id": str(trip.passenger_id),
                "trip_status": trip.status.value,
            },
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="driver_not_assigned",
        )

    if trip.status not in {
        TripStatus.accepted,
        TripStatus.arriving,
        TripStatus.ongoing,
    }:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"trip_not_active_for_location_{trip.status.value}",
        )

    loc = db.execute(
        select(DriverLocation).where(DriverLocation.driver_id == trip.driver_id)
    ).scalar_one_or_none()
    if not loc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="driver_location_not_found",
        )

    log_event("driver_location_requested", trip_id=trip_id, user_id=user_id)
    return float(loc.lat), float(loc.lng), loc.timestamp
