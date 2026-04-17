"""C009–C012, H007: metrics expansion, driver/trip detail, assign DELETE, CSV export."""

from __future__ import annotations

import csv
import io
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.api.deps import UserContext, get_current_user
from app.auth.security import create_access_token
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver
from app.db.models.partner import Partner
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.enums import DriverStatus, Role, TripStatus, UserStatus
from app.services.partners_admin import partner_metrics

_GOVERNANCE_REASON = "motivo teste unassign partner SP-F."


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL requerido: {exc}")


@pytest.fixture
def admin_ctx_override() -> None:
    aid = str(uuid.uuid4())

    async def _super() -> UserContext:
        return UserContext(user_id=aid, role=Role.super_admin)

    app.dependency_overrides[get_current_user] = _super
    yield aid
    app.dependency_overrides.pop(get_current_user, None)


def test_c009_metrics_completed_cancelled_total_drivers() -> None:
    db = SessionLocal()
    try:
        pid = uuid.uuid4()
        db.add(Partner(id=pid, name="C009 Fleet"))
        u_d1 = User(
            role=Role.driver,
            name="D1",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        u_d2 = User(
            role=Role.driver,
            name="D2",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        u_p = User(
            role=Role.passenger,
            name="P",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        db.add_all([u_d1, u_d2, u_p])
        db.flush()
        db.add_all(
            [
                Driver(
                    user_id=u_d1.id,
                    partner_id=pid,
                    status=DriverStatus.approved,
                    commission_percent=15.0,
                ),
                Driver(
                    user_id=u_d2.id,
                    partner_id=pid,
                    status=DriverStatus.approved,
                    commission_percent=15.0,
                ),
            ]
        )
        db.flush()
        db.add_all(
            [
                Trip(
                    passenger_id=u_p.id,
                    driver_id=u_d1.id,
                    status=TripStatus.completed,
                    origin_lat=38.7,
                    origin_lng=-9.1,
                    destination_lat=38.8,
                    destination_lng=-9.2,
                    estimated_price=10.0,
                ),
                Trip(
                    passenger_id=u_p.id,
                    driver_id=u_d1.id,
                    status=TripStatus.cancelled,
                    origin_lat=38.7,
                    origin_lng=-9.1,
                    destination_lat=38.8,
                    destination_lng=-9.2,
                    estimated_price=10.0,
                ),
            ]
        )
        db.commit()
        m = partner_metrics(db, pid)
        assert m["trips_completed"] == 1
        assert m["trips_cancelled"] == 1
        assert m["total_drivers"] == 2
        assert m["trips_total"] == 2
    finally:
        db.close()


def test_c010_c011_partner_detail_and_h007_csv() -> None:
    db = SessionLocal()
    try:
        pid = uuid.uuid4()
        db.add(Partner(id=pid, name="Detail Co"))
        u_d = User(
            role=Role.driver,
            name="Detail Driver",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        u_p = User(
            role=Role.passenger,
            name="Pax",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        mgr = User(
            role=Role.partner,
            name="Mgr",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
            partner_org_id=pid,
        )
        db.add_all([u_d, u_p, mgr])
        db.flush()
        db.add(
            Driver(
                user_id=u_d.id,
                partner_id=pid,
                status=DriverStatus.approved,
                commission_percent=12.0,
                is_available=False,
            )
        )
        db.flush()
        tr = Trip(
            passenger_id=u_p.id,
            driver_id=u_d.id,
            status=TripStatus.completed,
            origin_lat=38.7,
            origin_lng=-9.1,
            destination_lat=38.8,
            destination_lng=-9.2,
            estimated_price=9.0,
        )
        db.add(tr)
        db.commit()
        trip_id = str(tr.id)
        driver_id = str(u_d.id)
        tok = create_access_token(subject=str(mgr.id), role=mgr.role.value)["token"]
    finally:
        db.close()

    client = TestClient(app)
    h = {"Authorization": f"Bearer {tok}"}

    rd = client.get(f"/partner/drivers/{driver_id}", headers=h)
    assert rd.status_code == 200
    row = rd.json()
    assert row["user_id"] == driver_id
    assert row["user"]["name"] == "Detail Driver"
    assert row["partner_id"] == str(pid)
    assert row["is_available"] is False

    rt = client.get(f"/partner/trips/{trip_id}", headers=h)
    assert rt.status_code == 200
    tj = rt.json()
    assert tj["trip_id"] == trip_id
    assert tj["driver_id"] == driver_id
    assert tj["status"] == "completed"

    rex = client.get("/partner/trips/export", headers=h)
    assert rex.status_code == 200
    assert "text/csv" in rex.headers.get("content-type", "")
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
    ]
    assert any(r[0] == trip_id for r in rows[1:])


def test_c012_delete_unassign_idempotent(admin_ctx_override: str) -> None:
    db = SessionLocal()
    try:
        pid = uuid.uuid4()
        db.add(Partner(id=pid, name="Unassign Co"))
        u = User(
            role=Role.driver,
            name="Unassign D",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        db.add(u)
        db.flush()
        db.add(
            Driver(
                user_id=u.id,
                partner_id=pid,
                status=DriverStatus.approved,
                commission_percent=15.0,
            )
        )
        db.commit()
        driver_id = str(u.id)
    finally:
        db.close()

    client = TestClient(app)

    r1 = client.request(
        "DELETE",
        f"/admin/drivers/{driver_id}/assign-partner",
        json={"governance_reason": _GOVERNANCE_REASON},
    )
    assert r1.status_code == 200
    assert r1.json()["partner_id"] == str(DEFAULT_PARTNER_UUID)

    r2 = client.request(
        "DELETE",
        f"/admin/drivers/{driver_id}/assign-partner",
        json={"governance_reason": _GOVERNANCE_REASON},
    )
    assert r2.status_code == 200
    assert r2.json()["partner_id"] == str(DEFAULT_PARTNER_UUID)


def test_c012_delete_unassign_unknown_driver(admin_ctx_override: str) -> None:
    client = TestClient(app)
    r = client.request(
        "DELETE",
        f"/admin/drivers/{uuid.uuid4()}/assign-partner",
        json={"governance_reason": _GOVERNANCE_REASON},
    )
    assert r.status_code == 404
    assert r.json().get("detail") == "driver_not_found"
