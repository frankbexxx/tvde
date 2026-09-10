"""PET-0 — fare category vs Pet attributes."""

from __future__ import annotations

import uuid

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver
from app.db.models.trip import Trip
from app.db.models.user import User
from app.models.enums import DriverStatus, Role, TripStatus, UserStatus
from app.schemas.trip import TripCreateRequest
from app.services.pet_trip import (
    PET_SURCHARGE_EUR,
    driver_matches_trip_fare_and_pet,
    resolve_trip_pet_create,
    trip_fare_category,
    trip_requires_pet_driver_opt_in,
)


def _passenger(db: Session) -> User:
    uid = uuid.uuid4().hex[:8]
    u = User(
        name=f"Pax_{uid}",
        phone=f"+351910{uid}",
        role=Role.passenger,
        status=UserStatus.active,
    )
    db.add(u)
    db.flush()
    return u


def _driver(db: Session, *, categories: str) -> Driver:
    uid = uuid.uuid4().hex[:8]
    u = User(
        name=f"Drv_{uid}",
        phone=f"+351920{uid}",
        role=Role.driver,
        status=UserStatus.active,
    )
    db.add(u)
    db.flush()
    d = Driver(
        partner_id=DEFAULT_PARTNER_UUID,
        user_id=u.id,
        status=DriverStatus.approved,
        commission_percent=15.0,
        is_available=True,
        vehicle_categories=categories,
    )
    db.add(d)
    db.flush()
    return d


def test_pet_surcharge_placeholder_constant() -> None:
    from decimal import Decimal

    assert PET_SURCHARGE_EUR == Decimal("1.50")


def test_resolve_default_go_no_pet() -> None:
    r = resolve_trip_pet_create(vehicle_category=None)
    assert r.fare_category == "x"
    assert r.has_pet is False
    assert r.is_assistance_animal is False
    assert r.pet_size is None


def test_resolve_legacy_vehicle_category_pet_normalizes() -> None:
    r = resolve_trip_pet_create(vehicle_category="pet")
    assert r.fare_category == "x"
    assert r.has_pet is True
    assert r.is_assistance_animal is False


def test_resolve_go_plus_pet() -> None:
    r = resolve_trip_pet_create(
        vehicle_category="x",
        has_pet=True,
        pet_size="small",
        pet_transport="carrier",
    )
    assert r.fare_category == "x"
    assert r.has_pet is True
    assert r.pet_size == "small"
    assert r.pet_transport == "carrier"


def test_resolve_comfort_plus_pet() -> None:
    r = resolve_trip_pet_create(vehicle_category="comfort", has_pet=True)
    assert r.fare_category == "comfort"
    assert r.has_pet is True


def test_resolve_xl_plus_pet() -> None:
    r = resolve_trip_pet_create(vehicle_category="xl", has_pet=True)
    assert r.fare_category == "xl"
    assert r.has_pet is True


def test_resolve_assistance_clears_pet() -> None:
    r = resolve_trip_pet_create(
        vehicle_category="comfort",
        has_pet=True,
        is_assistance_animal=True,
        pet_size="large",
        pet_occupies_seat=True,
    )
    assert r.fare_category == "comfort"
    assert r.has_pet is False
    assert r.is_assistance_animal is True
    assert r.pet_size is None
    assert r.pet_occupies_seat is True


def test_resolve_pet_attrs_without_has_pet_rejected() -> None:
    with pytest.raises(HTTPException) as ei:
        resolve_trip_pet_create(vehicle_category="x", pet_size="small")
    assert ei.value.detail == "pet_attributes_require_has_pet"


def test_resolve_large_without_harness_rejected() -> None:
    with pytest.raises(HTTPException) as ei:
        resolve_trip_pet_create(
            vehicle_category="x",
            has_pet=True,
            pet_size="large",
            pet_transport="carrier",
        )
    assert ei.value.detail == "pet_large_requires_harness"


def test_resolve_large_with_harness_ok() -> None:
    r = resolve_trip_pet_create(
        vehicle_category="x",
        has_pet=True,
        pet_size="large",
        pet_transport="harness",
    )
    assert r.has_pet is True
    assert r.pet_transport == "harness"


def _persist_resolved_trip(db: Session, *, vehicle_category: str | None = None, **pet_kwargs) -> Trip:
    pet = resolve_trip_pet_create(vehicle_category=vehicle_category, **pet_kwargs)
    trip = Trip(
        passenger_id=_passenger(db).id,
        status=TripStatus.requested,
        origin_lat=38.72,
        origin_lng=-9.14,
        destination_lat=38.73,
        destination_lng=-9.15,
        estimated_price=5.0,
        vehicle_category=pet.fare_category,
        has_pet=pet.has_pet,
        pet_size=pet.pet_size,
        pet_transport=pet.pet_transport,
        is_assistance_animal=pet.is_assistance_animal,
        pet_occupies_seat=pet.pet_occupies_seat,
    )
    db.add(trip)
    db.flush()
    return trip


def test_create_path_default_unchanged(db: Session) -> None:
    trip = _persist_resolved_trip(db)
    assert trip.vehicle_category == "x"
    assert trip.has_pet is False
    assert trip.is_assistance_animal is False
    # Schema defaults preserve old clients
    payload = TripCreateRequest(
        origin_lat=1.0, origin_lng=1.0, destination_lat=2.0, destination_lng=2.0
    )
    assert payload.has_pet is False
    assert payload.vehicle_category is None


def test_create_path_go_plus_pet_representable(db: Session) -> None:
    trip = _persist_resolved_trip(
        db,
        vehicle_category="x",
        has_pet=True,
        pet_size="medium",
        pet_transport="harness",
    )
    assert trip.vehicle_category == "x"
    assert trip.has_pet is True
    assert trip.pet_size == "medium"


def test_create_path_legacy_pet_category_not_persisted(db: Session) -> None:
    trip = _persist_resolved_trip(db, vehicle_category="pet")
    assert trip.vehicle_category == "x"
    assert trip.has_pet is True


def test_matching_pet_requires_opt_in(db: Session) -> None:
    trip = Trip(
        passenger_id=_passenger(db).id,
        status=TripStatus.requested,
        origin_lat=1,
        origin_lng=1,
        destination_lat=2,
        destination_lng=2,
        estimated_price=5,
        vehicle_category="x",
        has_pet=True,
    )
    db.add(trip)
    db.flush()
    only_x = _driver(db, categories="x")
    with_pet = _driver(db, categories="x,pet")
    assert driver_matches_trip_fare_and_pet(only_x, trip) is False
    assert driver_matches_trip_fare_and_pet(with_pet, trip) is True
    assert trip_requires_pet_driver_opt_in(trip) is True


def test_matching_assistance_no_pet_opt_in(db: Session) -> None:
    trip = Trip(
        passenger_id=_passenger(db).id,
        status=TripStatus.requested,
        origin_lat=1,
        origin_lng=1,
        destination_lat=2,
        destination_lng=2,
        estimated_price=5,
        vehicle_category="comfort",
        has_pet=False,
        is_assistance_animal=True,
    )
    db.add(trip)
    db.flush()
    comfort_only = _driver(db, categories="comfort")
    assert driver_matches_trip_fare_and_pet(comfort_only, trip) is True
    assert trip_requires_pet_driver_opt_in(trip) is False


def test_matching_legacy_vehicle_category_pet(db: Session) -> None:
    """Historical rows with vehicle_category=pet still match pet-capable drivers."""
    trip = Trip(
        passenger_id=_passenger(db).id,
        status=TripStatus.requested,
        origin_lat=1,
        origin_lng=1,
        destination_lat=2,
        destination_lng=2,
        estimated_price=5,
        vehicle_category="pet",
        has_pet=False,
    )
    db.add(trip)
    db.flush()
    assert trip_fare_category(trip) == "x"
    pet_only = _driver(db, categories="pet")
    x_only = _driver(db, categories="x")
    assert driver_matches_trip_fare_and_pet(pet_only, trip) is True
    assert driver_matches_trip_fare_and_pet(x_only, trip) is False


def test_matching_comfort_plus_pet(db: Session) -> None:
    trip = Trip(
        passenger_id=_passenger(db).id,
        status=TripStatus.requested,
        origin_lat=1,
        origin_lng=1,
        destination_lat=2,
        destination_lng=2,
        estimated_price=5,
        vehicle_category="comfort",
        has_pet=True,
    )
    db.add(trip)
    db.flush()
    comfort_pet = _driver(db, categories="comfort,pet")
    comfort_only = _driver(db, categories="comfort")
    x_pet = _driver(db, categories="x,pet")
    assert driver_matches_trip_fare_and_pet(comfort_pet, trip) is True
    assert driver_matches_trip_fare_and_pet(comfort_only, trip) is False
    assert driver_matches_trip_fare_and_pet(x_pet, trip) is False


def test_matching_xl_plus_pet(db: Session) -> None:
    trip = Trip(
        passenger_id=_passenger(db).id,
        status=TripStatus.requested,
        origin_lat=1,
        origin_lng=1,
        destination_lat=2,
        destination_lng=2,
        estimated_price=5,
        vehicle_category="xl",
        has_pet=True,
    )
    db.add(trip)
    db.flush()
    assert driver_matches_trip_fare_and_pet(_driver(db, categories="xl,pet"), trip) is True
    assert driver_matches_trip_fare_and_pet(_driver(db, categories="xl"), trip) is False
