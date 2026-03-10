from datetime import datetime, timezone
import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user, get_db
from app.db.models.driver import Driver, DriverLocation
from app.db.models.user import User
from app.db.session import SessionLocal
from app.main import app
from app.models.enums import DriverStatus, Role, UserStatus


def _make_db() -> Session:
    return SessionLocal()


def _create_driver_with_location(db: Session, lat: float, lng: float) -> str:
    user = User(
        role=Role.driver,
        name=f"Driver Match {uuid.uuid4()}",
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
    )
    db.add(driver)
    db.flush()

    loc = DriverLocation(
        driver_id=user.id,
        lat=lat,
        lng=lng,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(loc)
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


def test_matching_no_drivers() -> None:
  db = _make_db()
  # passenger context
  user_ctx = UserContext(user_id=str(uuid.uuid4()), role=Role.passenger)
  _override_dependencies(db, user_ctx)
  client = TestClient(app)

  r = client.post("/matching/find-driver", json={"lat": 40.0, "lng": -8.0})
  assert r.status_code == 404

  _reset_overrides()
  db.close()


def test_matching_single_driver() -> None:
  db = _make_db()
  _create_driver_with_location(db, 40.0, -8.0)
  user_ctx = UserContext(user_id=str(uuid.uuid4()), role=Role.passenger)
  _override_dependencies(db, user_ctx)
  client = TestClient(app)

  r = client.post("/matching/find-driver", json={"lat": 40.0, "lng": -8.0})
  assert r.status_code == 200
  body = r.json()
  assert body["distance_km"] <= 0.1

  _reset_overrides()
  db.close()


def test_matching_multiple_drivers_returns_nearest() -> None:
  db = _make_db()
  _create_driver_with_location(db, 40.0, -8.0)      # near
  far_id = _create_driver_with_location(db, 41.0, -9.0)  # far

  user_ctx = UserContext(user_id=str(uuid.uuid4()), role=Role.passenger)
  _override_dependencies(db, user_ctx)
  client = TestClient(app)

  r = client.post("/matching/find-driver", json={"lat": 40.0, "lng": -8.0})
  assert r.status_code == 200
  body = r.json()
  assert body["distance_km"] < 5.0

  _reset_overrides()
  db.close()

