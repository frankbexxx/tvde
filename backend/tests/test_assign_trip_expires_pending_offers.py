"""Admin assign must not leave pending offers that block /trips/{id}/accept."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import text

from app.core.config import settings
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver
from app.db.models.partner import Partner
from app.db.models.trip import Trip
from app.db.models.trip_offer import TripOffer
from app.db.models.user import User
from app.db.session import SessionLocal, engine
from app.models.enums import (
    DriverStatus,
    OfferStatus,
    Role,
    TripStatus,
    UserStatus,
)
from app.services.trips import accept_trip, assign_trip


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL required: {exc}")


def _ensure_partner(db) -> uuid.UUID:
    pid = DEFAULT_PARTNER_UUID
    if db.get(Partner, pid) is None:
        db.add(Partner(id=pid, name="Default fleet (assign-offer test)"))
        db.flush()
    return pid


def test_assign_trip_expires_pending_offers_so_accept_trip_works(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", True)
    db = SessionLocal()
    try:
        partner_id = _ensure_partner(db)
        passenger = User(
            role=Role.passenger,
            name="Assign Offer Pax",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        driver_user = User(
            role=Role.driver,
            name="Assign Offer Driver",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        db.add_all([passenger, driver_user])
        db.flush()
        db.add(
            Driver(
                user_id=driver_user.id,
                partner_id=partner_id,
                status=DriverStatus.approved,
                commission_percent=15.0,
                is_available=True,
                vehicle_categories="x",
            )
        )
        trip = Trip(
            passenger_id=passenger.id,
            status=TripStatus.requested,
            origin_lat=38.72,
            origin_lng=-9.14,
            destination_lat=38.73,
            destination_lng=-9.13,
            estimated_price=10.0,
            vehicle_category="x",
        )
        db.add(trip)
        db.flush()
        offer = TripOffer(
            trip_id=trip.id,
            driver_id=driver_user.id,
            status=OfferStatus.pending,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        )
        db.add(offer)
        db.commit()
        trip_id = trip.id
        driver_id = driver_user.id
        offer_id = offer.id
    finally:
        db.close()

    db = SessionLocal()
    try:
        assigned = assign_trip(db=db, trip_id=str(trip_id))
        assert assigned.status == TripStatus.assigned
        offer_row = db.get(TripOffer, offer_id)
        assert offer_row is not None
        assert offer_row.status == OfferStatus.expired
    finally:
        db.close()

    db = SessionLocal()
    try:
        trip, _ = accept_trip(db=db, driver_id=str(driver_id), trip_id=str(trip_id))
        assert trip.status == TripStatus.accepted
        assert trip.driver_id == driver_id
    finally:
        db.close()
