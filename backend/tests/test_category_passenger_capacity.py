"""Category passenger capacity at create + matching still vehicle-gated."""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver, DriverLocation
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.models.vehicle import Vehicle
from app.db.models.vehicle_document import VehicleDocument
from app.models.enums import DriverStatus, Role, TripStatus, UserStatus
from app.schemas.trip import TripCreateRequest
from app.services.driver_location import upsert_driver_location
from app.services.offer_dispatch import (
    create_offers_for_trip,
    has_eligible_driver_for_assigned_pool,
)
from app.services.partner_vehicle_documents import VEHICLE_DOCUMENT_REQUIRED_TYPES_ORDERED
from app.services.tolls.here import TollEstimateResult
from app.services.trips import accept_trip, create_trip
from app.services.vehicle_capacity import (
    CODE_PASSENGER_CAPACITY_EXCEEDS_CATEGORY,
    CODE_VEHICLE_CAPACITY_INSUFFICIENT,
    assert_category_passenger_capacity,
    compute_required_seats,
)
from tests.support.unique_phone import unique_test_phone


def test_compute_required_seats_pet_math() -> None:
    assert compute_required_seats(4) == 4
    assert compute_required_seats(4, pet_occupies_seat=True, has_pet=True) == 5
    assert compute_required_seats(3, pet_occupies_seat=True, has_pet=True) == 4
    assert compute_required_seats(4, pet_occupies_seat=True, has_pet=False) == 4
    assert (
        compute_required_seats(4, pet_occupies_seat=True, is_assistance_animal=True) == 5
    )


def test_assert_category_go_comfort_xl_rules() -> None:
    assert_category_passenger_capacity(fare_category="x", passenger_count=4)
    assert_category_passenger_capacity(fare_category="comfort", passenger_count=4)
    assert_category_passenger_capacity(fare_category="xl", passenger_count=5)
    assert_category_passenger_capacity(fare_category="xl", passenger_count=8)

    with pytest.raises(HTTPException) as go5:
        assert_category_passenger_capacity(fare_category="x", passenger_count=5)
    assert go5.value.status_code == 422
    assert go5.value.detail == CODE_PASSENGER_CAPACITY_EXCEEDS_CATEGORY

    with pytest.raises(HTTPException) as comfort5:
        assert_category_passenger_capacity(fare_category="comfort", passenger_count=5)
    assert comfort5.value.detail == CODE_PASSENGER_CAPACITY_EXCEEDS_CATEGORY

    with pytest.raises(HTTPException) as go_pet:
        assert_category_passenger_capacity(
            fare_category="x",
            passenger_count=4,
            pet_occupies_seat=True,
            has_pet=True,
        )
    assert go_pet.value.detail == CODE_PASSENGER_CAPACITY_EXCEEDS_CATEGORY

    assert_category_passenger_capacity(
        fare_category="x",
        passenger_count=3,
        pet_occupies_seat=True,
        has_pet=True,
    )


def _passenger(db: Session) -> str:
    user = User(
        role=Role.passenger,
        name=f"CatPax {uuid.uuid4()}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add(user)
    db.commit()
    return str(user.id)


def _payload(
    *,
    vehicle_category: str,
    passenger_count: int,
    has_pet: bool = False,
    pet_occupies_seat: bool = False,
) -> TripCreateRequest:
    return TripCreateRequest(
        origin_lat=38.7223,
        origin_lng=-9.1393,
        destination_lat=38.73,
        destination_lng=-9.14,
        vehicle_category=vehicle_category,
        passenger_count=passenger_count,
        has_pet=has_pet,
        pet_size="small" if has_pet else None,
        pet_transport="carrier" if has_pet else None,
        pet_occupies_seat=pet_occupies_seat,
    )


def _stub_create_side_effects(monkeypatch: pytest.MonkeyPatch) -> None:
    """Avoid OSRM/HERE/dispatch retries in create_trip happy paths."""
    monkeypatch.setattr(
        "app.services.trips._estimate_trip",
        lambda payload, category="x": (10.0, 5.0, 12.0, 5),
    )
    monkeypatch.setattr(
        "app.services.tolls.here.estimate_tolls",
        lambda *a, **k: TollEstimateResult(
            amount=Decimal("0.00"),
            currency="EUR",
            source="none",
            status="flag_off",
            calculated_at=datetime.now(timezone.utc),
            latency_ms=0,
        ),
    )
    monkeypatch.setattr(
        "app.services.trips.create_offers_for_trip",
        lambda **kwargs: [],
    )
    monkeypatch.setattr("app.services.trips.publish_trip_offers", lambda **kwargs: None)

    async def _no_sleep(_: float) -> None:
        return None

    monkeypatch.setattr(asyncio, "sleep", _no_sleep)


def test_create_go_comfort_xl_category_rules(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_CAPACITY_GATES", True, raising=False)
    _stub_create_side_effects(monkeypatch)
    pax = _passenger(db)

    trip, _ = asyncio.run(
        create_trip(
            db=db,
            passenger_id=pax,
            payload=_payload(vehicle_category="x", passenger_count=4),
        )
    )
    assert trip.passenger_count == 4
    assert trip.vehicle_category == "x"

    with pytest.raises(HTTPException) as go5:
        asyncio.run(
            create_trip(
                db=db,
                passenger_id=pax,
                payload=_payload(vehicle_category="x", passenger_count=5),
            )
        )
    assert go5.value.detail == CODE_PASSENGER_CAPACITY_EXCEEDS_CATEGORY

    trip_c, _ = asyncio.run(
        create_trip(
            db=db,
            passenger_id=pax,
            payload=_payload(vehicle_category="comfort", passenger_count=4),
        )
    )
    assert trip_c.vehicle_category == "comfort"

    with pytest.raises(HTTPException) as c5:
        asyncio.run(
            create_trip(
                db=db,
                passenger_id=pax,
                payload=_payload(vehicle_category="comfort", passenger_count=5),
            )
        )
    assert c5.value.detail == CODE_PASSENGER_CAPACITY_EXCEEDS_CATEGORY

    with pytest.raises(HTTPException) as go_pet:
        asyncio.run(
            create_trip(
                db=db,
                passenger_id=pax,
                payload=_payload(
                    vehicle_category="x",
                    passenger_count=4,
                    has_pet=True,
                    pet_occupies_seat=True,
                ),
            )
        )
    assert go_pet.value.detail == CODE_PASSENGER_CAPACITY_EXCEEDS_CATEGORY

    trip_ok_pet, _ = asyncio.run(
        create_trip(
            db=db,
            passenger_id=pax,
            payload=_payload(
                vehicle_category="x",
                passenger_count=3,
                has_pet=True,
                pet_occupies_seat=True,
            ),
        )
    )
    assert trip_ok_pet.passenger_count == 3
    assert trip_ok_pet.pet_occupies_seat is True

    trip_xl5, _ = asyncio.run(
        create_trip(
            db=db,
            passenger_id=pax,
            payload=_payload(vehicle_category="xl", passenger_count=5),
        )
    )
    assert trip_xl5.vehicle_category == "xl"
    assert trip_xl5.passenger_count == 5

    trip_xl8, _ = asyncio.run(
        create_trip(
            db=db,
            passenger_id=pax,
            payload=_payload(vehicle_category="xl", passenger_count=8),
        )
    )
    assert trip_xl8.passenger_count == 8


def _vehicle(db: Session, *, max_passengers: int) -> Vehicle:
    suffix = uuid.uuid4().hex[:8].upper()
    vehicle = Vehicle(
        partner_id=DEFAULT_PARTNER_UUID,
        plate=f"CAT-{suffix}",
        plate_normalized=f"CAT{suffix}",
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
    db.flush()
    return vehicle


def _driver(
    db: Session,
    *,
    vehicle: Vehicle,
    categories: str = "xl,x",
    lat: float = 38.7223,
    lng: float = -9.1393,
) -> str:
    user = User(
        role=Role.driver,
        name=f"CatDrv {uuid.uuid4()}",
        phone=unique_test_phone(),
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
            active_vehicle_id=vehicle.id,
        )
    )
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


def test_matching_cap4_rejects_xl5_cap6_allows(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_CAPACITY_GATES", True, raising=False)
    for loc in db.execute(select(DriverLocation)).scalars().all():
        db.delete(loc)
    for drv in db.execute(select(Driver)).scalars().all():
        drv.is_available = False
    db.commit()

    v4 = _vehicle(db, max_passengers=4)
    _driver(db, vehicle=v4, categories="xl")
    pax = User(
        role=Role.passenger,
        name="P",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add(pax)
    db.flush()
    trip5 = Trip(
        passenger_id=pax.id,
        status=TripStatus.requested,
        origin_lat=38.7223,
        origin_lng=-9.1393,
        destination_lat=38.73,
        destination_lng=-9.14,
        estimated_price=5.0,
        vehicle_category="xl",
        passenger_count=5,
    )
    db.add(trip5)
    db.commit()
    db.refresh(trip5)

    assert create_offers_for_trip(db=db, trip=trip5) == []
    assert has_eligible_driver_for_assigned_pool(db, trip5) is False

    v6 = _vehicle(db, max_passengers=6)
    _driver(db, vehicle=v6, categories="xl", lat=38.7225, lng=-9.1390)
    assert has_eligible_driver_for_assigned_pool(db, trip5) is True
    offers = create_offers_for_trip(db=db, trip=trip5)
    assert len(offers) >= 1


def test_fallback_does_not_promote_xl5_when_no_eligible(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENABLE_BETA_MATCHING_FALLBACKS", True, raising=False)
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_CAPACITY_GATES", True, raising=False)
    for loc in db.execute(select(DriverLocation)).scalars().all():
        db.delete(loc)
    for drv in db.execute(select(Driver)).scalars().all():
        drv.is_available = False
    for orphan in (
        db.execute(select(Trip).where(Trip.status == TripStatus.requested)).scalars().all()
    ):
        orphan.status = TripStatus.cancelled
    db.commit()

    v4 = _vehicle(db, max_passengers=4)
    driver_id = _driver(db, vehicle=v4, categories="xl", lat=41.15, lng=-8.61)
    pax = User(
        role=Role.passenger,
        name="P2",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add(pax)
    db.flush()
    trip = Trip(
        passenger_id=pax.id,
        status=TripStatus.requested,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=5.0,
        vehicle_category="xl",
        passenger_count=5,
    )
    trip.created_at = datetime.now(timezone.utc) - timedelta(hours=2)
    db.add(trip)
    db.commit()

    ts_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    upsert_driver_location(
        db=db, driver_id=driver_id, lat=41.15, lng=-8.61, timestamp_ms=ts_ms
    )
    db.refresh(trip)
    assert trip.status == TripStatus.requested
    assert trip.driver_id is None


def test_accept_capacity_guard_intact(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_CAPACITY_GATES", True, raising=False)
    v4 = _vehicle(db, max_passengers=4)
    driver_id = _driver(db, vehicle=v4, categories="xl")
    pax = User(
        role=Role.passenger,
        name="P3",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add(pax)
    db.flush()
    trip = Trip(
        passenger_id=pax.id,
        status=TripStatus.assigned,
        origin_lat=38.7223,
        origin_lng=-9.1393,
        destination_lat=38.73,
        destination_lng=-9.14,
        estimated_price=5.0,
        vehicle_category="xl",
        passenger_count=5,
    )
    db.add(trip)
    db.commit()

    with pytest.raises(HTTPException) as ei:
        accept_trip(db=db, driver_id=driver_id, trip_id=str(trip.id))
    assert ei.value.status_code == 409
    assert ei.value.detail == CODE_VEHICLE_CAPACITY_INSUFFICIENT
