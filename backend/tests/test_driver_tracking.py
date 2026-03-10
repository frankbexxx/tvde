from datetime import datetime, timezone
import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user, get_db
from app.db.models.driver import Driver, DriverLocation
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal
from app.main import app
from app.models.enums import DriverStatus, Role, TripStatus, UserStatus


def _make_db() -> Session:
    return SessionLocal()


def _create_passenger_and_trip(db: Session) -> tuple[str, str]:
    passenger = User(
        role=Role.passenger,
        name=f"Passenger Test {uuid.uuid4()}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(passenger)
    db.flush()

    trip = Trip(
        passenger_id=passenger.id,
        driver_id=None,
        status=TripStatus.requested,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=10.0,
    )
    db.add(trip)
    db.commit()
    return str(passenger.id), str(trip.id)


def _assign_driver_and_location(db: Session, trip_id: str) -> str:
    driver_user = User(
        role=Role.driver,
        name=f"Driver Track {uuid.uuid4()}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(driver_user)
    db.flush()

    driver = Driver(
        user_id=driver_user.id,
        status=DriverStatus.approved,
        documents=None,
        commission_percent=20.0,
    )
    db.add(driver)
    db.flush()

    trip = db.query(Trip).filter(Trip.id == trip_id).one()
    trip.driver_id = driver_user.id
    trip.status = TripStatus.accepted

    loc = DriverLocation(
        driver_id=driver_user.id,
        lat=40.0,
        lng=-8.0,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(loc)
    db.commit()
    return str(driver_user.id)


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


def test_get_driver_location_as_passenger() -> None:
  db = _make_db()
  passenger_id, trip_id = _create_passenger_and_trip(db)
  driver_id = _assign_driver_and_location(db, trip_id)

  user_ctx = UserContext(user_id=passenger_id, role=Role.passenger)
  _override_dependencies(db, user_ctx)
  client = TestClient(app)

  r = client.get(f"/trips/{trip_id}/driver-location")
  assert r.status_code == 200
  body = r.json()
  assert body["lat"] == 40.0
  assert body["lng"] == -8.0
  assert isinstance(body["timestamp"], int)

  _reset_overrides()
  db.close()


def test_get_driver_location_as_assigned_driver() -> None:
  db = _make_db()
  passenger_id, trip_id = _create_passenger_and_trip(db)
  driver_id = _assign_driver_and_location(db, trip_id)

  user_ctx = UserContext(user_id=driver_id, role=Role.driver)
  _override_dependencies(db, user_ctx)
  client = TestClient(app)

  r = client.get(f"/trips/{trip_id}/driver-location")
  assert r.status_code == 200

  _reset_overrides()
  db.close()


def test_get_driver_location_forbidden_for_other_passenger() -> None:
  db = _make_db()
  passenger_id, trip_id = _create_passenger_and_trip(db)
  driver_id = _assign_driver_and_location(db, trip_id)

  other_passenger = User(
    email=f"passenger_other_{uuid.uuid4()}@example.com",
    hashed_password="x",
    role=Role.passenger,
    status=UserStatus.active,
  )
  db.add(other_passenger)
  db.commit()

  user_ctx = UserContext(user_id=str(other_passenger.id), role=Role.passenger)
  _override_dependencies(db, user_ctx)
  client = TestClient(app)

  r = client.get(f"/trips/{trip_id}/driver-location")
  assert r.status_code == 403

  _reset_overrides()
  db.close()


def test_get_driver_location_invalid_trip_id() -> None:
  db = _make_db()
  passenger_id, trip_id = _create_passenger_and_trip(db)

  user_ctx = UserContext(user_id=passenger_id, role=Role.passenger)
  _override_dependencies(db, user_ctx)
  client = TestClient(app)

  r = client.get("/trips/00000000-0000-0000-0000-000000000000/driver-location")
  assert r.status_code == 404

  _reset_overrides()
  db.close()

