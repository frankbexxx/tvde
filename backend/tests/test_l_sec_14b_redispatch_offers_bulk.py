"""L-SEC-14B: redispatch bulk-loads TripOffer (no per-trip SELECT).

Before: expire SELECT + T per-trip offer SELECTs ≈ 1+T for the offers pattern.
After: expire SELECT + one ``trip_id IN (...)`` bulk SELECT ≈ 1+1 for that pattern.
Driver-pool scans and per-candidate pending checks are intentionally unchanged.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import event, select, text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver, DriverLocation
from app.db.models.trip import Trip
from app.db.models.trip_offer import TripOffer
from app.db.models.user import User
from app.db.session import SessionLocal, engine
from app.models.enums import DriverStatus, OfferStatus, Role, TripStatus, UserStatus
from app.services.offer_dispatch import redispatch_expired_trips
from tests.support.unique_phone import unique_test_phone


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL requerido: {exc}")


def _db() -> Session:
    return SessionLocal()


def _driver_near(db: Session, *, lat: float = 38.7, lng: float = -9.1) -> uuid.UUID:
    u = User(
        role=Role.driver,
        name=f"D {uuid.uuid4().hex[:6]}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add(u)
    db.flush()
    db.add(
        Driver(
            partner_id=DEFAULT_PARTNER_UUID,
            user_id=u.id,
            status=DriverStatus.approved,
            commission_percent=15.0,
            is_available=True,
        )
    )
    db.add(
        DriverLocation(
            driver_id=u.id,
            lat=lat,
            lng=lng,
            timestamp=datetime.now(timezone.utc),
        )
    )
    db.flush()
    return u.id


def _requested_trip(db: Session, *, origin_lat: float = 38.7) -> Trip:
    pax = User(
        role=Role.passenger,
        name=f"P {uuid.uuid4().hex[:6]}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add(pax)
    db.flush()
    trip = Trip(
        passenger_id=pax.id,
        status=TripStatus.requested,
        origin_lat=origin_lat,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=10.0,
    )
    db.add(trip)
    db.flush()
    return trip


def test_a_bulk_offer_load_at_most_one_in_query() -> None:
    """T requested trips → offer history via one bulk IN; no per-trip history SELECT.

    Before L-SEC-14B: expire SELECT + T× ``WHERE trip_id = :id`` history loads.
    After: expire SELECT + one ``WHERE trip_id IN (...)``.
    Residual (allowed): per-candidate pending checks and PK refreshes.
    """
    db = _db()
    try:
        t_count = 3
        for i in range(t_count):
            _driver_near(db, lat=38.72 + i * 0.001, lng=-9.12)
        for i in range(t_count):
            trip = _requested_trip(db)
            d_id = _driver_near(db, lat=38.73 + i * 0.002, lng=-9.13)
            db.add(
                TripOffer(
                    trip_id=trip.id,
                    driver_id=d_id,
                    status=OfferStatus.expired,
                    expires_at=datetime.now(timezone.utc) - timedelta(seconds=30),
                )
            )
        db.commit()

        bind = db.get_bind()
        bulk_loads = 0
        per_trip_history_loads = 0

        def _before(_conn, _cursor, statement, _parameters, _context, _executemany):
            nonlocal bulk_loads, per_trip_history_loads
            s = " ".join(str(statement).lower().split())
            if "from trip_offers" not in s or not s.lstrip().startswith("select"):
                return
            # PK refresh after flush/commit
            if "trip_offers.id =" in s or "trip_offers.id=" in s:
                return
            # Per-candidate pending check (trip_id + driver_id + expires_at >)
            if "driver_id" in s and "expires_at >" in s:
                return
            # expire_stale_offers: status + expires_at < (no trip_id filter)
            if "expires_at <" in s and "trip_id" not in s:
                return
            if "trip_id in (" in s or "trip_id in(" in s:
                bulk_loads += 1
                return
            # Classic N+1: single-trip history load (equality, not IN)
            if ("trip_id =" in s or "trip_id=" in s) and "driver_id" not in s:
                per_trip_history_loads += 1

        event.listen(bind, "before_cursor_execute", _before)
        try:
            redispatch_expired_trips(db)
        finally:
            event.remove(bind, "before_cursor_execute", _before)

        assert bulk_loads == 1, f"expected exactly 1 bulk IN offers load, got {bulk_loads}"
        assert per_trip_history_loads == 0, (
            f"expected 0 per-trip offer history SELECTs (had {per_trip_history_loads}); "
            f"classic N+1 would be ≈{t_count}"
        )
    finally:
        db.close()


def test_b_zero_offer_recovery_and_throttle() -> None:
    db = _db()
    try:
        _driver_near(db)
        trip = _requested_trip(db)
        trip.last_dispatch_at = datetime.now(timezone.utc)
        db.commit()
        trip_id = trip.id

        # Shared DB may redispatch other requested trips; assert only this trip.
        created = redispatch_expired_trips(db)
        assert all(o.trip_id != trip_id for o in created)
        assert (
            len(
                db.execute(select(TripOffer).where(TripOffer.trip_id == trip_id))
                .scalars()
                .all()
            )
            == 0
        )

        trip = db.execute(select(Trip).where(Trip.id == trip_id)).scalar_one()
        trip.last_dispatch_at = datetime.now(timezone.utc) - timedelta(
            seconds=settings.REDISPATCH_MIN_INTERVAL_SECONDS + 2
        )
        db.commit()
        created2 = redispatch_expired_trips(db)
        ours = [o for o in created2 if o.trip_id == trip_id]
        assert len(ours) >= 1
    finally:
        db.close()


def test_c_expired_redispatch_excludes_prior_drivers() -> None:
    db = _db()
    try:
        excluded = _driver_near(db, lat=38.7001, lng=-9.1001)
        other = _driver_near(db, lat=38.7002, lng=-9.1002)
        trip = _requested_trip(db)
        db.add(
            TripOffer(
                trip_id=trip.id,
                driver_id=excluded,
                status=OfferStatus.expired,
                expires_at=datetime.now(timezone.utc) - timedelta(seconds=10),
            )
        )
        db.commit()
        trip_id = trip.id

        new_offers = redispatch_expired_trips(db)
        ours = [o for o in new_offers if o.trip_id == trip_id]
        assert len(ours) >= 1
        assert all(o.driver_id != excluded for o in ours)
        assert any(o.driver_id == other for o in ours) or any(
            o.driver_id != excluded for o in ours
        )
    finally:
        db.close()


def test_d_pending_offer_skips_redispatch() -> None:
    db = _db()
    try:
        d_id = _driver_near(db)
        trip = _requested_trip(db)
        db.add(
            TripOffer(
                trip_id=trip.id,
                driver_id=d_id,
                status=OfferStatus.pending,
                expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
            )
        )
        db.commit()
        n_before = len(
            db.execute(select(TripOffer).where(TripOffer.trip_id == trip.id))
            .scalars()
            .all()
        )

        new_offers = redispatch_expired_trips(db)
        for o in new_offers:
            assert o.trip_id != trip.id

        after = (
            db.execute(select(TripOffer).where(TripOffer.trip_id == trip.id))
            .scalars()
            .all()
        )
        assert len(after) == n_before
    finally:
        db.close()
