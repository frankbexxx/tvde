import uuid
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user, get_db
from app.core.config import settings
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver, DriverLocation
from app.db.models.trip import Trip
from app.db.models.trip_offer import TripOffer
from app.db.models.user import User
from app.db.session import SessionLocal
from app.main import app
from app.models.enums import DriverStatus, Role, TripStatus, UserStatus


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
        partner_id=DEFAULT_PARTNER_UUID,
        user_id=user.id,
        status=DriverStatus.approved,
        documents=None,
        commission_percent=20.0,
    )
    db.add(driver)
    db.commit()
    return str(user.id)


def _create_passenger(db: Session) -> str:
    user = User(
        role=Role.passenger,
        name=f"Passenger Test {uuid.uuid4()}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(user)
    db.commit()
    return str(user.id)


def _create_requested_trip(
    db: Session,
    *,
    passenger_id: str,
    origin_lat: float,
    origin_lng: float,
    created_at: datetime,
) -> uuid.UUID:
    trip = Trip(
        passenger_id=uuid.UUID(passenger_id),
        status=TripStatus.requested,
        origin_lat=origin_lat,
        origin_lng=origin_lng,
        destination_lat=origin_lat + 0.01,
        destination_lng=origin_lng + 0.01,
        estimated_price=10.0,
        vehicle_category="x",
        distance_km=1.0,
        duration_min=5.0,
        final_price=None,
        created_at=created_at,
    )
    db.add(trip)
    db.commit()
    return trip.id


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


def test_post_driver_location_singular_path_alias() -> None:
    """POST /driver/location mirrors POST /drivers/location."""
    db = _make_db()
    driver_id = _create_driver(db)
    user_ctx = UserContext(user_id=driver_id, role=Role.driver)
    _override_dependencies(db, user_ctx)

    client = TestClient(app)
    now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    r = client.post(
        "/driver/location",
        json={"lat": 41.15, "lng": -8.61, "timestamp": now_ms},
    )
    assert r.status_code == 204

    loc = db.query(DriverLocation).filter(DriverLocation.driver_id == driver_id).one()
    assert float(loc.lat) == 41.15
    assert float(loc.lng) == -8.61

    _reset_overrides()
    db.close()


def test_location_redispatch_skips_older_unserviceable_zero_offer_trip(
    monkeypatch,
) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", False, raising=False)
    monkeypatch.setattr(settings, "GEO_RADIUS_KM", 50.0, raising=False)

    db = _make_db()
    driver_id = _create_driver(db)
    passenger_id = _create_passenger(db)
    remote_trip_id = _create_requested_trip(
        db,
        passenger_id=passenger_id,
        origin_lat=-89.0,
        origin_lng=0.0,
        created_at=datetime(2000, 1, 1, tzinfo=timezone.utc),
    )
    nearby_trip_id = _create_requested_trip(
        db,
        passenger_id=passenger_id,
        origin_lat=38.7,
        origin_lng=-9.1,
        created_at=datetime(2000, 1, 1, 0, 0, 1, tzinfo=timezone.utc),
    )
    user_ctx = UserContext(user_id=driver_id, role=Role.driver)
    _override_dependencies(db, user_ctx)

    client = TestClient(app)
    now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    response = client.post(
        "/drivers/location",
        json={"lat": 38.7, "lng": -9.1, "timestamp": now_ms},
    )

    assert response.status_code == 204
    remote_offers = (
        db.query(TripOffer).filter(TripOffer.trip_id == remote_trip_id).all()
    )
    nearby_offers = (
        db.query(TripOffer).filter(TripOffer.trip_id == nearby_trip_id).all()
    )
    assert remote_offers == []
    assert any(str(offer.driver_id) == driver_id for offer in nearby_offers)

    _reset_overrides()
    db.close()
