"""PARTNER-FLEET-1A: roster em viagem, metrics € hoje, CSV preços (tenant-safe)."""

from __future__ import annotations

import csv
import io
import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.auth.security import create_access_token
from app.db.models.driver import Driver
from app.db.models.partner import Partner
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.enums import DriverStatus, Role, TripStatus, UserStatus
from app.services.partners_admin import partner_metrics


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL requerido: {exc}")


def _seed_two_partners_with_drivers() -> dict[str, str]:
    db = SessionLocal()
    try:
        pid_a = uuid.uuid4()
        pid_b = uuid.uuid4()
        db.add_all(
            [
                Partner(id=pid_a, name="Fleet 1A A"),
                Partner(id=pid_b, name="Fleet 1A B"),
            ]
        )
        u_da = User(
            role=Role.driver,
            name="Driver A",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        u_db = User(
            role=Role.driver,
            name="Driver B",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        u_pax = User(
            role=Role.passenger,
            name="Pax 1A",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        mgr_a = User(
            role=Role.partner,
            name="Mgr A",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
            partner_org_id=pid_a,
        )
        db.add_all([u_da, u_db, u_pax, mgr_a])
        db.flush()
        db.add_all(
            [
                Driver(
                    user_id=u_da.id,
                    partner_id=pid_a,
                    status=DriverStatus.approved,
                    commission_percent=15.0,
                    is_available=True,
                ),
                Driver(
                    user_id=u_db.id,
                    partner_id=pid_b,
                    status=DriverStatus.approved,
                    commission_percent=15.0,
                    is_available=True,
                ),
            ]
        )
        now = datetime.now(timezone.utc)
        trip_active = Trip(
            passenger_id=u_pax.id,
            driver_id=u_da.id,
            status=TripStatus.ongoing,
            origin_lat=38.7,
            origin_lng=-9.1,
            destination_lat=38.8,
            destination_lng=-9.2,
            estimated_price=12.5,
        )
        trip_done = Trip(
            passenger_id=u_pax.id,
            driver_id=u_da.id,
            status=TripStatus.completed,
            origin_lat=38.7,
            origin_lng=-9.1,
            destination_lat=38.8,
            destination_lng=-9.2,
            estimated_price=10.0,
            final_price=11.5,
            completed_at=now,
        )
        trip_other = Trip(
            passenger_id=u_pax.id,
            driver_id=u_db.id,
            status=TripStatus.ongoing,
            origin_lat=38.7,
            origin_lng=-9.1,
            destination_lat=38.8,
            destination_lng=-9.2,
            estimated_price=99.0,
        )
        db.add_all([trip_active, trip_done, trip_other])
        db.commit()
        return {
            "pid_a": str(pid_a),
            "pid_b": str(pid_b),
            "driver_a": str(u_da.id),
            "driver_b": str(u_db.id),
            "mgr_a_tok": create_access_token(subject=str(mgr_a.id), role=mgr_a.role.value)[
                "token"
            ],
            "trip_active": str(trip_active.id),
            "trip_done": str(trip_done.id),
        }
    finally:
        db.close()


def test_partner_drivers_show_active_trip_badge_fields() -> None:
    ids = _seed_two_partners_with_drivers()
    client = TestClient(app)
    h = {"Authorization": f"Bearer {ids['mgr_a_tok']}"}
    r = client.get("/partner/drivers", headers=h)
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) == 1
    d = rows[0]
    assert d["user_id"] == ids["driver_a"]
    assert d["active_trip_id"] == ids["trip_active"]
    assert d["active_trip_status"] == "ongoing"
    assert ids["driver_b"] not in {x["user_id"] for x in rows}


def test_partner_available_without_active_trip_has_null_active() -> None:
    db = SessionLocal()
    try:
        pid = uuid.uuid4()
        db.add(Partner(id=pid, name="Idle Fleet"))
        u_d = User(
            role=Role.driver,
            name="Idle Driver",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        mgr = User(
            role=Role.partner,
            name="Idle Mgr",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
            partner_org_id=pid,
        )
        db.add_all([u_d, mgr])
        db.flush()
        db.add(
            Driver(
                user_id=u_d.id,
                partner_id=pid,
                status=DriverStatus.approved,
                commission_percent=10.0,
                is_available=True,
            )
        )
        db.commit()
        tok = create_access_token(subject=str(mgr.id), role=mgr.role.value)["token"]
        driver_id = str(u_d.id)
    finally:
        db.close()

    client = TestClient(app)
    r = client.get("/partner/drivers", headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 200
    d = next(x for x in r.json() if x["user_id"] == driver_id)
    assert d["is_available"] is True
    assert d.get("active_trip_id") in (None, "")
    assert d.get("active_trip_status") in (None, "")


def test_partner_metrics_revenue_completed_today_tenant_scoped() -> None:
    ids = _seed_two_partners_with_drivers()
    db = SessionLocal()
    try:
        m = partner_metrics(db, uuid.UUID(ids["pid_a"]))
        assert m["trips_completed_today"] >= 1
        assert float(m["revenue_completed_today"]) == pytest.approx(11.5)
        m_b = partner_metrics(db, uuid.UUID(ids["pid_b"]))
        assert float(m_b["revenue_completed_today"]) == pytest.approx(0.0)
    finally:
        db.close()

    client = TestClient(app)
    rm = client.get(
        "/partner/metrics",
        headers={"Authorization": f"Bearer {ids['mgr_a_tok']}"},
    )
    assert rm.status_code == 200
    body = rm.json()
    assert body["trips_completed_today"] >= 1
    assert body["revenue_completed_today"] == pytest.approx(11.5)


def test_partner_csv_appends_prices_keeps_old_columns() -> None:
    ids = _seed_two_partners_with_drivers()
    client = TestClient(app)
    rex = client.get(
        "/partner/trips/export",
        headers={"Authorization": f"Bearer {ids['mgr_a_tok']}"},
    )
    assert rex.status_code == 200
    rows = list(csv.reader(io.StringIO(rex.text)))
    assert rows[0] == [
        "trip_id",
        "driver_id",
        "passenger_id",
        "status",
        "created_at",
        "started_at",
        "completed_at",
        "updated_at",
        "estimated_price",
        "final_price",
    ]
    # No passenger name/phone columns (PII).
    assert "phone" not in rows[0]
    assert "name" not in rows[0]
    done = next(r for r in rows[1:] if r[0] == ids["trip_done"])
    assert done[3] == "completed"
    assert done[1] == ids["driver_a"]
    assert done[-2] == "10.00"
    assert done[-1] == "11.50"
    # Other partner trip must not appear.
    assert ids["driver_b"] not in {r[1] for r in rows[1:]}
