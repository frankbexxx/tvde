import uuid
from datetime import datetime, timedelta, timezone

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


def _create_driver(db: Session) -> str:
    user = User(
        role=Role.driver,
        name=f"Driver Test {uuid.uuid4()}",
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


def test_post_driver_location_valid_update() -> None:
    db = _make_db()
    driver_id = _create_driver(db)
    user_ctx = UserContext(user_id=driver_id, role=Role.driver)
    _override_dependencies(db, user_ctx)

    client = TestClient(app)
    now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    r = client.post(
        "/drivers/location",
        json={"lat": 40.0, "lng": -8.0, "timestamp": now_ms},
    )
    assert r.status_code == 204

    loc = db.query(DriverLocation).filter(DriverLocation.driver_id == driver_id).one()
    assert float(loc.lat) == 40.0
    assert float(loc.lng) == -8.0

    _reset_overrides()
    db.close()


def test_post_driver_location_invalid_latitude() -> None:
    db = _make_db()
    driver_id = _create_driver(db)
    user_ctx = UserContext(user_id=driver_id, role=Role.driver)
    _override_dependencies(db, user_ctx)

    client = TestClient(app)
    now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    r = client.post(
        "/drivers/location",
        json={"lat": 100.0, "lng": -8.0, "timestamp": now_ms},
    )
    # Pydantic schema validation will reject this as 422 (before service validation).
    assert r.status_code == 422

    _reset_overrides()
    db.close()


def test_post_driver_location_invalid_longitude() -> None:
    db = _make_db()
    driver_id = _create_driver(db)
    user_ctx = UserContext(user_id=driver_id, role=Role.driver)
    _override_dependencies(db, user_ctx)

    client = TestClient(app)
    now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    r = client.post(
        "/drivers/location",
        json={"lat": 40.0, "lng": -200.0, "timestamp": now_ms},
    )
    # Pydantic schema validation will reject this as 422 (before service validation).
    assert r.status_code == 422

    _reset_overrides()
    db.close()


def test_post_driver_location_invalid_timestamp() -> None:
    db = _make_db()
    driver_id = _create_driver(db)
    user_ctx = UserContext(user_id=driver_id, role=Role.driver)
    _override_dependencies(db, user_ctx)

    client = TestClient(app)
    too_old = datetime.now(timezone.utc) - timedelta(hours=2)
    too_old_ms = int(too_old.timestamp() * 1000)
    r = client.post(
        "/drivers/location",
        json={"lat": 40.0, "lng": -8.0, "timestamp": too_old_ms},
    )
    assert r.status_code == 400

    _reset_overrides()
    db.close()
