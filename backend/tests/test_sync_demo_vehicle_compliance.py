"""NON-WIPE sync_demo_vehicle_compliance (G-KYC-P0-04)."""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.partner_constants import (
    BASELINE_PARTNER_FLEET_UUID,
    DEFAULT_PARTNER_UUID,
)
from app.db.models.driver import Driver
from app.db.models.payment import Payment
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.models.vehicle import Vehicle
from app.db.models.vehicle_document import VehicleDocument
from app.db.session import engine
from app.models.enums import Role, TripStatus
from app.services.baseline_reset import run_full_baseline_reset
from app.services.partner_vehicle_documents import summarize_vehicle_documents_rows
from app.services.partner_vehicles import normalize_plate
from app.services.seed_demo_vehicle_compliance import (
    DEMO_VEHICLE_SPECS,
    PHONE_MARLY,
)
from app.services.sync_demo_vehicle_compliance import (
    CONFIRM_TOKEN,
    DemoSyncAbort,
    apply_demo_vehicle_compliance_sync,
    build_demo_vehicle_compliance_sync_plan,
)
from app.services.vehicle_document_compliance import (
    COMPLIANCE_COMPLIANT,
    vehicle_compliance_status,
)
TEST_PWD = "demo-sync-pass-123456"


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL requerido: {exc}")


@pytest.fixture
def baseline(db: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ADMIN_PHONE", "+351924075365", raising=False)
    monkeypatch.setattr(settings, "TEST_ACCOUNT_PASSWORD", TEST_PWD, raising=False)
    run_full_baseline_reset(db)


def _counts(db: Session) -> dict[str, int]:
    return {
        "vehicles": int(db.scalar(select(func.count()).select_from(Vehicle)) or 0),
        "docs": int(db.scalar(select(func.count()).select_from(VehicleDocument)) or 0),
        "trips": int(db.scalar(select(func.count()).select_from(Trip)) or 0),
        "payments": int(db.scalar(select(func.count()).select_from(Payment)) or 0),
        "users": int(db.scalar(select(func.count()).select_from(User)) or 0),
        "drivers": int(db.scalar(select(func.count()).select_from(Driver)) or 0),
    }


def test_dry_run_plan_ok_after_baseline(db: Session, baseline: None) -> None:
    plan = build_demo_vehicle_compliance_sync_plan(db)
    assert plan.ok
    assert len(plan.drivers) == 4
    assert all(d.is_test_account for d in plan.drivers)
    assert {d.expected_plate for d in plan.drivers} == {
        "DEMO-DF-01",
        "11-AA-22",
        "33-BB-44",
        "DEMO-TP-03",
    }


def test_apply_idempotent_and_no_trip_payment_churn(
    db: Session, baseline: None
) -> None:
    before = _counts(db)
    plan1 = apply_demo_vehicle_compliance_sync(db)
    db.commit()
    assert plan1.ok
    mid = _counts(db)
    assert mid["trips"] == before["trips"]
    assert mid["payments"] == before["payments"]
    assert mid["users"] == before["users"]
    assert mid["drivers"] == before["drivers"]
    assert mid["vehicles"] == 4
    assert mid["docs"] == 16

    plan2 = apply_demo_vehicle_compliance_sync(db)
    db.commit()
    after = _counts(db)
    assert after == mid
    assert plan2.ok
    # Second pass: no create/repair needed
    assert all(
        all(a.startswith("ok:") for a in d.docs_actions) for d in plan2.drivers
    )

    drivers = list(db.execute(select(Driver)).scalars().all())
    assert len(drivers) == 4
    assert all(d.active_vehicle_id is not None for d in drivers)
    vehicles = list(db.execute(select(Vehicle)).scalars().all())
    assert all((v.status or "").lower() == "active" for v in vehicles)
    for v in vehicles:
        docs = list(
            db.execute(
                select(VehicleDocument).where(VehicleDocument.vehicle_id == v.id)
            )
            .scalars()
            .all()
        )
        summary = summarize_vehicle_documents_rows(docs)
        assert (
            vehicle_compliance_status(summary, has_active_vehicle=True).compliance_status
            == COMPLIANCE_COMPLIANT
        )


def test_non_test_user_aborts(db: Session, baseline: None) -> None:
    user = db.execute(select(User).where(User.phone == PHONE_MARLY)).scalar_one()
    user.is_test_account = False
    db.flush()
    plan = build_demo_vehicle_compliance_sync_plan(db)
    assert not plan.ok
    assert any("is_test_account=false" in a for a in plan.aborts)
    with pytest.raises(DemoSyncAbort):
        apply_demo_vehicle_compliance_sync(db)


def test_active_trip_aborts(db: Session, baseline: None) -> None:
    user = db.execute(select(User).where(User.phone == PHONE_MARLY)).scalar_one()
    pax = db.execute(
        select(User).where(User.role == Role.passenger)
    ).scalars().first()
    assert pax is not None
    db.add(
        Trip(
            id=uuid.uuid4(),
            passenger_id=pax.id,
            driver_id=user.id,
            status=TripStatus.ongoing,
            origin_lat=38.7,
            origin_lng=-9.1,
            destination_lat=38.8,
            destination_lng=-9.2,
            estimated_price=10.0,
        )
    )
    db.flush()
    plan = build_demo_vehicle_compliance_sync_plan(db)
    assert not plan.ok
    assert any("active trip" in a for a in plan.aborts)
    with pytest.raises(DemoSyncAbort):
        apply_demo_vehicle_compliance_sync(db)


def test_unexpected_vehicle_partner_conflict_aborts(
    db: Session, baseline: None
) -> None:
    plate = "11-AA-22"
    vehicle = db.execute(
        select(Vehicle).where(Vehicle.plate_normalized == normalize_plate(plate))
    ).scalar_one()
    # 11-AA-22 expects test_partner; move to Default fleet → conflict
    vehicle.partner_id = DEFAULT_PARTNER_UUID
    db.flush()
    plan = build_demo_vehicle_compliance_sync_plan(db)
    assert not plan.ok
    assert any("partner=" in a for a in plan.aborts)


def test_non_demo_doc_with_file_aborts(db: Session, baseline: None) -> None:
    plate = "11-AA-22"
    vehicle = db.execute(
        select(Vehicle).where(Vehicle.plate_normalized == normalize_plate(plate))
    ).scalar_one()
    doc = db.execute(
        select(VehicleDocument).where(
            VehicleDocument.vehicle_id == vehicle.id,
            VehicleDocument.document_type == "vehicle_registration",
        )
    ).scalar_one()
    doc.notes = "Real registration scan"
    doc.issuer = "IMT"
    doc.file_path = "/uploads/real-doc.pdf"
    doc.metadata_json = None
    db.flush()
    plan = build_demo_vehicle_compliance_sync_plan(db)
    assert not plan.ok
    assert any("non-demo document" in a for a in plan.aborts)


def test_cli_guards_remote_and_confirm(monkeypatch: pytest.MonkeyPatch) -> None:
    import importlib.util
    from pathlib import Path

    path = Path(__file__).resolve().parents[1] / "scripts" / "sync_demo_vehicle_compliance.py"
    spec = importlib.util.spec_from_file_location("sync_demo_cli", path)
    assert spec and spec.loader
    cli = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(cli)

    monkeypatch.delenv("ALLOW_REMOTE_DEMO_SYNC", raising=False)
    with pytest.raises(SystemExit) as e1:
        cli._assert_remote_read_allowed(hostname="dpg-remote.example")
    assert e1.value.code == 2

    monkeypatch.setenv("ALLOW_REMOTE_DEMO_SYNC", "YES")
    cli._assert_remote_read_allowed(hostname="dpg-remote.example")  # allowed

    monkeypatch.delenv("ALLOW_REMOTE_DEMO_SYNC", raising=False)
    with pytest.raises(SystemExit) as e2:
        cli._assert_apply_allowed(hostname="dpg-remote.example")
    assert e2.value.code == 2

    with pytest.raises(SystemExit) as e3:
        cli.main(["--apply"])
    assert e3.value.code == 2

    with pytest.raises(SystemExit) as e4:
        cli.main(["--apply", "--confirm", "WRONG"])
    assert e4.value.code == 2

    assert CONFIRM_TOKEN == "SYNC_DEMO_VEHICLE_COMPLIANCE"
    assert len(DEMO_VEHICLE_SPECS) == 4
    assert BASELINE_PARTNER_FLEET_UUID
