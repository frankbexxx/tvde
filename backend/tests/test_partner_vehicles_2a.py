"""PARTNER-FLEET-2A: Vehicle model + Partner API (tenant-safe, plate global unique)."""

from __future__ import annotations

import queue
import threading
import uuid

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.auth.security import create_access_token
from app.db.models.driver import Driver
from app.db.models.partner import Partner
from app.db.models.user import User
from app.db.models.vehicle import Vehicle
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.enums import DriverStatus, Role, UserStatus
from app.services import partner_vehicles, partners_admin
from app.services.partner_vehicles import assign_vehicle_to_driver, normalize_plate
from app.services.partners_admin import assign_driver_to_partner


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


def test_vehicle_assignment_cannot_cross_concurrent_fleet_transfer(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = SessionLocal()
    try:
        old_pid = uuid.uuid4()
        new_pid = uuid.uuid4()
        driver_user = User(
            role=Role.driver,
            name="Concurrent Transfer Driver",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        db.add_all(
            [
                Partner(id=old_pid, name="Concurrent Old Fleet"),
                Partner(id=new_pid, name="Concurrent New Fleet"),
                driver_user,
            ]
        )
        db.flush()
        vehicle = Vehicle(
            partner_id=old_pid,
            plate="RACE-TRANSFER",
            plate_normalized=f"RACETRANSFER{uuid.uuid4().hex[:8].upper()}",
            make="Test",
            model="Race",
        )
        db.add_all(
            [
                Driver(
                    user_id=driver_user.id,
                    partner_id=old_pid,
                    status=DriverStatus.approved,
                    commission_percent=15.0,
                ),
                vehicle,
            ]
        )
        db.commit()
        driver_user_id = driver_user.id
        vehicle_id = vehicle.id
    finally:
        db.close()

    transfer_locked = threading.Event()
    release_transfer = threading.Event()
    vehicle_checked = threading.Event()
    assignment_done = threading.Event()
    outcomes: queue.Queue[tuple[str, object]] = queue.Queue()
    original_has_active_trip = partners_admin._driver_has_active_trip
    original_get_vehicle = partner_vehicles.get_vehicle_for_partner

    def pause_transfer_after_driver_lock(db, user_id):
        transfer_locked.set()
        if not release_transfer.wait(timeout=5):
            raise TimeoutError("test did not release fleet transfer")
        return original_has_active_trip(db, user_id)

    def note_vehicle_check(db, partner_id, requested_vehicle_id):
        result = original_get_vehicle(db, partner_id, requested_vehicle_id)
        vehicle_checked.set()
        return result

    monkeypatch.setattr(
        partners_admin, "_driver_has_active_trip", pause_transfer_after_driver_lock
    )
    monkeypatch.setattr(partner_vehicles, "get_vehicle_for_partner", note_vehicle_check)

    def run_transfer() -> None:
        thread_db = SessionLocal()
        try:
            assign_driver_to_partner(
                thread_db,
                driver_user_id=driver_user_id,
                partner_id=new_pid,
            )
            outcomes.put(("transfer", "ok"))
        except BaseException as exc:
            outcomes.put(("transfer_error", exc))
        finally:
            thread_db.close()

    def run_vehicle_assignment() -> None:
        thread_db = SessionLocal()
        try:
            assign_vehicle_to_driver(
                thread_db,
                partner_id=str(old_pid),
                vehicle_id=vehicle_id,
                driver_user_id=driver_user_id,
            )
            outcomes.put(("assignment", "unexpected_success"))
        except HTTPException as exc:
            outcomes.put(("assignment_error", (exc.status_code, exc.detail)))
        except BaseException as exc:
            outcomes.put(("assignment_exception", exc))
        finally:
            thread_db.close()
            assignment_done.set()

    transfer_thread = threading.Thread(target=run_transfer)
    assignment_thread = threading.Thread(target=run_vehicle_assignment)
    transfer_thread.start()
    assert transfer_locked.wait(timeout=5)
    assignment_thread.start()
    assert vehicle_checked.wait(timeout=5)
    try:
        assert not assignment_done.wait(timeout=0.25)
    finally:
        release_transfer.set()

    transfer_thread.join(timeout=5)
    assignment_thread.join(timeout=5)
    assert not transfer_thread.is_alive()
    assert not assignment_thread.is_alive()

    result = dict(outcomes.get_nowait() for _ in range(2))
    assert result == {
        "transfer": "ok",
        "assignment_error": (404, "not_found"),
    }

    verify_db = SessionLocal()
    try:
        driver = verify_db.get(Driver, driver_user_id)
        assert driver is not None
        assert driver.partner_id == new_pid
        assert driver.active_vehicle_id is None
    finally:
        verify_db.close()


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
            "service_categories": ["x"],
        },
    )
    assert r.status_code == 201, r.text
    v1 = r.json()
    assert v1["plate"] == plate_display
    assert v1["plate_normalized"] == normalize_plate(plate_display)
    assert v1["make"] == "Toyota"
    assert v1["service_categories"] == ["x"]
    assert v1["assigned_driver_id"] is None
    vid1 = v1["id"]

    # multi categories
    r_multi = c.post(
        "/partner/vehicles",
        headers=ha,
        json={
            "plate": f"77-{tag[:2]}-{tag[4:6]}",
            "make": "Mercedes",
            "model": "Vito",
            "service_categories": ["x", "xl", "van"],
        },
    )
    assert r_multi.status_code == 201, r_multi.text
    assert r_multi.json()["service_categories"] == ["x", "xl", "van"]

    # invalid category
    r_bad = c.post(
        "/partner/vehicles",
        headers=ha,
        json={
            "plate": f"88-{tag[2:4]}-{tag[:2]}",
            "make": "Bad",
            "model": "Cat",
            "service_categories": ["x", "spaceship"],
        },
    )
    assert r_bad.status_code == 400
    assert r_bad.json()["detail"] == "invalid_service_category"

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
    assert d1["vehicle_service_categories"] == ["x"]

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
            "service_categories": ["xl"],
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
