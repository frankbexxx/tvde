"""L-TRIP-01: commit TripOffer before WS publish; GPS retry outside write TX."""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver, DriverLocation
from app.db.models.trip import Trip
from app.db.models.trip_offer import TripOffer
from app.db.models.user import User
from app.db.session import SessionLocal
from app.models.enums import DriverStatus, OfferStatus, Role, TripStatus, UserStatus
from app.schemas.trip import TripCreateRequest
from app.services import trips as trip_service
from app.services.offer_dispatch import create_offers_for_trip, publish_trip_offers
from tests.support.unique_phone import unique_test_phone


def _db() -> Session:
    return SessionLocal()


def _seed_driver_near_origin(db: Session) -> str:
    user = User(
        role=Role.driver,
        name=f"D {uuid.uuid4()}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add(user)
    db.flush()
    db.add(
        Driver(
            partner_id=DEFAULT_PARTNER_UUID,
            user_id=user.id,
            status=DriverStatus.approved,
            commission_percent=15.0,
            is_available=True,
        )
    )
    db.add(
        DriverLocation(
            driver_id=user.id,
            lat=38.701,
            lng=-9.101,
            timestamp=datetime.now(timezone.utc),
        )
    )
    db.commit()
    return str(user.id)


def _requested_trip(db: Session, passenger_id: str) -> Trip:
    trip = Trip(
        passenger_id=passenger_id,
        status=TripStatus.requested,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
        estimated_price=10.0,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


def test_publish_trip_offers_only_invokes_hub_after_explicit_call(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = _db()
    publish = MagicMock()
    monkeypatch.setattr(
        "app.realtime.driver_offers_hub.driver_offers_hub.publish_new_offer",
        publish,
    )
    passenger = User(
        role=Role.passenger,
        name=f"P {uuid.uuid4()}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add(passenger)
    db.flush()
    _seed_driver_near_origin(db)
    trip = _requested_trip(db, str(passenger.id))
    try:
        offers = create_offers_for_trip(db=db, trip=trip)
        assert len(offers) >= 1
        publish.assert_not_called()
        db.commit()
        publish_trip_offers(offers=offers, trip=trip)
        assert publish.call_count == len(offers)
    finally:
        db.close()


def test_create_trip_publishes_only_after_commit(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = _db()
    order: list[str] = []
    real_commit = db.commit

    def tracking_commit() -> None:
        order.append("commit")
        real_commit()

    def tracking_publish(**kwargs) -> None:  # type: ignore[no-untyped-def]
        order.append("publish")

    monkeypatch.setattr(db, "commit", tracking_commit)
    monkeypatch.setattr(trip_service, "publish_trip_offers", tracking_publish)
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    # Avoid long GPS retries in this unit path
    async def _no_sleep(_sec: float) -> None:
        return None

    monkeypatch.setattr(trip_service.asyncio, "sleep", _no_sleep)

    passenger = User(
        role=Role.passenger,
        name=f"P {uuid.uuid4()}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add(passenger)
    db.commit()
    _seed_driver_near_origin(db)
    payload = TripCreateRequest(
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
    )
    try:
        trip, _eta = asyncio.run(
            trip_service.create_trip(
                db=db, passenger_id=str(passenger.id), payload=payload
            )
        )
        assert trip.status == TripStatus.requested
        assert "publish" in order
        assert order.index("publish") > order.index("commit")
        # Last publish must follow a commit (offers durable)
        last_pub = max(i for i, x in enumerate(order) if x == "publish")
        last_commit_before = max(
            i for i, x in enumerate(order[:last_pub]) if x == "commit"
        )
        assert last_commit_before < last_pub
    finally:
        db.close()


def test_commit_failure_does_not_publish(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = _db()
    publish = MagicMock()
    monkeypatch.setattr(trip_service, "publish_trip_offers", publish)
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)

    async def _no_sleep(_sec: float) -> None:
        return None

    monkeypatch.setattr(trip_service.asyncio, "sleep", _no_sleep)

    passenger = User(
        role=Role.passenger,
        name=f"P {uuid.uuid4()}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add(passenger)
    db.commit()
    _seed_driver_near_origin(db)

    commits = {"n": 0}
    real_commit = db.commit

    def flaky_commit() -> None:
        commits["n"] += 1
        if commits["n"] >= 2:
            raise RuntimeError("commit_boom")
        real_commit()

    monkeypatch.setattr(db, "commit", flaky_commit)
    payload = TripCreateRequest(
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
    )
    try:
        with pytest.raises(RuntimeError, match="commit_boom"):
            asyncio.run(
                trip_service.create_trip(
                    db=db, passenger_id=str(passenger.id), payload=payload
                )
            )
        publish.assert_not_called()
    finally:
        db.close()


def test_ws_publish_failure_keeps_committed_offer(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = _db()
    monkeypatch.setattr(
        "app.realtime.driver_offers_hub.driver_offers_hub.publish_new_offer",
        MagicMock(side_effect=RuntimeError("ws_down")),
    )
    passenger = User(
        role=Role.passenger,
        name=f"P {uuid.uuid4()}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add(passenger)
    db.flush()
    _seed_driver_near_origin(db)
    trip = _requested_trip(db, str(passenger.id))
    try:
        offers = create_offers_for_trip(db=db, trip=trip)
        assert offers
        db.commit()
        offer_id = str(offers[0].id)
        publish_trip_offers(offers=offers, trip=trip)  # must not raise / rollback
        other = SessionLocal()
        try:
            found = other.execute(
                select(TripOffer).where(TripOffer.id == offer_id)
            ).scalar_one()
            assert found.status == OfferStatus.pending
        finally:
            other.close()
    finally:
        db.close()


def test_immediate_accept_sees_offer_in_new_session(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """After commit+publish, a new Session can load the pending offer (no ghost WS)."""
    db = _db()
    publish = MagicMock()
    monkeypatch.setattr(
        "app.realtime.driver_offers_hub.driver_offers_hub.publish_new_offer",
        publish,
    )
    passenger = User(
        role=Role.passenger,
        name=f"P {uuid.uuid4()}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add(passenger)
    db.flush()
    _seed_driver_near_origin(db)
    trip = _requested_trip(db, str(passenger.id))
    try:
        offers = create_offers_for_trip(db=db, trip=trip)
        assert offers
        offer_id = offers[0].id
        # Before commit, a *new* session must not see the offer (isolation).
        peek = SessionLocal()
        try:
            ghost = peek.execute(
                select(TripOffer).where(TripOffer.id == offer_id)
            ).scalar_one_or_none()
            assert ghost is None
        finally:
            peek.close()
        db.commit()
        publish_trip_offers(offers=offers, trip=trip)
        assert publish.call_count >= 1
        accept_session = SessionLocal()
        try:
            visible = accept_session.execute(
                select(TripOffer).where(TripOffer.id == offer_id)
            ).scalar_one()
            assert visible.status == OfferStatus.pending
            assert str(visible.trip_id) == str(trip.id)
            assert visible.driver_id is not None
        finally:
            accept_session.close()
    finally:
        db.close()


def test_zero_offers_retry_commits_before_sleep(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = _db()
    events: list[str] = []
    real_commit = db.commit

    def tracking_commit() -> None:
        events.append("commit")
        real_commit()

    async def tracking_sleep(sec: float) -> None:
        events.append(f"sleep:{sec}")

    def always_empty(*, db: Session, trip: Trip) -> list:
        trip.last_dispatch_at = datetime.now(timezone.utc)
        return []

    monkeypatch.setattr(db, "commit", tracking_commit)
    monkeypatch.setattr(trip_service.asyncio, "sleep", tracking_sleep)
    monkeypatch.setattr(trip_service, "create_offers_for_trip", always_empty)
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    passenger = User(
        role=Role.passenger,
        name=f"P {uuid.uuid4()}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add(passenger)
    db.commit()
    events.clear()
    payload = TripCreateRequest(
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.8,
        destination_lng=-9.2,
    )
    try:
        trip, _ = asyncio.run(
            trip_service.create_trip(
                db=db, passenger_id=str(passenger.id), payload=payload
            )
        )
        assert trip.status == TripStatus.requested
        sleeps = [e for e in events if e.startswith("sleep:")]
        assert len(sleeps) == 5
        # Every sleep must be preceded by a commit (no open write TX during wait)
        for i, e in enumerate(events):
            if e.startswith("sleep:"):
                assert "commit" in events[:i]
    finally:
        db.close()


def test_matching_multi_offer_invariants_unchanged(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = _db()
    monkeypatch.setattr(
        "app.realtime.driver_offers_hub.driver_offers_hub.publish_new_offer",
        MagicMock(),
    )
    passenger = User(
        role=Role.passenger,
        name=f"P {uuid.uuid4()}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add(passenger)
    db.flush()
    for _ in range(3):
        _seed_driver_near_origin(db)
    trip = _requested_trip(db, str(passenger.id))
    try:
        offers = create_offers_for_trip(db=db, trip=trip)
        db.commit()
        publish_trip_offers(offers=offers, trip=trip)
        assert 1 <= len(offers) <= getattr(settings, "OFFER_TOP_N", 5)
        assert all(o.status == OfferStatus.pending for o in offers)
        assert all(o.trip_id == trip.id for o in offers)
    finally:
        db.close()
