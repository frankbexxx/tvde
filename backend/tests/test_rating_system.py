"""C001: Rating system tests."""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.driver import Driver
from app.db.models.trip import Trip
from app.db.models.user import User
from app.models.enums import DriverStatus, Role, TripStatus, UserStatus
from app.services.trips import rate_trip_as_driver, rate_trip_as_passenger


def _create_passenger_driver_and_completed_trip(db: Session) -> tuple[str, str, str]:
    """Create passenger, driver, and a completed trip."""
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
    trip = Trip(
        passenger_id=p.id,
        driver_id=d.id,
        status=TripStatus.completed,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=10.0,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return str(p.id), str(d.id), str(trip.id)


def test_passenger_rates_driver(db: Session) -> None:
    """TEST-RAT-001: Passenger rates driver — rating stored."""
    passenger_id, driver_id, trip_id = _create_passenger_driver_and_completed_trip(db)

    result = rate_trip_as_passenger(
        db=db,
        passenger_id=passenger_id,
        trip_id=trip_id,
        rating=5,
    )
    db.refresh(result)

    assert result.driver_rating == 5


def test_driver_rates_passenger(db: Session) -> None:
    """TEST-RAT-002: Driver rates passenger — rating stored."""
    passenger_id, driver_id, trip_id = _create_passenger_driver_and_completed_trip(db)

    result = rate_trip_as_driver(
        db=db,
        driver_id=driver_id,
        trip_id=trip_id,
        rating=4,
    )
    db.refresh(result)

    assert result.passenger_rating == 4


def test_rating_average_updated(db: Session) -> None:
    """TEST-RAT-003: Driver avg_rating updated when passenger rates."""
    passenger_id, driver_id, trip_id = _create_passenger_driver_and_completed_trip(db)

    rate_trip_as_passenger(
        db=db,
        passenger_id=passenger_id,
        trip_id=trip_id,
        rating=5,
    )

    driver = db.execute(
        select(Driver).where(Driver.user_id == uuid.UUID(driver_id))
    ).scalar_one_or_none()
    assert driver is not None
    assert driver.avg_rating == 5.0


def test_passenger_avg_rating_updated(db: Session) -> None:
    """C001: Passenger avg_rating_as_passenger updated when driver rates."""
    passenger_id, driver_id, trip_id = _create_passenger_driver_and_completed_trip(db)

    rate_trip_as_driver(
        db=db,
        driver_id=driver_id,
        trip_id=trip_id,
        rating=4,
    )

    user = db.execute(
        select(User).where(User.id == uuid.UUID(passenger_id))
    ).scalar_one_or_none()
    assert user is not None
    assert user.avg_rating_as_passenger == 4.0
