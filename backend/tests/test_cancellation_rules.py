"""A005: Cancellation rules tests."""

import uuid

from sqlalchemy.orm import Session

from app.db.models.driver import Driver
from app.db.models.trip import Trip
from app.db.models.user import User
from app.models.enums import DriverStatus, Role, TripStatus, UserStatus
from app.services.trips import cancel_trip_by_driver, cancel_trip_by_passenger


def _create_passenger_and_driver(db: Session) -> tuple[str, str]:
    """Create passenger and driver users."""
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
        user_id=d.id,
        status=DriverStatus.approved,
        commission_percent=15.0,
        is_available=True,
    )
    db.add(driver)
    db.flush()
    return str(p.id), str(d.id)


def test_passenger_cancel_before_accept_no_fee(db: Session) -> None:
    """TEST-CAN-001: Passenger cancel before driver accept → no fee."""
    passenger_id, driver_id = _create_passenger_and_driver(db)
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


def test_passenger_cancel_after_accept_fee_applied(db: Session) -> None:
    """TEST-CAN-002: Passenger cancel after accept → cancellation fee applied."""
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

    result = cancel_trip_by_passenger(
        db=db,
        passenger_id=passenger_id,
        trip_id=str(trip.id),
        reason="changed_plans",
    )
    db.refresh(result)

    assert result.status == TripStatus.cancelled
    assert result.cancellation_fee is not None
    assert result.cancellation_fee > 0
    # Fee = max(1.50, 10.0 * 0.20) = 2.0 (variable by estimated_price)
    assert result.cancellation_fee == 2.0
    assert result.cancelled_by == "passenger"


def test_driver_cancel_penalty_recorded(db: Session) -> None:
    """TEST-CAN-003: Driver cancel → driver penalty recorded."""
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
