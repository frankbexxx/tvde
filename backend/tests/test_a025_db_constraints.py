"""
A025 — integridade BD: UNIQUE em payments.stripe_payment_intent_id.

Requer PostgreSQL e migração A025 aplicada na mesma base.
"""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models.payment import Payment
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal, engine
from app.models.enums import PaymentStatus, Role, TripStatus, UserStatus


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL requerido: {exc}")


def _create_user_trip_payment(
    db: Session, *, stripe_pi: str
) -> tuple[User, Trip, Payment]:
    u = User(
        role=Role.passenger,
        name=f"A025 {uuid.uuid4().hex[:6]}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(u)
    db.flush()
    trip = Trip(
        passenger_id=u.id,
        status=TripStatus.ongoing,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=10.0,
        distance_km=3.0,
        duration_min=10.0,
    )
    db.add(trip)
    db.flush()
    pay = Payment(
        trip_id=trip.id,
        total_amount=10.0,
        commission_amount=1.5,
        driver_amount=8.5,
        currency="EUR",
        status=PaymentStatus.processing,
        stripe_payment_intent_id=stripe_pi,
    )
    db.add(pay)
    db.commit()
    db.refresh(pay)
    db.refresh(trip)
    db.refresh(u)
    return u, trip, pay


def test_webhook_duplicate_pi_db_constraint() -> None:
    """Mesmo PI em dois pagamentos → IntegrityError (protege se app/webhook tentar duplicar)."""
    db = SessionLocal()
    pi = f"pi_a025_dup_{uuid.uuid4().hex[:16]}"
    try:
        _create_user_trip_payment(db, stripe_pi=pi)
        # mesmo PI noutra viagem → viola UNIQUE
        u2 = User(
            role=Role.passenger,
            name=f"A025b {uuid.uuid4().hex[:6]}",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        db.add(u2)
        db.flush()
        trip2 = Trip(
            passenger_id=u2.id,
            status=TripStatus.ongoing,
            origin_lat=38.7,
            origin_lng=-9.1,
            destination_lat=38.8,
            destination_lng=-9.2,
            estimated_price=10.0,
            distance_km=3.0,
            duration_min=10.0,
        )
        db.add(trip2)
        db.flush()
        dup = Payment(
            trip_id=trip2.id,
            total_amount=10.0,
            commission_amount=1.5,
            driver_amount=8.5,
            currency="EUR",
            status=PaymentStatus.processing,
            stripe_payment_intent_id=pi,
        )
        db.add(dup)
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()
    finally:
        db.close()


def test_multiple_null_payment_intents_allowed() -> None:
    """PostgreSQL: vários pagamentos com stripe_payment_intent_id NULL são válidos."""
    db = SessionLocal()
    try:
        for _ in range(2):
            u = User(
                role=Role.passenger,
                name=f"A025null {uuid.uuid4().hex[:6]}",
                phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
                status=UserStatus.active,
            )
            db.add(u)
            db.flush()
            trip = Trip(
                passenger_id=u.id,
                status=TripStatus.requested,
                origin_lat=38.7,
                origin_lng=-9.1,
                destination_lat=38.8,
                destination_lng=-9.2,
                estimated_price=5.0,
                distance_km=1.0,
                duration_min=5.0,
            )
            db.add(trip)
            db.flush()
            db.add(
                Payment(
                    trip_id=trip.id,
                    total_amount=5.0,
                    commission_amount=0.75,
                    driver_amount=4.25,
                    currency="EUR",
                    status=PaymentStatus.processing,
                    stripe_payment_intent_id=None,
                )
            )
        db.commit()
    finally:
        db.close()
