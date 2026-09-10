"""PET-4 — passenger_count + vehicle capacity helpers / matching."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver, DriverLocation
from app.db.models.trip import Trip
from app.db.models.trip_offer import TripOffer
from app.db.models.user import User
from app.db.models.vehicle import Vehicle
from app.db.models.vehicle_document import VehicleDocument
from app.models.enums import DriverStatus, OfferStatus, Role, TripStatus, UserStatus
from app.services.partner_vehicle_documents import VEHICLE_DOCUMENT_REQUIRED_TYPES_ORDERED
from app.services.trips import list_available_trips
from app.services.vehicle_capacity import (
    CODE_VEHICLE_CAPACITY_INSUFFICIENT,
    assert_driver_matches_trip_capacity,
    driver_matches_trip_capacity,
    occupied_pet_seats,
    required_passenger_capacity,
    resolve_passenger_count,
    trip_passenger_count,
)


def test_resolve_passenger_count_defaults_and_bounds() -> None:
    assert resolve_passenger_count(None) == 1
    assert resolve_passenger_count(1) == 1
    assert resolve_passenger_count(4) == 4
    with pytest.raises(HTTPException) as ei0:
        resolve_passenger_count(0)
    assert ei0.value.detail == "invalid_passenger_count"
    with pytest.raises(HTTPException) as ei_neg:
        resolve_passenger_count(-1)
    assert ei_neg.value.detail == "invalid_passenger_count"
    with pytest.raises(HTTPException) as ei_hi:
        resolve_passenger_count(99)
    assert ei_hi.value.detail == "invalid_passenger_count"


def test_occupied_and_required_capacity_rules() -> None:
    base = Trip(
        passenger_id=uuid.uuid4(),
        status=TripStatus.requested,
        origin_lat=1,
        origin_lng=1,
        destination_lat=2,
        destination_lng=2,
        estimated_price=5,
        passenger_count=3,
        has_pet=True,
        pet_occupies_seat=True,
    )
    assert occupied_pet_seats(base) == 1
    assert required_passenger_capacity(base) == 4

    carrier = Trip(
        passenger_id=uuid.uuid4(),
        status=TripStatus.requested,
        origin_lat=1,
        origin_lng=1,
        destination_lat=2,
        destination_lng=2,
        estimated_price=5,
        passenger_count=4,
        has_pet=True,
        pet_occupies_seat=False,
    )
    assert occupied_pet_seats(carrier) == 0
    assert required_passenger_capacity(carrier) == 4

    assist_seat = Trip(
        passenger_id=uuid.uuid4(),
        status=TripStatus.requested,
        origin_lat=1,
        origin_lng=1,
        destination_lat=2,
        destination_lng=2,
        estimated_price=5,
        passenger_count=2,
        has_pet=False,
        is_assistance_animal=True,
        pet_occupies_seat=True,
    )
    assert occupied_pet_seats(assist_seat) == 1
    assert required_passenger_capacity(assist_seat) == 3

    assist_no = Trip(
        passenger_id=uuid.uuid4(),
        status=TripStatus.requested,
        origin_lat=1,
        origin_lng=1,
        destination_lat=2,
        destination_lng=2,
        estimated_price=5,
        passenger_count=2,
        is_assistance_animal=True,
        pet_occupies_seat=False,
    )
    assert occupied_pet_seats(assist_no) == 0
    assert required_passenger_capacity(assist_no) == 2


def test_legacy_trip_missing_passenger_count_defaults_to_1() -> None:
    trip = Trip(
        passenger_id=uuid.uuid4(),
        status=TripStatus.requested,
        origin_lat=1,
        origin_lng=1,
        destination_lat=2,
        destination_lng=2,
        estimated_price=5,
    )
    # Simulate attribute absence / None for pre-migration style objects
    object.__setattr__(trip, "passenger_count", None)
    assert trip_passenger_count(trip) == 1


def _compliant_vehicle(db: Session, *, max_passengers: int | None) -> uuid.UUID:
    plate_suffix = uuid.uuid4().hex[:8].upper()
    vehicle = Vehicle(
        partner_id=DEFAULT_PARTNER_UUID,
        plate=f"CAP-{plate_suffix}",
        plate_normalized=f"CAP{plate_suffix}",
        make="Test",
        model="Cap",
        status="active",
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
    db.commit()
    return vehicle.id


def _driver(db: Session, *, vehicle_id: uuid.UUID, categories: str = "x") -> uuid.UUID:
    user = User(
        role=Role.driver,
        name=f"CapDrv {uuid.uuid4()}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(user)
    db.flush()
    db.add(
        Driver(
            partner_id=DEFAULT_PARTNER_UUID,
            user_id=user.id,
            status=DriverStatus.approved,
            commission_percent=15.0,
            is_available=True,
            vehicle_categories=categories,
            active_vehicle_id=vehicle_id,
        )
    )
    db.add(
        DriverLocation(
            driver_id=user.id,
            lat=38.7223,
            lng=-9.1393,
            timestamp=datetime.now(timezone.utc),
        )
    )
    db.commit()
    return user.id


def _offer_trip(
    db: Session,
    driver_id: uuid.UUID,
    *,
    passenger_count: int = 1,
    has_pet: bool = False,
    pet_occupies_seat: bool = False,
    is_assistance_animal: bool = False,
) -> uuid.UUID:
    pax = User(
        role=Role.passenger,
        name="CapPax",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(pax)
    db.flush()
    trip = Trip(
        passenger_id=pax.id,
        status=TripStatus.requested,
        origin_lat=38.7223,
        origin_lng=-9.1393,
        destination_lat=38.73,
        destination_lng=-9.14,
        estimated_price=5.0,
        vehicle_category="x",
        passenger_count=passenger_count,
        has_pet=has_pet,
        pet_occupies_seat=pet_occupies_seat,
        is_assistance_animal=is_assistance_animal,
    )
    db.add(trip)
    db.flush()
    db.add(
        TripOffer(
            trip_id=trip.id,
            driver_id=driver_id,
            status=OfferStatus.pending,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        )
    )
    db.commit()
    return trip.id


def _listed(db: Session, driver_id: uuid.UUID) -> set[uuid.UUID]:
    rows = list_available_trips(db=db, driver_id=str(driver_id))
    return {trip.id for trip, _ in rows}


@pytest.fixture
def capacity_on(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_CAPACITY_GATES", True, raising=False)
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", True, raising=False)


def test_capacity_gate_off_allows_unknown(db: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_CAPACITY_GATES", False, raising=False)
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", True, raising=False)
    vid = _compliant_vehicle(db, max_passengers=None)
    driver_id = _driver(db, vehicle_id=vid)
    trip_id = _offer_trip(db, driver_id, passenger_count=5)
    assert trip_id in _listed(db, driver_id)


def test_list_blocks_insufficient_and_allows_enough(db: Session, capacity_on) -> None:
    vid4 = _compliant_vehicle(db, max_passengers=4)
    d4 = _driver(db, vehicle_id=vid4)
    blocked = _offer_trip(db, d4, passenger_count=5)
    ok = _offer_trip(db, d4, passenger_count=4)
    listed = _listed(db, d4)
    assert blocked not in listed
    assert ok in listed


def test_list_pet_seat_math(db: Session, capacity_on) -> None:
    vid4 = _compliant_vehicle(db, max_passengers=4)
    d = _driver(db, vehicle_id=vid4, categories="x,pet")
    ok = _offer_trip(
        db, d, passenger_count=3, has_pet=True, pet_occupies_seat=True
    )
    blocked = _offer_trip(
        db, d, passenger_count=4, has_pet=True, pet_occupies_seat=True
    )
    carrier_ok = _offer_trip(
        db, d, passenger_count=4, has_pet=True, pet_occupies_seat=False
    )
    listed = _listed(db, d)
    assert ok in listed
    assert blocked not in listed
    assert carrier_ok in listed


def test_unknown_capacity_blocked_when_gate_on(db: Session, capacity_on) -> None:
    vid = _compliant_vehicle(db, max_passengers=None)
    d = _driver(db, vehicle_id=vid)
    trip_id = _offer_trip(db, d, passenger_count=1)
    assert trip_id not in _listed(db, d)


def test_accept_recheck_raises_capacity_code(db: Session, capacity_on) -> None:
    vid = _compliant_vehicle(db, max_passengers=3)
    d_id = _driver(db, vehicle_id=vid)
    driver = db.get(Driver, d_id)
    assert driver is not None
    pax = User(
        role=Role.passenger,
        name="CapAccept",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(pax)
    db.flush()
    trip = Trip(
        passenger_id=pax.id,
        status=TripStatus.requested,
        origin_lat=1,
        origin_lng=1,
        destination_lat=2,
        destination_lng=2,
        estimated_price=5,
        vehicle_category="x",
        passenger_count=4,
    )
    db.add(trip)
    db.commit()
    with pytest.raises(HTTPException) as ei:
        assert_driver_matches_trip_capacity(db, driver, trip, surface="test")
    assert ei.value.status_code == 409
    assert ei.value.detail == CODE_VEHICLE_CAPACITY_INSUFFICIENT
    assert driver_matches_trip_capacity(db, driver, trip) is False
