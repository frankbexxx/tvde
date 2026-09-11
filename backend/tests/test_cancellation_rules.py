"""A005 / A1-D08 — Cancellation fee V1 = €3.00 fixed."""

from __future__ import annotations

import uuid
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.core.pricing import CANCELLATION_FEE_EUR, money
from app.db.models.driver import Driver
from app.db.models.trip import Trip
from app.db.models.user import User
from app.models.enums import DriverStatus, Role, TripStatus, UserStatus
from app.services.trips import cancel_trip_by_driver, cancel_trip_by_passenger


def _create_passenger_and_driver(db: Session) -> tuple[str, str]:
    uid = uuid.uuid4().hex[:8]
    p = User(
        name=f"Passenger_{uid}",
        phone=f"+351911{uid}",
        role=Role.passenger,
        status=UserStatus.active,
    )
    d = User(
        name=f"Driver_{uid}",
        phone=f"+351922{uid}",
        role=Role.driver,
        status=UserStatus.active,
    )
    db.add(p)
    db.add(d)
    db.flush()
    driver = Driver(
        partner_id=DEFAULT_PARTNER_UUID,
        user_id=d.id,
        status=DriverStatus.approved,
        commission_percent=15.0,
        is_available=True,
    )
    db.add(driver)
    db.flush()
    return str(p.id), str(d.id)


def _accepted_trip(
    db: Session,
    *,
    estimated_price: float,
    vehicle_category: str = "x",
    has_pet: bool = False,
    is_assistance_animal: bool = False,
    price_breakdown: dict | None = None,
) -> tuple[Trip, str, str]:
    passenger_id, driver_id = _create_passenger_and_driver(db)
    trip = Trip(
        passenger_id=passenger_id,
        driver_id=driver_id,
        status=TripStatus.accepted,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=estimated_price,
        vehicle_category=vehicle_category,
        has_pet=has_pet,
        is_assistance_animal=is_assistance_animal,
        price_breakdown=price_breakdown,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip, passenger_id, driver_id


def test_passenger_cancel_before_accept_no_fee(db: Session) -> None:
    """Passenger cancel before driver accept → no fee."""
    passenger_id, _driver_id = _create_passenger_and_driver(db)
    trip = Trip(
        passenger_id=passenger_id,
        status=TripStatus.requested,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=10.0,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    result = cancel_trip_by_passenger(
        db=db,
        passenger_id=passenger_id,
        trip_id=str(trip.id),
        reason="changed_plans",
    )
    db.refresh(result)

    assert result.status == TripStatus.cancelled
    assert result.cancellation_fee is None
    assert result.cancelled_by == "passenger"
    assert result.cancellation_reason == "changed_plans"


def test_fixed_fee_independent_of_estimate(db: Session) -> None:
    """V1: fee is €3 regardless of estimated_price (€4.50 / €10 / €20)."""
    expected = float(money(CANCELLATION_FEE_EUR))
    assert expected == 3.0
    for est in (4.50, 10.0, 20.0):
        trip, passenger_id, _ = _accepted_trip(db, estimated_price=est)
        result = cancel_trip_by_passenger(
            db=db,
            passenger_id=passenger_id,
            trip_id=str(trip.id),
            reason="changed_plans",
        )
        db.refresh(result)
        assert result.cancellation_fee == expected


def test_fixed_fee_independent_of_category(db: Session) -> None:
    expected = float(money(CANCELLATION_FEE_EUR))
    for cat in ("x", "comfort", "xl"):
        trip, passenger_id, _ = _accepted_trip(
            db, estimated_price=10.0, vehicle_category=cat
        )
        result = cancel_trip_by_passenger(
            db=db,
            passenger_id=passenger_id,
            trip_id=str(trip.id),
            reason="changed_plans",
        )
        db.refresh(result)
        assert result.cancellation_fee == expected


def test_fixed_fee_independent_of_pet_and_assistance(db: Session) -> None:
    expected = float(money(CANCELLATION_FEE_EUR))
    for has_pet, assist in ((True, False), (False, True)):
        trip, passenger_id, _ = _accepted_trip(
            db,
            estimated_price=10.0,
            has_pet=has_pet,
            is_assistance_animal=assist,
        )
        result = cancel_trip_by_passenger(
            db=db,
            passenger_id=passenger_id,
            trip_id=str(trip.id),
            reason="changed_plans",
        )
        db.refresh(result)
        assert result.cancellation_fee == expected


def test_fixed_fee_independent_of_tolls_in_breakdown(db: Session) -> None:
    expected = float(money(CANCELLATION_FEE_EUR))
    trip, passenger_id, _ = _accepted_trip(
        db,
        estimated_price=12.0,
        price_breakdown={"tolls_amount": 5.0, "total": 12.0, "fare_subtotal": 7.0},
    )
    result = cancel_trip_by_passenger(
        db=db,
        passenger_id=passenger_id,
        trip_id=str(trip.id),
        reason="changed_plans",
    )
    db.refresh(result)
    assert result.cancellation_fee == expected
    assert Decimal(str(result.cancellation_fee)) == CANCELLATION_FEE_EUR


def test_driver_cancel_penalty_recorded(db: Session) -> None:
    """Driver cancel → driver penalty recorded (no passenger fee change)."""
    passenger_id, driver_id = _create_passenger_and_driver(db)
    trip = Trip(
        passenger_id=passenger_id,
        driver_id=driver_id,
        status=TripStatus.accepted,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=10.0,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    result = cancel_trip_by_driver(
        db=db,
        driver_id=driver_id,
        trip_id=str(trip.id),
        reason="emergency",
    )
    db.refresh(result)

    assert result.status == TripStatus.cancelled
    assert result.cancelled_by == "driver"
    assert result.cancellation_reason == "emergency"

    from sqlalchemy import select

    driver = db.execute(
        select(Driver).where(Driver.user_id == uuid.UUID(driver_id))
    ).scalar_one_or_none()
    assert driver is not None
    assert driver.cancellation_count >= 1
