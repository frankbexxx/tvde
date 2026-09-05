"""M2 activity retention — historical partner/vehicle on trips."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver
from app.db.models.driver_active_driving_segment import DriverActiveDrivingSegment
from app.db.models.partner import Partner
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.models.vehicle import Vehicle
from app.models.enums import DriverStatus, Role, TripStatus, UserStatus
from app.services.activity_retention import (
    ACTIVITY_RETENTION_DAYS,
    stamp_trip_activity_context,
)
from app.services.cleanup import run_cleanup
from app.services.partner_queries import list_trips_for_partner
from app.services.partner_vehicles import normalize_plate


def _make_passenger(db) -> User:
    u = User(
        role=Role.passenger,
        name=f"Pax {uuid.uuid4().hex[:6]}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(u)
    db.flush()
    return u


def _make_partner(db, *, name: str | None = None) -> Partner:
    p = Partner(name=name or f"Fleet {uuid.uuid4().hex[:6]}")
    db.add(p)
    db.flush()
    return p


def _make_vehicle(db, *, partner_id: uuid.UUID, plate: str | None = None) -> Vehicle:
    # High entropy: fixed plates collide on shared CI/local DBs.
    plate = plate or f"AR-{uuid.uuid4().hex[:8].upper()}"
    v = Vehicle(
        partner_id=partner_id,
        plate=plate,
        plate_normalized=normalize_plate(plate),
        make="Test",
        model="Car",
        status="active",
    )
    db.add(v)
    db.flush()
    return v


def _make_driver(
    db,
    *,
    partner_id: uuid.UUID,
    vehicle: Vehicle | None = None,
) -> tuple[User, Driver]:
    u = User(
        role=Role.driver,
        name=f"Drv {uuid.uuid4().hex[:6]}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(u)
    db.flush()
    d = Driver(
        partner_id=partner_id,
        user_id=u.id,
        status=DriverStatus.approved,
        commission_percent=15.0,
        is_available=True,
        active_vehicle_id=vehicle.id if vehicle else None,
    )
    db.add(d)
    db.commit()
    db.refresh(d)
    return u, d


def _make_trip(db, *, passenger: User, driver: Driver | None = None) -> Trip:
    trip = Trip(
        passenger_id=passenger.id,
        driver_id=driver.user_id if driver else None,
        status=TripStatus.accepted if driver else TripStatus.requested,
        origin_lat=38.72,
        origin_lng=-9.14,
        destination_lat=38.73,
        destination_lng=-9.15,
        estimated_price=10.0,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


def test_activity_retention_days_is_730() -> None:
    assert ACTIVITY_RETENTION_DAYS == 730


def test_stamp_preserves_partner_vehicle_plate(db) -> None:
    partner = _make_partner(db)
    vehicle = _make_vehicle(db, partner_id=partner.id)
    _, driver = _make_driver(db, partner_id=partner.id, vehicle=vehicle)
    pax = _make_passenger(db)
    trip = _make_trip(db, passenger=pax)

    stamp_trip_activity_context(db, trip, driver)
    trip.driver_id = driver.user_id
    db.commit()
    db.refresh(trip)

    assert trip.driver_id == driver.user_id
    assert trip.partner_id == partner.id
    assert trip.vehicle_id == vehicle.id
    assert trip.vehicle_plate == vehicle.plate


def test_later_partner_change_does_not_rewrite_trip(db) -> None:
    p1 = _make_partner(db, name="Fleet A")
    p2 = _make_partner(db, name="Fleet B")
    vehicle = _make_vehicle(db, partner_id=p1.id)
    _, driver = _make_driver(db, partner_id=p1.id, vehicle=vehicle)
    pax = _make_passenger(db)
    trip = _make_trip(db, passenger=pax)
    stamp_trip_activity_context(db, trip, driver)
    trip.driver_id = driver.user_id
    db.commit()

    driver.partner_id = p2.id
    db.commit()
    db.refresh(trip)

    assert trip.partner_id == p1.id
    trips_p1 = list_trips_for_partner(db, str(p1.id))
    trips_p2 = list_trips_for_partner(db, str(p2.id))
    assert any(t.id == trip.id for t in trips_p1)
    assert not any(t.id == trip.id for t in trips_p2)


def test_later_active_vehicle_change_does_not_rewrite_trip(db) -> None:
    partner = _make_partner(db)
    v1 = _make_vehicle(db, partner_id=partner.id)
    v2 = _make_vehicle(db, partner_id=partner.id)
    _, driver = _make_driver(db, partner_id=partner.id, vehicle=v1)
    pax = _make_passenger(db)
    trip = _make_trip(db, passenger=pax)
    stamp_trip_activity_context(db, trip, driver)
    trip.driver_id = driver.user_id
    db.commit()
    plate_snap = trip.vehicle_plate

    driver.active_vehicle_id = v2.id
    db.commit()
    db.refresh(trip)

    assert trip.vehicle_id == v1.id
    assert trip.vehicle_plate == plate_snap == v1.plate


def test_plate_edit_does_not_destroy_snapshot(db) -> None:
    partner = _make_partner(db)
    vehicle = _make_vehicle(db, partner_id=partner.id)
    _, driver = _make_driver(db, partner_id=partner.id, vehicle=vehicle)
    pax = _make_passenger(db)
    trip = _make_trip(db, passenger=pax)
    stamp_trip_activity_context(db, trip, driver)
    trip.driver_id = driver.user_id
    db.commit()
    original_plate = trip.vehicle_plate

    new_plate = f"AR-{uuid.uuid4().hex[:8].upper()}"
    vehicle.plate = new_plate
    vehicle.plate_normalized = normalize_plate(new_plate)
    db.commit()
    db.refresh(trip)

    assert trip.vehicle_plate == original_plate
    assert trip.vehicle_plate != new_plate
    assert trip.vehicle_id == vehicle.id


def test_legacy_null_historical_fields_readable(db) -> None:
    partner = db.get(Partner, DEFAULT_PARTNER_UUID) or _make_partner(db)
    _, driver = _make_driver(db, partner_id=partner.id)
    pax = _make_passenger(db)
    trip = _make_trip(db, passenger=pax, driver=driver)
    assert trip.partner_id is None
    assert trip.vehicle_id is None
    assert trip.vehicle_plate is None
    # Partner list still finds via legacy driver.partner_id fallback
    found = list_trips_for_partner(db, str(partner.id))
    assert any(t.id == trip.id for t in found)


def test_cleanup_does_not_delete_trips_or_segments(db) -> None:
    partner = _make_partner(db)
    _, driver = _make_driver(db, partner_id=partner.id)
    pax = _make_passenger(db)
    trip = _make_trip(db, passenger=pax, driver=driver)
    seg = DriverActiveDrivingSegment(
        driver_id=driver.user_id,
        trip_id=trip.id,
        started_at=datetime.now(timezone.utc) - timedelta(days=100),
        ended_at=datetime.now(timezone.utc) - timedelta(days=99),
    )
    db.add(seg)
    db.commit()
    seg_id = seg.id
    trip_id = trip.id

    run_cleanup(db)

    assert db.get(Trip, trip_id) is not None
    assert db.get(DriverActiveDrivingSegment, seg_id) is not None


def test_stamp_without_vehicle_leaves_vehicle_null(db) -> None:
    partner = _make_partner(db)
    _, driver = _make_driver(db, partner_id=partner.id, vehicle=None)
    pax = _make_passenger(db)
    trip = _make_trip(db, passenger=pax)
    stamp_trip_activity_context(db, trip, driver)
    db.commit()
    db.refresh(trip)
    assert trip.partner_id == partner.id
    assert trip.vehicle_id is None
    assert trip.vehicle_plate is None
