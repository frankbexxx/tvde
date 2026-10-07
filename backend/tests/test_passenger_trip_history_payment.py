"""Passenger trip history/detail — payment enrichment (no ops fields)."""

import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user, get_db
from app.db.models.passenger_payment_method import PassengerPaymentMethod
from app.db.models.payment import Payment
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal
from app.main import app
from app.models.enums import PaymentStatus, Role, TripStatus, UserStatus
from tests.support.unique_phone import unique_test_phone


def _db() -> Session:
    return SessionLocal()


def _passenger(db: Session) -> User:
    u = User(
        role=Role.passenger,
        name=f"P {uuid.uuid4().hex[:8]}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def _override(db: Session, user_id: uuid.UUID) -> None:
    async def _user() -> UserContext:
        return UserContext(user_id=str(user_id), role=Role.passenger)

    def _db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_current_user] = _user
    app.dependency_overrides[get_db] = _db


def _clear() -> None:
    app.dependency_overrides.clear()


def _completed_trip(
    db: Session,
    passenger_id: uuid.UUID,
    *,
    payment: Payment | None = None,
) -> Trip:
    trip = Trip(
        passenger_id=passenger_id,
        status=TripStatus.completed,
        origin_lat=38.694,
        origin_lng=-9.304,
        destination_lat=38.695,
        destination_lng=-9.303,
        estimated_price=4.5,
        final_price=4.5,
    )
    from datetime import datetime, timezone

    trip.completed_at = datetime.now(timezone.utc)
    db.add(trip)
    db.flush()
    if payment is not None:
        payment.trip_id = trip.id
        db.add(payment)
    db.commit()
    db.refresh(trip)
    return trip


def _payment(
    *,
    status: PaymentStatus,
    pm_id: str | None = "pm_test_123",
) -> Payment:
    return Payment(
        total_amount=4.5,
        commission_amount=0.5,
        driver_amount=4.0,
        driver_payout=4.0,
        currency="EUR",
        status=status,
        stripe_payment_intent_id=f"pi_{uuid.uuid4().hex}",
        stripe_payment_method_id=pm_id,
    )


def test_history_succeeded_shows_card_and_no_internal_fields() -> None:
    db = _db()
    try:
        user = _passenger(db)
        pay = _payment(status=PaymentStatus.succeeded)
        trip = _completed_trip(db, user.id, payment=pay)
        db.add(
            PassengerPaymentMethod(
                user_id=user.id,
                stripe_payment_method_id="pm_test_123",
                brand="visa",
                last4="4242",
                is_default=True,
            )
        )
        db.commit()
        _override(db, user.id)
        client = TestClient(app)
        r = client.get("/trips/history")
        assert r.status_code == 200
        row = next(x for x in r.json() if x["trip_id"] == str(trip.id))
        assert row["payment_status"] == "succeeded"
        assert row["payment_method_display"] == "Visa •••• 4242"
        assert row["payment_method_unavailable"] is False
        assert "commission_amount" not in row
        assert "driver_payout" not in row
        assert "stripe_payment_intent_id" not in row
    finally:
        _clear()
        db.close()


def test_history_processing_status() -> None:
    db = _db()
    try:
        user = _passenger(db)
        trip = _completed_trip(db, user.id, payment=_payment(status=PaymentStatus.processing))
        _override(db, user.id)
        row = next(x for x in TestClient(app).get("/trips/history").json() if x["trip_id"] == str(trip.id))
        assert row["payment_status"] == "processing"
    finally:
        _clear()
        db.close()


def test_history_failed_status() -> None:
    db = _db()
    try:
        user = _passenger(db)
        trip = _completed_trip(db, user.id, payment=_payment(status=PaymentStatus.failed))
        _override(db, user.id)
        row = next(x for x in TestClient(app).get("/trips/history").json() if x["trip_id"] == str(trip.id))
        assert row["payment_status"] == "failed"
    finally:
        _clear()
        db.close()


def test_history_without_payment() -> None:
    db = _db()
    try:
        user = _passenger(db)
        trip = _completed_trip(db, user.id, payment=None)
        _override(db, user.id)
        row = next(x for x in TestClient(app).get("/trips/history").json() if x["trip_id"] == str(trip.id))
        assert row["payment_status"] is None
        assert row["payment_method_display"] is None
        assert row["payment_method_unavailable"] is False
    finally:
        _clear()
        db.close()


def test_detail_method_deleted_from_wallet() -> None:
    db = _db()
    try:
        user = _passenger(db)
        pay = _payment(status=PaymentStatus.succeeded, pm_id="pm_gone")
        trip = _completed_trip(db, user.id, payment=pay)
        _override(db, user.id)
        r = TestClient(app).get(f"/trips/{trip.id}")
        assert r.status_code == 200
        body = r.json()
        assert body["payment_method_display"] is None
        assert body["payment_method_unavailable"] is True
        assert "commission_amount" not in body
        assert "stripe_payment_intent_id" not in body
    finally:
        _clear()
        db.close()


def test_detail_pending_without_pm_id() -> None:
    db = _db()
    try:
        user = _passenger(db)
        pay = _payment(status=PaymentStatus.pending, pm_id=None)
        trip = _completed_trip(db, user.id, payment=pay)
        _override(db, user.id)
        body = TestClient(app).get(f"/trips/{trip.id}").json()
        assert body["payment_status"] == "pending"
        assert body["payment_method_unavailable"] is False
        assert body["payment_method_display"] is None
    finally:
        _clear()
        db.close()
