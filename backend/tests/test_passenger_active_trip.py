"""PASSENGER-REQUEST-TIMEOUT-UX-1: GET /trips/active bootstrap."""

import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user, get_db
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal
from app.main import app
from app.models.enums import Role, TripStatus, UserStatus


def _make_db() -> Session:
    return SessionLocal()


def _create_passenger(db: Session) -> str:
    user = User(
        role=Role.passenger,
        name=f"Passenger Active {uuid.uuid4()}",
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


def _add_trip(db: Session, passenger_id: str, status: TripStatus) -> Trip:
    trip = Trip(
        passenger_id=uuid.UUID(passenger_id),
        driver_id=None,
        status=status,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=10.0,
        vehicle_category="x",
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


def test_passenger_active_trip_returns_requested() -> None:
    db = _make_db()
    passenger_id = _create_passenger(db)
    trip = _add_trip(db, passenger_id, TripStatus.requested)
    _override_dependencies(db, UserContext(user_id=passenger_id, role=Role.passenger))

    client = TestClient(app)
    r = client.get("/trips/active")

    assert r.status_code == 200
    body = r.json()
    assert body["trip_id"] == str(trip.id)
    assert body["status"] == "requested"

    _reset_overrides()
    db.close()


def test_passenger_active_trip_returns_null_when_only_completed() -> None:
    db = _make_db()
    passenger_id = _create_passenger(db)
    _add_trip(db, passenger_id, TripStatus.completed)
    _override_dependencies(db, UserContext(user_id=passenger_id, role=Role.passenger))

    client = TestClient(app)
    r = client.get("/trips/active")

    assert r.status_code == 200
    assert r.json() is None

    _reset_overrides()
    db.close()


def test_passenger_active_trip_prefers_newest_non_terminal() -> None:
    db = _make_db()
    passenger_id = _create_passenger(db)
    old = _add_trip(db, passenger_id, TripStatus.cancelled)
    active = _add_trip(db, passenger_id, TripStatus.accepted)
    assert str(active.id) != str(old.id)
    _override_dependencies(db, UserContext(user_id=passenger_id, role=Role.passenger))

    client = TestClient(app)
    r = client.get("/trips/active")

    assert r.status_code == 200
    body = r.json()
    assert body["trip_id"] == str(active.id)
    assert body["status"] == "accepted"

    _reset_overrides()
    db.close()


def test_passenger_active_trip_does_not_return_other_passenger_trip() -> None:
    db = _make_db()
    owner_id = _create_passenger(db)
    other_id = _create_passenger(db)
    _add_trip(db, owner_id, TripStatus.ongoing)
    _override_dependencies(db, UserContext(user_id=other_id, role=Role.passenger))

    client = TestClient(app)
    r = client.get("/trips/active")

    assert r.status_code == 200
    assert r.json() is None

    _reset_overrides()
    db.close()
