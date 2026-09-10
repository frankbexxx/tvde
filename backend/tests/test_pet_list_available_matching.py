"""PET-3 — list_available_trips respects combined fare + Pet matching."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
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


def _compliant_vehicle(db: Session) -> uuid.UUID:
    plate_suffix = uuid.uuid4().hex[:8].upper()
    vehicle = Vehicle(
        partner_id=DEFAULT_PARTNER_UUID,
        plate=f"PET-{plate_suffix}",
        plate_normalized=f"PET{plate_suffix}",
        make="Test",
        model="Pet",
        status="active",
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


def _driver(db: Session, *, categories: str, vehicle_id: uuid.UUID) -> uuid.UUID:
    user = User(
        role=Role.driver,
        name=f"PetList {uuid.uuid4()}",
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
    vehicle_category: str = "x",
    has_pet: bool = False,
    is_assistance_animal: bool = False,
) -> uuid.UUID:
    pax = User(
        role=Role.passenger,
        name="PetList Pax",
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
        vehicle_category=vehicle_category,
        has_pet=has_pet,
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
    return {trip.id for trip, _offer in rows}


@pytest.fixture(autouse=True)
def _compliance_on(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", True, raising=False)


def test_list_go_pet_without_opt_in(db: Session) -> None:
    """PET-5A.1: GO + animal listed for fare-compatible drivers regardless of pet pref."""
    without = _driver(db, categories="x", vehicle_id=_compliant_vehicle(db))
    with_pet = _driver(db, categories="x,pet", vehicle_id=_compliant_vehicle(db))
    trip_a = _offer_trip(db, without, vehicle_category="x", has_pet=True)
    trip_b = _offer_trip(db, with_pet, vehicle_category="x", has_pet=True)
    assert trip_a in _listed(db, without)
    assert trip_b in _listed(db, with_pet)


def test_list_comfort_pet_needs_comfort_not_pet_pref(db: Session) -> None:
    comfort_only = _driver(db, categories="comfort", vehicle_id=_compliant_vehicle(db))
    comfort_pet = _driver(db, categories="comfort,pet", vehicle_id=_compliant_vehicle(db))
    x_pet = _driver(db, categories="x,pet", vehicle_id=_compliant_vehicle(db))
    t1 = _offer_trip(db, comfort_only, vehicle_category="comfort", has_pet=True)
    t2 = _offer_trip(db, comfort_pet, vehicle_category="comfort", has_pet=True)
    t3 = _offer_trip(db, x_pet, vehicle_category="comfort", has_pet=True)
    assert t1 in _listed(db, comfort_only)
    assert t2 in _listed(db, comfort_pet)
    assert t3 not in _listed(db, x_pet)


def test_list_xl_pet(db: Session) -> None:
    xl = _driver(db, categories="xl", vehicle_id=_compliant_vehicle(db))
    xl_pet = _driver(db, categories="xl,pet", vehicle_id=_compliant_vehicle(db))
    t1 = _offer_trip(db, xl, vehicle_category="xl", has_pet=True)
    t2 = _offer_trip(db, xl_pet, vehicle_category="xl", has_pet=True)
    assert t1 in _listed(db, xl)
    assert t2 in _listed(db, xl_pet)


def test_list_assistance_without_pet_opt_in(db: Session) -> None:
    comfort_only = _driver(db, categories="comfort", vehicle_id=_compliant_vehicle(db))
    trip_id = _offer_trip(
        db,
        comfort_only,
        vehicle_category="comfort",
        has_pet=False,
        is_assistance_animal=True,
    )
    assert trip_id in _listed(db, comfort_only)
