"""MATCHING-001: category filter at dispatch + BETA fallback with expired offers."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver, DriverLocation
from app.db.models.payment import Payment
from app.db.models.trip import Trip
from app.db.models.trip_offer import TripOffer
from app.db.models.user import User
from app.models.enums import DriverStatus, OfferStatus, Role, TripStatus, UserStatus
from app.services.driver_location import upsert_driver_location
from app.services.offer_dispatch import create_offers_for_trip, redispatch_expired_trips
from app.services.trips import accept_offer, accept_trip


def _create_driver(
    db: Session,
    *,
    lat: float,
    lng: float,
    vehicle_categories: str = "x",
) -> str:
    user = User(
        role=Role.driver,
        name=f"Driver {uuid.uuid4()}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(user)
    db.flush()
    driver = Driver(
        partner_id=DEFAULT_PARTNER_UUID,
        user_id=user.id,
        status=DriverStatus.approved,
        commission_percent=15.0,
        is_available=True,
        vehicle_categories=vehicle_categories,
    )
    db.add(driver)
    db.flush()
    db.add(
        DriverLocation(
            driver_id=user.id,
            lat=lat,
            lng=lng,
            timestamp=datetime.now(timezone.utc),
        )
    )
    db.commit()
    return str(user.id)


def _create_requested_trip(db: Session, *, vehicle_category: str = "x") -> Trip:
    passenger = User(
        role=Role.passenger,
        name="P",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(passenger)
    db.flush()
    trip = Trip(
        passenger_id=passenger.id,
        status=TripStatus.requested,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=5.0,
        vehicle_category=vehicle_category,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


def test_dispatch_skips_driver_wrong_vehicle_category(db: Session) -> None:
    for loc in db.execute(select(DriverLocation)).scalars().all():
        db.delete(loc)
    db.commit()
    _create_driver(db, lat=38.701, lng=-9.101, vehicle_categories="comfort")
    trip = _create_requested_trip(db, vehicle_category="x")

    offers = create_offers_for_trip(db=db, trip=trip)
    db.commit()

    assert offers == []
    rows = db.execute(select(TripOffer).where(TripOffer.trip_id == trip.id)).scalars().all()
    assert rows == []


def test_dispatch_creates_offer_matching_category(db: Session) -> None:
    for loc in db.execute(select(DriverLocation)).scalars().all():
        db.delete(loc)
    db.commit()
    driver_id = _create_driver(db, lat=38.701, lng=-9.101, vehicle_categories="x")
    trip = _create_requested_trip(db, vehicle_category="x")

    offers = create_offers_for_trip(db=db, trip=trip)
    db.commit()

    assert len(offers) == 1
    assert str(offers[0].driver_id) == driver_id


def test_redispatch_skips_driver_wrong_vehicle_category(db: Session) -> None:
    for loc in db.execute(select(DriverLocation)).scalars().all():
        db.delete(loc)
    db.commit()
    matching_driver_id = _create_driver(
        db, lat=38.701, lng=-9.101, vehicle_categories="comfort"
    )
    wrong_driver_id = _create_driver(db, lat=38.702, lng=-9.102, vehicle_categories="x")
    trip = _create_requested_trip(db, vehicle_category="comfort")

    offers = create_offers_for_trip(db=db, trip=trip)
    assert len(offers) == 1
    assert str(offers[0].driver_id) == matching_driver_id
    offers[0].expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    db.commit()

    new_offers = redispatch_expired_trips(db)

    new_offers_for_trip = [
        offer for offer in new_offers if str(offer.trip_id) == str(trip.id)
    ]
    assert new_offers_for_trip == []
    wrong_driver_offers = (
        db.execute(
            select(TripOffer).where(
                TripOffer.trip_id == trip.id,
                TripOffer.driver_id == uuid.UUID(wrong_driver_id),
            )
        )
        .scalars()
        .all()
    )
    assert wrong_driver_offers == []


def test_accept_offer_rejects_wrong_vehicle_category(db: Session) -> None:
    wrong_driver_id = _create_driver(db, lat=38.702, lng=-9.102, vehicle_categories="x")
    trip = _create_requested_trip(db, vehicle_category="comfort")
    offer = TripOffer(
        trip_id=trip.id,
        driver_id=uuid.UUID(wrong_driver_id),
        status=OfferStatus.pending,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=1),
    )
    db.add(offer)
    db.commit()
    db.refresh(offer)

    with pytest.raises(HTTPException) as exc_info:
        accept_offer(db=db, driver_id=wrong_driver_id, offer_id=str(offer.id))

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "forbidden_vehicle_category"


def test_accept_trip_rejects_wrong_vehicle_category(db: Session) -> None:
    wrong_driver_id = _create_driver(db, lat=38.702, lng=-9.102, vehicle_categories="x")
    trip = _create_requested_trip(db, vehicle_category="comfort")
    trip.status = TripStatus.assigned
    db.commit()

    with pytest.raises(HTTPException) as exc_info:
        accept_trip(db=db, driver_id=wrong_driver_id, trip_id=str(trip.id))

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "forbidden_vehicle_category"

    db.refresh(trip)
    driver = db.execute(
        select(Driver).where(Driver.user_id == uuid.UUID(wrong_driver_id))
    ).scalar_one()
    payment = db.execute(
        select(Payment).where(Payment.trip_id == trip.id)
    ).scalar_one_or_none()

    assert trip.status == TripStatus.assigned
    assert trip.driver_id is None
    assert driver.is_available is True
    assert payment is None


def test_beta_fallback_runs_when_only_expired_offers(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", True, raising=False)
    for loc in db.execute(select(DriverLocation)).scalars().all():
        db.delete(loc)
    db.commit()
    driver_id = _create_driver(db, lat=38.701, lng=-9.101)
    trip = _create_requested_trip(db)
    trip.created_at = datetime.now(timezone.utc) - timedelta(hours=2)
    db.commit()
    other_driver = _create_driver(db, lat=38.702, lng=-9.102)

    expired = TripOffer(
        trip_id=trip.id,
        driver_id=uuid.UUID(other_driver),
        status=OfferStatus.expired,
        expires_at=datetime.now(timezone.utc) - timedelta(minutes=5),
    )
    db.add(expired)
    db.commit()

    ts_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    upsert_driver_location(
        db=db,
        driver_id=driver_id,
        lat=38.701,
        lng=-9.101,
        timestamp_ms=ts_ms,
    )
    db.refresh(trip)

    assert trip.status == TripStatus.assigned


def test_location_redispatch_skips_older_unserviceable_zero_offer_trip(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", False, raising=False)
    for loc in db.execute(select(DriverLocation)).scalars().all():
        db.delete(loc)
    for offer in db.execute(select(TripOffer)).scalars().all():
        db.delete(offer)
    for trip in (
        db.execute(select(Trip).where(Trip.status == TripStatus.requested))
        .scalars()
        .all()
    ):
        trip.status = TripStatus.cancelled
    db.commit()

    driver_id = _create_driver(db, lat=38.701, lng=-9.101, vehicle_categories="x")
    older_blocker = _create_requested_trip(db, vehicle_category="comfort")
    target = _create_requested_trip(db, vehicle_category="x")
    older_blocker.created_at = datetime.now(timezone.utc) - timedelta(minutes=2)
    target.created_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    db.commit()

    ts_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    upsert_driver_location(
        db=db,
        driver_id=driver_id,
        lat=38.701,
        lng=-9.101,
        timestamp_ms=ts_ms,
    )

    blocker_offers = (
        db.execute(select(TripOffer).where(TripOffer.trip_id == older_blocker.id))
        .scalars()
        .all()
    )
    target_offers = (
        db.execute(select(TripOffer).where(TripOffer.trip_id == target.id))
        .scalars()
        .all()
    )

    assert blocker_offers == []
    assert len(target_offers) == 1
    assert str(target_offers[0].driver_id) == driver_id
