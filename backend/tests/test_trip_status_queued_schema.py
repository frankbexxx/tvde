"""B2-SPIKE-BE-1 — schema/state-machine for TripStatus.queued (inert; no runtime writers)."""

from __future__ import annotations

import re
import uuid
from pathlib import Path

import pytest
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal, engine
from app.models.enums import DriverStatus, Role, TripStatus, UserStatus
from app.utils.state_machine import validate_trip_transition

_APP_ROOT = Path(__file__).resolve().parents[1] / "app"


def test_trip_status_queued_value() -> None:
    assert TripStatus.queued.value == "queued"


def test_requested_to_queued_allowed() -> None:
    validate_trip_transition(TripStatus.requested, TripStatus.queued)


def test_queued_to_accepted_allowed() -> None:
    validate_trip_transition(TripStatus.queued, TripStatus.accepted)


def test_queued_to_cancelled_allowed() -> None:
    validate_trip_transition(TripStatus.queued, TripStatus.cancelled)


def test_queued_to_ongoing_forbidden() -> None:
    with pytest.raises(HTTPException) as exc:
        validate_trip_transition(TripStatus.queued, TripStatus.ongoing)
    assert exc.value.status_code == 409
    assert exc.value.detail == "invalid_trip_state_transition"


def test_assigned_to_queued_forbidden() -> None:
    with pytest.raises(HTTPException) as exc:
        validate_trip_transition(TripStatus.assigned, TripStatus.queued)
    assert exc.value.status_code == 409
    assert exc.value.detail == "invalid_trip_state_transition"


def test_classic_flow_still_valid() -> None:
    validate_trip_transition(TripStatus.requested, TripStatus.assigned)
    validate_trip_transition(TripStatus.assigned, TripStatus.accepted)
    validate_trip_transition(TripStatus.accepted, TripStatus.arriving)
    validate_trip_transition(TripStatus.arriving, TripStatus.ongoing)
    validate_trip_transition(TripStatus.ongoing, TripStatus.completed)
    validate_trip_transition(TripStatus.ongoing, TripStatus.cancelled)
    validate_trip_transition(TripStatus.ongoing, TripStatus.failed)


def test_zero_runtime_writers_for_queued() -> None:
    """No service/router assigns TripStatus.queued (declarations in enums/SM only)."""
    write_patterns = (
        re.compile(r"\.status\s*=\s*TripStatus\.queued\b"),
        re.compile(r"status\s*=\s*TripStatus\.queued\b"),
        re.compile(r"""status\s*=\s*['\"]queued['\"]"""),
    )
    allowed_relative = {
        Path("models") / "enums.py",
        Path("utils") / "state_machine.py",
    }
    offenders: list[str] = []
    for path in _APP_ROOT.rglob("*.py"):
        rel = path.relative_to(_APP_ROOT)
        if rel in allowed_relative:
            continue
        text_src = path.read_text(encoding="utf-8")
        for pat in write_patterns:
            if pat.search(text_src):
                offenders.append(str(rel).replace("\\", "/"))
                break
    assert offenders == [], f"unexpected queued writers: {offenders}"


@pytest.fixture(scope="module")
def _require_postgres_queued_schema() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            row = conn.execute(
                text(
                    "SELECT 1 FROM pg_enum e "
                    "JOIN pg_type t ON e.enumtypid = t.oid "
                    "WHERE t.typname = 'trip_status_enum' AND e.enumlabel = 'queued'"
                )
            ).first()
            if row is None:
                pytest.skip(
                    "Migration c2d3e4f5a6b7 (queued) not applied on this database"
                )
            idx = conn.execute(
                text(
                    "SELECT 1 FROM pg_indexes "
                    "WHERE indexname = 'uq_trips_one_queued_per_driver'"
                )
            ).first()
            if idx is None:
                pytest.skip(
                    "Index uq_trips_one_queued_per_driver not present on this database"
                )
    except Exception as exc:
        pytest.skip(f"PostgreSQL requerido: {exc}")


def _seed_driver_and_passengers(db: Session) -> tuple[uuid.UUID, uuid.UUID, uuid.UUID]:
    p1 = User(
        role=Role.passenger,
        name=f"Queued pax1 {uuid.uuid4().hex[:6]}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    p2 = User(
        role=Role.passenger,
        name=f"Queued pax2 {uuid.uuid4().hex[:6]}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    driver_user = User(
        role=Role.driver,
        name=f"Queued drv {uuid.uuid4().hex[:6]}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add_all([p1, p2, driver_user])
    db.flush()
    db.add(
        Driver(
            partner_id=DEFAULT_PARTNER_UUID,
            user_id=driver_user.id,
            status=DriverStatus.approved,
            commission_percent=15.0,
        )
    )
    db.flush()
    return p1.id, p2.id, driver_user.id


def test_unique_partial_index_one_queued_per_driver(
    _require_postgres_queued_schema: None,
) -> None:
    """Two trips queued for the same driver must violate uq_trips_one_queued_per_driver."""
    db = SessionLocal()
    try:
        p1_id, p2_id, driver_id = _seed_driver_and_passengers(db)
        t1 = Trip(
            passenger_id=p1_id,
            driver_id=driver_id,
            status=TripStatus.queued,
            origin_lat=38.7,
            origin_lng=-9.1,
            destination_lat=38.8,
            destination_lng=-9.2,
            estimated_price=10.0,
            distance_km=3.0,
            duration_min=10.0,
        )
        db.add(t1)
        db.commit()

        t2 = Trip(
            passenger_id=p2_id,
            driver_id=driver_id,
            status=TripStatus.queued,
            origin_lat=38.71,
            origin_lng=-9.11,
            destination_lat=38.81,
            destination_lng=-9.21,
            estimated_price=11.0,
            distance_km=3.5,
            duration_min=12.0,
        )
        db.add(t2)
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()
    finally:
        db.close()


def test_queued_without_driver_not_constrained_by_partial_index(
    _require_postgres_queued_schema: None,
) -> None:
    """Partial index excludes driver_id IS NULL — two null-driver queued rows OK."""
    db = SessionLocal()
    try:
        p1 = User(
            role=Role.passenger,
            name=f"Queued null1 {uuid.uuid4().hex[:6]}",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        p2 = User(
            role=Role.passenger,
            name=f"Queued null2 {uuid.uuid4().hex[:6]}",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        db.add_all([p1, p2])
        db.flush()
        for pid in (p1.id, p2.id):
            db.add(
                Trip(
                    passenger_id=pid,
                    driver_id=None,
                    status=TripStatus.queued,
                    origin_lat=38.7,
                    origin_lng=-9.1,
                    destination_lat=38.8,
                    destination_lng=-9.2,
                    estimated_price=5.0,
                )
            )
        db.commit()
    finally:
        db.close()
