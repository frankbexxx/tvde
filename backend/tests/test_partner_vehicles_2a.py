"""PARTNER-FLEET-2A: Vehicle model + Partner API (tenant-safe, plate global unique)."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.auth.security import create_access_token
from app.db.models.driver import Driver
from app.db.models.partner import Partner
from app.db.models.user import User
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.enums import DriverStatus, Role, UserStatus
from app.services.partner_vehicles import normalize_plate


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL requerido: {exc}")


def test_normalize_plate_strips_spaces_hyphens_upper() -> None:
    assert normalize_plate("  ab-12-cd ") == "AB12CD"
    assert normalize_plate("aa 11 bb") == "AA11BB"


def _seed_two_fleets() -> dict[str, str]:
    db = SessionLocal()
    try:
        pid_a = uuid.uuid4()
        pid_b = uuid.uuid4()
        db.add_all(
            [
                Partner(id=pid_a, name="Fleet 2A A"),
                Partner(id=pid_b, name="Fleet 2A B"),
            ]
        )
        u_da = User(
            role=Role.driver,
            name="Driver 2A A1",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        u_da2 = User(
            role=Role.driver,
            name="Driver 2A A2",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        u_db = User(
            role=Role.driver,
            name="Driver 2A B",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        mgr_a = User(
            role=Role.partner,
            name="Mgr 2A A",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
            partner_org_id=pid_a,
        )
        mgr_b = User(
            role=Role.partner,
            name="Mgr 2A B",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
            partner_org_id=pid_b,
        )
        db.add_all([u_da, u_da2, u_db, mgr_a, mgr_b])
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
                    user_id=u_da2.id,
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
        db.commit()
        return {
            "pid_a": str(pid_a),
            "pid_b": str(pid_b),
            "driver_a1": str(u_da.id),
            "driver_a2": str(u_da2.id),
            "driver_b": str(u_db.id),
            "tok_a": create_access_token(subject=str(mgr_a.id), role=mgr_a.role.value)[
                "token"
            ],
            "tok_b": create_access_token(subject=str(mgr_b.id), role=mgr_b.role.value)[
                "token"
            ],
        }
    finally:
        db.close()


def test_partner_vehicles_create_assign_unassign_and_tenant() -> None:
    seed = _seed_two_fleets()
    c = TestClient(app)
    ha = {"Authorization": f"Bearer {seed['tok_a']}"}
    hb = {"Authorization": f"Bearer {seed['tok_b']}"}
    tag = uuid.uuid4().hex[:6].upper()

    # 1) create OK
    plate_display = f"12-{tag[:2]}-{tag[2:4]}"
    plate_dup_variant = f"12 {tag[:2]} {tag[2:4]}"
    plate_b = f"99-{tag[2:4]}-{tag[4:6]}"
    plate_a2 = f"55-{tag[4:6]}-{tag[:2]}"
    r = c.post(
        "/partner/vehicles",
        headers=ha,
        json={
            "plate": plate_display,
            "make": "Toyota",
            "model": "Corolla",
            "year": 2020,
            "color": "preto",
            "service_category": "x",
        },
    )
    assert r.status_code == 201, r.text
    v1 = r.json()
    assert v1["plate"] == plate_display
    assert v1["plate_normalized"] == normalize_plate(plate_display)
    assert v1["make"] == "Toyota"
    assert v1["assigned_driver_id"] is None
    vid1 = v1["id"]

    # 10) driver without vehicle still OK on list
    rd0 = c.get("/partner/drivers", headers=ha)
    assert rd0.status_code == 200
    bare = next(d for d in rd0.json() if d["user_id"] == seed["driver_a1"])
    assert bare["active_vehicle_id"] is None
    assert bare["vehicle_plate"] is None

    # 2) duplicate plate global (other partner) → 409
    r_dup = c.post(
        "/partner/vehicles",
        headers=hb,
        json={
            "plate": plate_dup_variant,
            "make": "VW",
            "model": "Golf",
        },
    )
    assert r_dup.status_code == 409
    assert r_dup.json()["detail"] == "plate_already_exists"

    # partner B creates its own plate
    r_b = c.post(
        "/partner/vehicles",
        headers=hb,
        json={"plate": plate_b, "make": "BMW", "model": "320"},
    )
    assert r_b.status_code == 201
    vid_b = r_b.json()["id"]

    # 3) partner A cannot see/edit B's vehicle
    assert c.get(f"/partner/vehicles/{vid_b}", headers=ha).status_code == 404
    assert (
        c.patch(
            f"/partner/vehicles/{vid_b}",
            headers=ha,
            json={"color": "hack"},
        ).status_code
        == 404
    )
    listed_a = c.get("/partner/vehicles", headers=ha)
    assert listed_a.status_code == 200
    assert all(v["id"] != vid_b for v in listed_a.json())
    assert any(v["id"] == vid1 for v in listed_a.json())

    # 4) assign same partner OK
    r_as = c.post(
        f"/partner/vehicles/{vid1}/assign",
        headers=ha,
        json={"driver_user_id": seed["driver_a1"]},
    )
    assert r_as.status_code == 200, r_as.text
    assert r_as.json()["assigned_driver_id"] == seed["driver_a1"]
    assert r_as.json()["assigned_driver_name"] == "Driver 2A A1"

    # 9) GET drivers includes vehicle_plate
    rd = c.get("/partner/drivers", headers=ha)
    assert rd.status_code == 200
    d1 = next(d for d in rd.json() if d["user_id"] == seed["driver_a1"])
    assert d1["active_vehicle_id"] == vid1
    assert d1["vehicle_plate"] == plate_display
    assert d1["vehicle_make"] == "Toyota"
    assert d1["vehicle_model"] == "Corolla"
    assert d1["vehicle_service_category"] == "x"

    # 5) assign vehicle to other partner's driver → 404
    r_wrong = c.post(
        f"/partner/vehicles/{vid1}/assign",
        headers=ha,
        json={"driver_user_id": seed["driver_b"]},
    )
    assert r_wrong.status_code == 404

    # second vehicle for partner A
    r2 = c.post(
        "/partner/vehicles",
        headers=ha,
        json={
            "plate": plate_a2,
            "make": "Seat",
            "model": "Leon",
            "service_category": "xl",
        },
    )
    assert r2.status_code == 201
    vid2 = r2.json()["id"]

    # 6) assign vehicle already on another driver → 409
    r_conflict = c.post(
        f"/partner/vehicles/{vid1}/assign",
        headers=ha,
        json={"driver_user_id": seed["driver_a2"]},
    )
    assert r_conflict.status_code == 409
    assert r_conflict.json()["detail"] == "vehicle_already_assigned"

    # 7) driver with A assign to B → A free, driver has B
    r_swap = c.post(
        f"/partner/vehicles/{vid2}/assign",
        headers=ha,
        json={"driver_user_id": seed["driver_a1"]},
    )
    assert r_swap.status_code == 200
    assert r_swap.json()["assigned_driver_id"] == seed["driver_a1"]
    assert r_swap.json()["id"] == vid2

    r_v1 = c.get(f"/partner/vehicles/{vid1}", headers=ha)
    assert r_v1.status_code == 200
    assert r_v1.json()["assigned_driver_id"] is None

    rd2 = c.get("/partner/drivers", headers=ha)
    d1b = next(d for d in rd2.json() if d["user_id"] == seed["driver_a1"])
    assert d1b["active_vehicle_id"] == vid2
    assert d1b["vehicle_plate"] == plate_a2

    # 8) unassign OK + idempotent
    r_un = c.post(f"/partner/vehicles/{vid2}/unassign", headers=ha)
    assert r_un.status_code == 200
    assert r_un.json()["assigned_driver_id"] is None
    r_un2 = c.post(f"/partner/vehicles/{vid2}/unassign", headers=ha)
    assert r_un2.status_code == 200
    assert r_un2.json()["assigned_driver_id"] is None

    rd3 = c.get("/partner/drivers", headers=ha)
    d1c = next(d for d in rd3.json() if d["user_id"] == seed["driver_a1"])
    assert d1c["active_vehicle_id"] is None
    assert d1c["vehicle_plate"] is None
