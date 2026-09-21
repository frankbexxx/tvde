"""L-SEC-14A: GET /partner/trips is capped; export remains unbounded historical path."""

from __future__ import annotations

import csv
import io
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.auth.security import create_access_token
from app.db.models.driver import Driver
from app.db.models.partner import Partner
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.enums import DriverStatus, Role, TripStatus, UserStatus
from app.services.partner_queries import (
    PARTNER_TRIP_LIST_LIMIT,
    list_trips_for_partner,
)
from tests.support.unique_phone import unique_test_phone


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL requerido: {exc}")


def _partner_token(db: Session, partner_id: uuid.UUID) -> str:
    mgr = User(
        role=Role.partner,
        name=f"Mgr {uuid.uuid4().hex[:6]}",
        phone=unique_test_phone(),
        status=UserStatus.active,
        partner_org_id=partner_id,
    )
    db.add(mgr)
    db.flush()
    return create_access_token(subject=str(mgr.id), role=Role.partner.value)["token"]


def _seed_partner_with_driver(db: Session) -> tuple[Partner, User, User, str]:
    partner = Partner(name=f"CapFleet {uuid.uuid4().hex[:6]}")
    db.add(partner)
    db.flush()
    driver_u = User(
        role=Role.driver,
        name=f"Drv {uuid.uuid4().hex[:6]}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    pax = User(
        role=Role.passenger,
        name=f"Pax {uuid.uuid4().hex[:6]}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add_all([driver_u, pax])
    db.flush()
    db.add(
        Driver(
            user_id=driver_u.id,
            partner_id=partner.id,
            status=DriverStatus.approved,
            commission_percent=15.0,
            is_available=True,
        )
    )
    db.flush()
    tok = _partner_token(db, partner.id)
    return partner, driver_u, pax, tok


def _bulk_trips(
    db: Session,
    *,
    partner_id: uuid.UUID,
    passenger_id: uuid.UUID,
    driver_id: uuid.UUID,
    n: int,
    base: datetime,
) -> list[Trip]:
    trips: list[Trip] = []
    for i in range(n):
        t = Trip(
            passenger_id=passenger_id,
            driver_id=driver_id,
            partner_id=partner_id,
            status=TripStatus.completed,
            origin_lat=38.7,
            origin_lng=-9.1,
            destination_lat=38.8,
            destination_lng=-9.2,
            estimated_price=10.0,
            final_price=10.0,
            created_at=base + timedelta(seconds=i),
        )
        trips.append(t)
    db.add_all(trips)
    db.flush()
    return trips


def test_a_tenant_isolation_preserved() -> None:
    db = SessionLocal()
    try:
        p_a, d_a, pax_a, tok_a = _seed_partner_with_driver(db)
        p_b, d_b, pax_b, tok_b = _seed_partner_with_driver(db)
        now = datetime.now(timezone.utc)
        _bulk_trips(
            db,
            partner_id=p_a.id,
            passenger_id=pax_a.id,
            driver_id=d_a.id,
            n=3,
            base=now,
        )
        trips_b = _bulk_trips(
            db,
            partner_id=p_b.id,
            passenger_id=pax_b.id,
            driver_id=d_b.id,
            n=2,
            base=now,
        )
        db.commit()
        trip_b_ids = {str(t.id) for t in trips_b}
    finally:
        db.close()

    client = TestClient(app)
    ra = client.get("/partner/trips", headers={"Authorization": f"Bearer {tok_a}"})
    rb = client.get("/partner/trips", headers={"Authorization": f"Bearer {tok_b}"})
    assert ra.status_code == 200
    assert rb.status_code == 200
    ids_a = {row["trip_id"] for row in ra.json()}
    ids_b = {row["trip_id"] for row in rb.json()}
    assert ids_a.isdisjoint(ids_b)
    assert trip_b_ids <= ids_b
    assert trip_b_ids.isdisjoint(ids_a)


def test_b_c_list_bound_and_newest_first() -> None:
    db = SessionLocal()
    try:
        partner, driver_u, pax, tok = _seed_partner_with_driver(db)
        partner_id = str(partner.id)
        n = PARTNER_TRIP_LIST_LIMIT + 5
        base = datetime(2024, 1, 1, tzinfo=timezone.utc)
        trips = _bulk_trips(
            db,
            partner_id=partner.id,
            passenger_id=pax.id,
            driver_id=driver_u.id,
            n=n,
            base=base,
        )
        db.commit()
        newest_ids = [str(t.id) for t in trips[-PARTNER_TRIP_LIST_LIMIT:]]
        newest_ids.reverse()  # created_at DESC → newest first
        oldest_excluded = {str(t.id) for t in trips[:5]}
    finally:
        db.close()

    client = TestClient(app)
    r = client.get("/partner/trips", headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 200
    body = r.json()
    assert len(body) == PARTNER_TRIP_LIST_LIMIT
    returned_ids = [row["trip_id"] for row in body]
    assert returned_ids == newest_ids
    assert oldest_excluded.isdisjoint(set(returned_ids))

    # Service helper respects explicit limit=None for unbounded reads.
    db = SessionLocal()
    try:
        unbounded = list_trips_for_partner(db, partner_id, limit=None)
        assert len(unbounded) >= n
    finally:
        db.close()


def test_d_export_unaffected_returns_full_history() -> None:
    db = SessionLocal()
    try:
        partner, driver_u, pax, tok = _seed_partner_with_driver(db)
        n = PARTNER_TRIP_LIST_LIMIT + 3
        base = datetime(2024, 6, 1, tzinfo=timezone.utc)
        trips = _bulk_trips(
            db,
            partner_id=partner.id,
            passenger_id=pax.id,
            driver_id=driver_u.id,
            n=n,
            base=base,
        )
        db.commit()
        all_ids = {str(t.id) for t in trips}
    finally:
        db.close()

    client = TestClient(app)
    h = {"Authorization": f"Bearer {tok}"}
    listed = client.get("/partner/trips", headers=h)
    assert listed.status_code == 200
    assert len(listed.json()) == PARTNER_TRIP_LIST_LIMIT

    rex = client.get("/partner/trips/export", headers=h)
    assert rex.status_code == 200
    rows = list(csv.reader(io.StringIO(rex.text)))
    data_ids = {row[0] for row in rows[1:]}
    assert all_ids <= data_ids
    assert len(data_ids) >= n


def test_e_auth_non_partner_forbidden() -> None:
    db = SessionLocal()
    try:
        pax = User(
            role=Role.passenger,
            name="PaxAuth",
            phone=unique_test_phone(),
            status=UserStatus.active,
        )
        db.add(pax)
        db.commit()
        tok = create_access_token(subject=str(pax.id), role=Role.passenger.value)[
            "token"
        ]
    finally:
        db.close()

    client = TestClient(app)
    r = client.get("/partner/trips", headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code in (401, 403)
