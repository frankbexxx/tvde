"""C001–C008: partner admin entry, assign, enriched lists, metrics, reassignment rules, E2E."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.api.deps import UserContext, get_current_user
from app.auth.security import create_access_token
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver, DriverLocation
from app.db.models.partner import Partner
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.enums import DriverStatus, Role, TripStatus, UserStatus

_GOVERNANCE_REASON = "motivo teste integração parceiros SP-F."


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL requerido: {exc}")


@pytest.fixture
def admin_ctx_override() -> None:
    """SP-F: criar frota / atribuir motorista exige `super_admin` + motivo."""
    aid = str(uuid.uuid4())

    async def _super() -> UserContext:
        return UserContext(user_id=aid, role=Role.super_admin)

    app.dependency_overrides[get_current_user] = _super
    yield aid
    app.dependency_overrides.pop(get_current_user, None)


def test_c001_admin_create_partner_persisted(admin_ctx_override: str) -> None:
    client = TestClient(app)
    r = client.post(
        "/admin/partners",
        json={
            "name": f"Fleet E2E {uuid.uuid4().hex[:8]}",
            "governance_reason": _GOVERNANCE_REASON,
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert "id" in data and "name" in data and "created_at" in data
    pid = data["id"]
    db = SessionLocal()
    try:
        p = db.execute(
            text("SELECT id, name FROM partners WHERE id = :id"),
            {"id": pid},
        ).first()
        assert p is not None
        assert p[1] == data["name"]
    finally:
        db.close()


def test_c001_create_partner_name_required(admin_ctx_override: str) -> None:
    client = TestClient(app)
    r = client.post(
        "/admin/partners",
        json={"name": "   ", "governance_reason": _GOVERNANCE_REASON},
    )
    assert r.status_code == 400
    assert r.json().get("detail") == "name_required"


def test_c002_assign_driver_partner(admin_ctx_override: str) -> None:
    db = SessionLocal()
    try:
        pid_new = uuid.uuid4()
        db.add(Partner(id=pid_new, name="Assign Test Fleet"))
        u = User(
            role=Role.driver,
            name="Drv Assign",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        db.add(u)
        db.flush()
        db.add(
            Driver(
                user_id=u.id,
                partner_id=DEFAULT_PARTNER_UUID,
                status=DriverStatus.approved,
                commission_percent=15.0,
            )
        )
        db.commit()
        driver_id = str(u.id)
    finally:
        db.close()

    client = TestClient(app)
    r = client.post(
        f"/admin/drivers/{driver_id}/assign-partner",
        json={"partner_id": str(pid_new), "governance_reason": _GOVERNANCE_REASON},
    )
    assert r.status_code == 200, r.text
    assert r.json() == {"user_id": driver_id, "partner_id": str(pid_new)}

    db = SessionLocal()
    try:
        d = db.get(Driver, uuid.UUID(driver_id))
        assert d is not None and d.partner_id == pid_new
    finally:
        db.close()


def test_c006_assign_blocked_when_active_trip(admin_ctx_override: str) -> None:
    db = SessionLocal()
    try:
        p_a = uuid.uuid4()
        p_b = uuid.uuid4()
        db.add_all([Partner(id=p_a, name="A"), Partner(id=p_b, name="B")])
        u_d = User(
            role=Role.driver,
            name="D Active",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        u_p = User(
            role=Role.passenger,
            name="P",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        db.add_all([u_d, u_p])
        db.flush()
        db.add(
            Driver(
                user_id=u_d.id,
                partner_id=p_a,
                status=DriverStatus.approved,
                commission_percent=15.0,
            )
        )
        db.flush()
        db.add(
            Trip(
                passenger_id=u_p.id,
                driver_id=u_d.id,
                status=TripStatus.ongoing,
                origin_lat=38.7,
                origin_lng=-9.1,
                destination_lat=38.8,
                destination_lng=-9.2,
                estimated_price=10.0,
            )
        )
        db.commit()
        driver_id = str(u_d.id)
    finally:
        db.close()

    client = TestClient(app)
    r = client.post(
        f"/admin/drivers/{driver_id}/assign-partner",
        json={"partner_id": str(p_b), "governance_reason": _GOVERNANCE_REASON},
    )
    assert r.status_code == 409
    assert r.json().get("detail") == "driver_has_active_trip"


def test_c003_c004_c005_partner_lists_and_metrics() -> None:
    db = SessionLocal()
    try:
        pid = uuid.uuid4()
        db.add(Partner(id=pid, name="Metrics Fleet"))
        u_d = User(
            role=Role.driver,
            name="Visible Driver",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        u_p = User(
            role=Role.passenger,
            name="Pax",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        u_partner = User(
            role=Role.partner,
            name="Mgr",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
            partner_org_id=pid,
        )
        db.add_all([u_d, u_p, u_partner])
        db.flush()
        db.add(
            Driver(
                user_id=u_d.id,
                partner_id=pid,
                status=DriverStatus.approved,
                commission_percent=12.0,
                is_available=True,
            )
        )
        db.flush()
        db.add(
            DriverLocation(
                driver_id=u_d.id,
                lat=38.72,
                lng=-9.14,
            )
        )
        db.flush()
        db.add(
            Trip(
                passenger_id=u_p.id,
                driver_id=u_d.id,
                status=TripStatus.completed,
                origin_lat=38.7,
                origin_lng=-9.1,
                destination_lat=38.8,
                destination_lng=-9.2,
                estimated_price=10.0,
            )
        )
        db.commit()
        expected_driver_phone = u_d.phone
        tok = create_access_token(subject=str(u_partner.id), role=u_partner.role.value)[
            "token"
        ]
    finally:
        db.close()

    client = TestClient(app)
    h = {"Authorization": f"Bearer {tok}"}

    rd = client.get("/partner/drivers", headers=h)
    assert rd.status_code == 200
    rows = rd.json()
    assert len(rows) == 1
    row = rows[0]
    assert row["user"]["name"] == "Visible Driver"
    assert row["user"]["phone"] == expected_driver_phone
    assert row["last_location"] is not None
    assert "lat" in row["last_location"]

    rt = client.get("/partner/trips", headers=h)
    assert rt.status_code == 200
    trips = rt.json()
    assert len(trips) == 1
    t0 = trips[0]
    for k in (
        "trip_id",
        "status",
        "passenger_id",
        "driver_id",
        "created_at",
        "updated_at",
    ):
        assert k in t0
    assert t0["driver_id"] == str(u_d.id)

    rm = client.get("/partner/metrics", headers=h)
    assert rm.status_code == 200
    m = rm.json()
    assert m["trips_total"] >= 1
    assert m["active_drivers"] >= 1


def test_c008_full_flow_admin_to_partner_views() -> None:
    """Admin creates org + assigns driver; partner token sees drivers/trips/metrics."""
    client = TestClient(app)
    db = SessionLocal()
    try:
        admin_u = User(
            role=Role.super_admin,
            name="Flow SuperAdmin",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        db.add(admin_u)
        db.commit()
        admin_tok = create_access_token(
            subject=str(admin_u.id), role=admin_u.role.value
        )["token"]
    finally:
        db.close()

    ah = {"Authorization": f"Bearer {admin_tok}"}
    pr = client.post(
        "/admin/partners",
        json={
            "name": f"Flow {uuid.uuid4().hex[:6]}",
            "governance_reason": _GOVERNANCE_REASON,
        },
        headers=ah,
    )
    assert pr.status_code == 200
    fleet_id = pr.json()["id"]

    db = SessionLocal()
    try:
        u_d = User(
            role=Role.driver,
            name="Flow Driver",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        u_p = User(
            role=Role.passenger,
            name="Flow Pax",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        u_mgr = User(
            role=Role.partner,
            name="Flow Mgr",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
            partner_org_id=uuid.UUID(fleet_id),
        )
        db.add_all([u_d, u_p, u_mgr])
        db.flush()
        db.add(
            Driver(
                user_id=u_d.id,
                partner_id=DEFAULT_PARTNER_UUID,
                status=DriverStatus.approved,
                commission_percent=15.0,
                is_available=True,
            )
        )
        db.commit()
        driver_id = str(u_d.id)
        passenger_uuid = u_p.id
        driver_uuid = u_d.id
        mgr_tok = create_access_token(subject=str(u_mgr.id), role=u_mgr.role.value)[
            "token"
        ]
    finally:
        db.close()

    ar = client.post(
        f"/admin/drivers/{driver_id}/assign-partner",
        json={"partner_id": fleet_id, "governance_reason": _GOVERNANCE_REASON},
        headers=ah,
    )
    assert ar.status_code == 200

    db = SessionLocal()
    try:
        db.add(
            Trip(
                passenger_id=passenger_uuid,
                driver_id=driver_uuid,
                status=TripStatus.completed,
                origin_lat=38.7,
                origin_lng=-9.1,
                destination_lat=38.8,
                destination_lng=-9.2,
                estimated_price=11.0,
            )
        )
        db.commit()
    finally:
        db.close()

    h = {"Authorization": f"Bearer {mgr_tok}"}
    assert client.get("/partner/drivers", headers=h).status_code == 200
    drows = client.get("/partner/drivers", headers=h).json()
    assert any(r["user_id"] == driver_id for r in drows)
    trips = client.get("/partner/trips", headers=h).json()
    assert len(trips) >= 1
    metrics = client.get("/partner/metrics", headers=h).json()
    assert metrics["trips_total"] >= 1
