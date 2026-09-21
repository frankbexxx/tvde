"""L-SEC-15: interaction logging uses an independent SessionLocal."""

from __future__ import annotations

import uuid
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select, text
from sqlalchemy.orm import object_session

from app.auth.security import create_access_token
from app.db.models.interaction_log import InteractionLog
from app.db.models.user import User
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.enums import Role, UserStatus
from app.services.interaction_logging import log_interaction
from tests.support.unique_phone import unique_test_phone


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL requerido: {exc}")


@pytest.fixture(autouse=True)
def _clear_overrides() -> None:
    yield
    app.dependency_overrides.clear()


def _count_logs(*, action: str, user_id: str) -> int:
    db = SessionLocal()
    try:
        return int(
            db.execute(
                select(func.count())
                .select_from(InteractionLog)
                .where(
                    InteractionLog.action == action,
                    InteractionLog.user_id == user_id,
                )
            ).scalar_one()
        )
    finally:
        db.close()


def test_log_interaction_does_not_commit_caller_dirty_state() -> None:
    """Test A: InteractionLog persists; caller dirty User does not."""
    caller = SessionLocal()
    marker = uuid.uuid4().hex  # fits InteractionLog.user_id String(36)
    phone = unique_test_phone()
    try:
        dirty = User(
            role=Role.passenger,
            name=f"Dirty {marker[:8]}",
            phone=phone,
            status=UserStatus.active,
        )
        caller.add(dirty)
        assert dirty in caller.new

        before = _count_logs(action="lsec15_iso_a", user_id=marker)
        log_interaction(
            db=caller,
            user_id=marker,
            role="passenger",
            action="lsec15_iso_a",
            trip_id=None,
            previous_state=None,
            new_state="requested",
            latency_ms=1,
            payment_status=None,
        )
        after = _count_logs(action="lsec15_iso_a", user_id=marker)
        assert after == before + 1

        # Caller Session still holds uncommitted User
        assert dirty in caller.new
        assert object_session(dirty) is caller

        verify = SessionLocal()
        try:
            persisted = verify.execute(
                select(User).where(User.phone == phone)
            ).scalar_one_or_none()
            assert persisted is None
        finally:
            verify.close()
    finally:
        caller.rollback()
        caller.close()


def test_log_interaction_failure_does_not_rollback_caller() -> None:
    """Test B: logging commit failure is swallowed; caller Session untouched."""
    caller = SessionLocal()
    marker = uuid.uuid4().hex
    phone = unique_test_phone()
    try:
        dirty = User(
            role=Role.passenger,
            name=f"DirtyFail {marker[:8]}",
            phone=phone,
            status=UserStatus.active,
        )
        caller.add(dirty)
        assert dirty in caller.new

        real_factory = SessionLocal

        def _failing_factory(*args, **kwargs):
            log_db = real_factory(*args, **kwargs)

            def _boom() -> None:
                raise RuntimeError("simulated_log_commit_failure")

            log_db.commit = _boom  # type: ignore[method-assign]
            return log_db

        with patch(
            "app.services.interaction_logging.SessionLocal",
            side_effect=_failing_factory,
        ):
            # Must not raise
            log_interaction(
                db=caller,
                user_id=marker,
                role="passenger",
                action="lsec15_iso_b",
                trip_id=None,
            )

        # Caller dirty state still present (no rollback of caller Session)
        assert dirty in caller.new
        assert object_session(dirty) is caller
        # Still mutable
        dirty.name = f"Still Dirty {marker[:8]}"
        assert dirty in caller.dirty or dirty in caller.new

        verify = SessionLocal()
        try:
            assert (
                verify.execute(select(User).where(User.phone == phone)).scalar_one_or_none()
                is None
            )
        finally:
            verify.close()
    finally:
        caller.rollback()
        caller.close()


def test_log_interaction_persists_expected_fields() -> None:
    """Test C: normal persistence via own session."""
    caller = SessionLocal()
    marker = uuid.uuid4().hex
    trip_id = str(uuid.uuid4())
    try:
        log_interaction(
            db=caller,
            user_id=marker,
            role="driver",
            action="lsec15_persist",
            trip_id=trip_id,
            previous_state="accepted",
            new_state="arriving",
            latency_ms=42,
            payment_status="processing",
        )
    finally:
        caller.close()

    verify = SessionLocal()
    try:
        row = verify.execute(
            select(InteractionLog)
            .where(
                InteractionLog.action == "lsec15_persist",
                InteractionLog.user_id == marker,
            )
            .order_by(InteractionLog.id.desc())
            .limit(1)
        ).scalar_one()
        assert row.role == "driver"
        assert row.trip_id == trip_id
        assert row.previous_state == "accepted"
        assert row.new_state == "arriving"
        assert row.latency_ms == 42
        assert row.payment_status == "processing"
    finally:
        verify.close()


def test_create_trip_writes_interaction_log() -> None:
    """Test D: real passenger create-trip path still records InteractionLog."""
    seed = SessionLocal()
    try:
        u = User(
            role=Role.passenger,
            name=f"LSec15 Pax {uuid.uuid4().hex[:8]}",
            phone=unique_test_phone(),
            status=UserStatus.active,
        )
        seed.add(u)
        seed.commit()
        seed.refresh(u)
        passenger_id = str(u.id)
        tok = create_access_token(subject=passenger_id, role=Role.passenger.value)[
            "token"
        ]
    finally:
        seed.close()

    before = _count_logs(action="request_trip", user_id=passenger_id)
    c = TestClient(app)
    r = c.post(
        "/trips",
        headers={"Authorization": f"Bearer {tok}"},
        json={
            "origin_lat": 38.7223,
            "origin_lng": -9.1393,
            "destination_lat": 38.7369,
            "destination_lng": -9.1427,
        },
    )
    assert r.status_code == 200, r.text
    trip_id = r.json()["trip_id"]
    after = _count_logs(action="request_trip", user_id=passenger_id)
    assert after == before + 1

    verify = SessionLocal()
    try:
        row = verify.execute(
            select(InteractionLog)
            .where(
                InteractionLog.action == "request_trip",
                InteractionLog.user_id == passenger_id,
                InteractionLog.trip_id == trip_id,
            )
            .order_by(InteractionLog.id.desc())
            .limit(1)
        ).scalar_one()
        assert row.role == "passenger"
        assert row.new_state is not None
    finally:
        verify.close()


def test_lifecycle_endpoint_still_ok() -> None:
    """Optional smoke: POST /logs/lifecycle."""
    c = TestClient(app)
    r = c.post("/logs/lifecycle", json={"action": "app_start"})
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
