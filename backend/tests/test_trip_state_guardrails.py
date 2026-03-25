"""Tests for trip state guardrails (PROMPT_01)."""
import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_db, get_current_user
from app.db.models.driver import Driver
from app.db.models.payment import Payment
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal
from app.main import app
from app.models.enums import DriverStatus, PaymentStatus, Role, TripStatus, UserStatus


def _make_db() -> Session:
    return SessionLocal()


def _create_trip_in_accepted_state(db: Session) -> tuple[str, str]:
    """Create trip in accepted state (driver assigned, payment exists)."""
    passenger = User(
        role=Role.passenger,
        name=f"Passenger {uuid.uuid4()}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(passenger)
    db.flush()

    driver_user = User(
        role=Role.driver,
        name=f"Driver {uuid.uuid4()}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(driver_user)
    db.flush()

    driver = Driver(
        user_id=driver_user.id,
        status=DriverStatus.approved,
        commission_percent=15.0,
    )
    db.add(driver)
    db.flush()

    trip = Trip(
        passenger_id=passenger.id,
        driver_id=driver_user.id,
        status=TripStatus.accepted,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=10.0,
    )
    db.add(trip)
    db.flush()

    payment = Payment(
        trip_id=trip.id,
        total_amount=10.0,
        commission_amount=1.5,
        driver_amount=8.5,
        currency="EUR",
        status=PaymentStatus.processing,
        stripe_payment_intent_id=f"pi_test_guard_{uuid.uuid4().hex[:20]}",
    )
    db.add(payment)
    db.commit()
    return str(driver_user.id), str(trip.id)


def _override_deps(db: Session, user_id: str, role: Role) -> None:
    async def override_user() -> UserContext:
        return UserContext(user_id=user_id, role=role)

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[get_db] = override_get_db


def _reset_overrides() -> None:
    app.dependency_overrides.clear()


def test_complete_trip_from_accepted_returns_409() -> None:
    """Skipping states (accepted -> completed) must return HTTP 409."""
    db = _make_db()
    driver_id, trip_id = _create_trip_in_accepted_state(db)
    _override_deps(db, driver_id, Role.driver)
    client = TestClient(app)

    r = client.post(f"/driver/trips/{trip_id}/complete", json={"final_price": 10.0})
    assert r.status_code == 409
    assert r.json().get("detail") == "invalid_trip_state_transition"

    _reset_overrides()
    db.close()


def test_valid_flow_still_works() -> None:
    """Valid transitions (assigned -> accepted, etc.) must still work."""
    from app.services.trips import validate_trip_transition

    # Same-state is allowed
    validate_trip_transition(TripStatus.assigned, TripStatus.assigned)

    # Valid transitions
    validate_trip_transition(TripStatus.requested, TripStatus.assigned)
    validate_trip_transition(TripStatus.requested, TripStatus.cancelled)
    validate_trip_transition(TripStatus.assigned, TripStatus.accepted)
    validate_trip_transition(TripStatus.accepted, TripStatus.arriving)
    validate_trip_transition(TripStatus.arriving, TripStatus.ongoing)
    validate_trip_transition(TripStatus.ongoing, TripStatus.completed)
    validate_trip_transition(TripStatus.ongoing, TripStatus.failed)  # timeout rule
