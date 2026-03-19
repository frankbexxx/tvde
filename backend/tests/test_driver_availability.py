"""Tests for driver availability (A001)."""
import uuid

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user, get_db
from app.db.base import Base
from app.db.models.driver import Driver
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.enums import DriverStatus, Role, TripStatus, UserStatus


Base.metadata.create_all(bind=engine)


def _make_db() -> Session:
    return SessionLocal()


def _create_driver(db: Session, is_available: bool = True) -> str:
    user = User(
        role=Role.driver,
        name=f"Driver Avail {uuid.uuid4()}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(user)
    db.flush()

    driver = Driver(
        user_id=user.id,
        status=DriverStatus.approved,
        documents=None,
        commission_percent=20.0,
        is_available=is_available,
    )
    db.add(driver)
    db.commit()
    return str(user.id)


def _create_passenger(db: Session) -> str:
    user = User(
        role=Role.passenger,
        name=f"Passenger {uuid.uuid4()}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(user)
    db.commit()
    return str(user.id)


def _override_dependencies(db: Session, user_ctx: UserContext) -> None:
    async def override_get_current_user() -> UserContext:
        return user_ctx

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_db] = override_get_db


def _reset_overrides() -> None:
    app.dependency_overrides.clear()


def test_da_001_driver_goes_online() -> None:
    """TEST-DA-001: driver goes online."""
    db = _make_db()
    driver_id = _create_driver(db, is_available=False)
    user_ctx = UserContext(user_id=driver_id, role=Role.driver)
    _override_dependencies(db, user_ctx)

    client = TestClient(app)
    r = client.post("/driver/status/online")

    assert r.status_code == 200
    assert r.json()["is_available"] is True

    driver = db.execute(select(Driver).where(Driver.user_id == uuid.UUID(driver_id))).scalar_one()
    assert driver.is_available is True

    _reset_overrides()
    db.close()


def test_da_002_driver_goes_offline() -> None:
    """TEST-DA-002: driver goes offline."""
    db = _make_db()
    driver_id = _create_driver(db, is_available=True)
    user_ctx = UserContext(user_id=driver_id, role=Role.driver)
    _override_dependencies(db, user_ctx)

    client = TestClient(app)
    r = client.post("/driver/status/offline")

    assert r.status_code == 200
    assert r.json()["is_available"] is False

    driver = db.execute(select(Driver).where(Driver.user_id == uuid.UUID(driver_id))).scalar_one()
    assert driver.is_available is False

    _reset_overrides()
    db.close()


def test_da_003_offline_driver_not_eligible_for_dispatch() -> None:
    """TEST-DA-003: offline driver not included in dispatch candidates."""
    db = _make_db()
    _ = _create_driver(db, is_available=False)
    passenger_id = _create_passenger(db)
    # Ensure no driver is available (isolation: other tests may have left drivers online)
    for d in db.execute(select(Driver)).scalars().all():
        d.is_available = False
    db.commit()
    user_ctx = UserContext(user_id=passenger_id, role=Role.passenger)
    _override_dependencies(db, user_ctx)

    client = TestClient(app)
    r = client.post(
        "/trips",
        json={
            "origin_lat": 38.7,
            "origin_lng": -9.1,
            "destination_lat": 38.8,
            "destination_lng": -9.2,
        },
    )

    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "requested"
    assert "trip_id" in body

    trip_id = body["trip_id"]
    trip = db.execute(select(Trip).where(Trip.id == uuid.UUID(trip_id))).scalar_one()
    assert trip.status == TripStatus.requested
    assert trip.driver_id is None

    _reset_overrides()
    db.close()
