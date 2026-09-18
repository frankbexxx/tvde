"""Legacy assigned-pool fallback must respect matching eligibility.

When multi-offer yields 0 offers, BETA matching fallbacks may promote
``requested → assigned`` only if ≥1 approved/available driver can serve the
trip (fare/category, capacity, vehicle ops/compliance). Never sets driver_id.
"""

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
from app.db.models.trip import Trip
from app.db.models.trip_offer import TripOffer
from app.db.models.user import User
from app.db.models.vehicle import Vehicle
from app.db.models.vehicle_document import VehicleDocument
from app.models.enums import DriverStatus, Role, TripStatus, UserStatus
from app.services.driver_location import upsert_driver_location
from app.services.offer_dispatch import (
    create_offers_for_trip,
    has_eligible_driver_for_assigned_pool,
)
from app.services.partner_vehicle_documents import VEHICLE_DOCUMENT_REQUIRED_TYPES_ORDERED
from app.services.trips import accept_trip
from app.services.vehicle_capacity import CODE_VEHICLE_CAPACITY_INSUFFICIENT
from tests.support.unique_phone import unique_test_phone


def _clear_locations(db: Session) -> None:
    for loc in db.execute(select(DriverLocation)).scalars().all():
        db.delete(loc)
    db.commit()


def _isolate_drivers(db: Session) -> None:
    """Shared test DB: hide leftover drivers so pool eligibility is deterministic."""
    for drv in db.execute(select(Driver)).scalars().all():
        drv.is_available = False
    for orphan in (
        db.execute(select(Trip).where(Trip.status == TripStatus.requested)).scalars().all()
    ):
        orphan.status = TripStatus.cancelled
    db.commit()


def _passenger(db: Session) -> User:
    user = User(
        role=Role.passenger,
        name=f"Pax {uuid.uuid4()}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add(user)
    db.flush()
    return user


def _vehicle(
    db: Session,
    *,
    max_passengers: int | None,
    status: str = "active",
) -> Vehicle:
    suffix = uuid.uuid4().hex[:8].upper()
    vehicle = Vehicle(
        partner_id=DEFAULT_PARTNER_UUID,
        plate=f"FB-{suffix}",
        plate_normalized=f"FB{suffix}",
        make="Test",
        model="Pool",
        status=status,
        max_passengers=max_passengers,
    )
    db.add(vehicle)
    db.flush()
    now = datetime.now(timezone.utc)
    for doc_type in VEHICLE_DOCUMENT_REQUIRED_TYPES_ORDERED:
        db.add(
            VehicleDocument(
                vehicle_id=vehicle.id,
                partner_id=DEFAULT_PARTNER_UUID,
                document_type=doc_type,
                status="approved",
                expires_at=now + timedelta(days=365),
            )
        )
    db.flush()
    return vehicle


def _driver(
    db: Session,
    *,
    categories: str = "x,xl,comfort",
    vehicle: Vehicle | None = None,
    lat: float = 41.15,
    lng: float = -8.61,
    with_location: bool = True,
) -> str:
    user = User(
        role=Role.driver,
        name=f"Drv {uuid.uuid4()}",
        phone=unique_test_phone(),
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
        vehicle_categories=categories,
        active_vehicle_id=vehicle.id if vehicle is not None else None,
    )
    db.add(driver)
    db.flush()
    if with_location:
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


def _requested_trip(
    db: Session,
    *,
    vehicle_category: str = "x",
    passenger_count: int = 1,
    has_pet: bool = False,
    pet_occupies_seat: bool = False,
) -> Trip:
    pax = _passenger(db)
    trip = Trip(
        passenger_id=pax.id,
        status=TripStatus.requested,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=5.0,
        vehicle_category=vehicle_category,
        passenger_count=passenger_count,
        has_pet=has_pet,
        pet_occupies_seat=pet_occupies_seat,
    )
    trip.created_at = datetime.now(timezone.utc) - timedelta(hours=2)
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


def _ping(db: Session, driver_id: str, *, lat: float = 41.15, lng: float = -8.61) -> None:
    ts_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    upsert_driver_location(
        db=db,
        driver_id=driver_id,
        lat=lat,
        lng=lng,
        timestamp_ms=ts_ms,
    )


@pytest.fixture
def matching_fallbacks_on(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", False, raising=False)
    monkeypatch.setattr(settings, "ENABLE_BETA_MATCHING_FALLBACKS", True, raising=False)


@pytest.fixture
def capacity_gates_on(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_CAPACITY_GATES", True, raising=False)


def test_eligible_driver_fallback_still_assigns(
    db: Session, matching_fallbacks_on: None, capacity_gates_on: None
) -> None:
    _clear_locations(db)
    _isolate_drivers(db)
    veh = _vehicle(db, max_passengers=4)
    driver_id = _driver(db, categories="x", vehicle=veh)
    trip = _requested_trip(db, vehicle_category="x", passenger_count=2)

    assert has_eligible_driver_for_assigned_pool(db, trip) is True
    _ping(db, driver_id)
    db.refresh(trip)

    assert trip.status == TripStatus.assigned
    assert trip.driver_id is None
    offers = db.execute(select(TripOffer).where(TripOffer.trip_id == trip.id)).scalars().all()
    assert offers == []


def test_capacity_insufficient_keeps_requested(
    db: Session, matching_fallbacks_on: None, capacity_gates_on: None
) -> None:
    """XL + 5 with fleet cap=4: 0 offers and fallback must NOT promote."""
    _clear_locations(db)
    _isolate_drivers(db)
    veh = _vehicle(db, max_passengers=4)
    driver_id = _driver(db, categories="xl,x", vehicle=veh)
    trip = _requested_trip(db, vehicle_category="xl", passenger_count=5)

    assert has_eligible_driver_for_assigned_pool(db, trip) is False
    assert create_offers_for_trip(db=db, trip=trip) == []
    db.commit()

    _ping(db, driver_id)
    db.refresh(trip)

    assert trip.status == TripStatus.requested
    assert trip.driver_id is None


def test_wrong_category_keeps_requested(
    db: Session, matching_fallbacks_on: None, capacity_gates_on: None
) -> None:
    _clear_locations(db)
    _isolate_drivers(db)
    veh = _vehicle(db, max_passengers=4)
    driver_id = _driver(db, categories="comfort", vehicle=veh)
    trip = _requested_trip(db, vehicle_category="x", passenger_count=1)

    assert has_eligible_driver_for_assigned_pool(db, trip) is False
    _ping(db, driver_id)
    db.refresh(trip)
    assert trip.status == TripStatus.requested


def test_pet_fare_category_mismatch_keeps_requested(
    db: Session, matching_fallbacks_on: None, capacity_gates_on: None
) -> None:
    """PET-5A.1: pet opt-in is non-enforcing; fare/category mismatch still blocks pool."""
    _clear_locations(db)
    _isolate_drivers(db)
    veh = _vehicle(db, max_passengers=4)
    driver_id = _driver(db, categories="x", vehicle=veh)
    trip = _requested_trip(
        db,
        vehicle_category="comfort",
        passenger_count=1,
        has_pet=True,
        pet_occupies_seat=False,
    )

    assert has_eligible_driver_for_assigned_pool(db, trip) is False
    _ping(db, driver_id)
    db.refresh(trip)
    assert trip.status == TripStatus.requested


def test_no_active_vehicle_keeps_requested_when_capacity_gate_on(
    db: Session, matching_fallbacks_on: None, capacity_gates_on: None
) -> None:
    _clear_locations(db)
    _isolate_drivers(db)
    driver_id = _driver(db, categories="x", vehicle=None)
    trip = _requested_trip(db, vehicle_category="x", passenger_count=1)

    assert has_eligible_driver_for_assigned_pool(db, trip) is False
    _ping(db, driver_id)
    db.refresh(trip)
    assert trip.status == TripStatus.requested


def test_matching_dispatch_unchanged_with_eligible_nearby(
    db: Session, matching_fallbacks_on: None, capacity_gates_on: None
) -> None:
    _clear_locations(db)
    _isolate_drivers(db)
    veh = _vehicle(db, max_passengers=4)
    _driver(db, categories="x", vehicle=veh, lat=38.701, lng=-9.101)
    trip = _requested_trip(db, vehicle_category="x", passenger_count=2)

    offers = create_offers_for_trip(db=db, trip=trip)
    db.commit()
    assert len(offers) == 1
    db.refresh(trip)
    # Multi-offer path does not flip status to assigned.
    assert trip.status == TripStatus.requested


def test_accept_capacity_guard_unchanged(
    db: Session, matching_fallbacks_on: None, capacity_gates_on: None
) -> None:
    _clear_locations(db)
    _isolate_drivers(db)
    veh = _vehicle(db, max_passengers=4)
    driver_id = _driver(db, categories="xl,x", vehicle=veh, lat=38.701, lng=-9.101)
    trip = _requested_trip(db, vehicle_category="xl", passenger_count=5)
    trip.status = TripStatus.assigned
    db.commit()

    with pytest.raises(HTTPException) as ei:
        accept_trip(db=db, driver_id=driver_id, trip_id=str(trip.id))
    assert ei.value.status_code == 409
    assert ei.value.detail == CODE_VEHICLE_CAPACITY_INSUFFICIENT
    db.refresh(trip)
    assert trip.status == TripStatus.assigned
    assert trip.driver_id is None


def test_capacity_sufficient_allows_pool_and_accept_path(
    db: Session, matching_fallbacks_on: None, capacity_gates_on: None
) -> None:
    _clear_locations(db)
    _isolate_drivers(db)
    veh = _vehicle(db, max_passengers=6)
    driver_id = _driver(db, categories="xl", vehicle=veh)
    trip = _requested_trip(db, vehicle_category="xl", passenger_count=5)

    assert has_eligible_driver_for_assigned_pool(db, trip) is True
    _ping(db, driver_id)
    db.refresh(trip)
    assert trip.status == TripStatus.assigned
    assert trip.driver_id is None
