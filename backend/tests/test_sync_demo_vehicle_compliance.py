"""NON-WIPE PROD-roster sync_demo_vehicle_compliance (G-KYC-P0-04)."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

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
    DEMO_DOC_EXPIRES_AT,
    DEMO_VEHICLE_SPECS,
    PHONE_DEFAULT_DRIVER,
    PHONE_MANEL,
    PHONE_MARLY,
    PHONE_TEST_DRIVER_B,
)
from app.services.sync_demo_vehicle_compliance import (
    CONFIRM_TOKEN,
    PLATE_PROD_MARLY,
    PROD_DEMO_VEHICLE_SPECS,
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


def _reshape_to_prod_demo(db: Session) -> None:
    """Align local baseline DB with the PROD demo roster (3 drivers / mappings)."""
    u_test = db.execute(
        select(User).where(User.phone == PHONE_DEFAULT_DRIVER)
    ).scalar_one()
    u_marly = db.execute(select(User).where(User.phone == PHONE_MARLY)).scalar_one()
    d_test = db.execute(select(Driver).where(Driver.user_id == u_test.id)).scalar_one()
    d_marly = db.execute(
        select(Driver).where(Driver.user_id == u_marly.id)
    ).scalar_one()

    # PROD: test_driver on test_partner holding 11-AA-22
    d_test.partner_id = BASELINE_PARTNER_FLEET_UUID
    v11 = db.execute(
        select(Vehicle).where(Vehicle.plate_normalized == normalize_plate("11-AA-22"))
    ).scalar_one()
    d_marly.active_vehicle_id = None
    db.flush()  # clear unique active_vehicle before reassign
    d_test.active_vehicle_id = v11.id
    db.flush()

    # Simulate Francisco uploads on 11-AA-22: preserve file_path, expire inspection
    docs = list(
        db.execute(
            select(VehicleDocument).where(VehicleDocument.vehicle_id == v11.id)
        )
        .scalars()
        .all()
    )
    by = {d.document_type: d for d in docs}
    for dtype in ("vehicle_registration", "vehicle_insurance"):
        row = by[dtype]
        row.file_path = f"/uploads/demo/{dtype}.pdf"
        row.issuer = "IMT"
        row.notes = ""
        row.metadata_json = None
    insp = by["periodic_inspection"]
    insp.file_path = "/uploads/demo/inspection.pdf"
    insp.issuer = "CIMA"
    insp.notes = ""
    insp.metadata_json = None
    insp.expires_at = datetime.now(timezone.utc) - timedelta(days=30)
    # Drop sticker so soft sync must create it
    sticker = by.get("tvde_sticker")
    if sticker is not None:
        db.delete(sticker)

    # 33-BB-44: strip docs so soft sync creates DEMO rows
    v33 = db.execute(
        select(Vehicle).where(Vehicle.plate_normalized == normalize_plate("33-BB-44"))
    ).scalar_one()
    for row in db.execute(
        select(VehicleDocument).where(VehicleDocument.vehicle_id == v33.id)
    ).scalars():
        db.delete(row)

    db.flush()


@pytest.fixture
def prod_like(db: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ADMIN_PHONE", "+351924075365", raising=False)
    monkeypatch.setattr(settings, "TEST_ACCOUNT_PASSWORD", TEST_PWD, raising=False)
    run_full_baseline_reset(db)
    _reshape_to_prod_demo(db)
    db.commit()


def _counts(db: Session) -> dict[str, int]:
    return {
        "vehicles": int(db.scalar(select(func.count()).select_from(Vehicle)) or 0),
        "docs": int(db.scalar(select(func.count()).select_from(VehicleDocument)) or 0),
        "trips": int(db.scalar(select(func.count()).select_from(Trip)) or 0),
        "payments": int(db.scalar(select(func.count()).select_from(Payment)) or 0),
        "users": int(db.scalar(select(func.count()).select_from(User)) or 0),
        "drivers": int(db.scalar(select(func.count()).select_from(Driver)) or 0),
    }


def test_prod_roster_is_three_and_excludes_fourth() -> None:
    assert len(PROD_DEMO_VEHICLE_SPECS) == 3
    phones = {str(s["driver_phone"]) for s in PROD_DEMO_VEHICLE_SPECS}
    assert phones == {PHONE_DEFAULT_DRIVER, PHONE_MARLY, PHONE_MANEL}
    assert PHONE_TEST_DRIVER_B not in phones
    plates = {str(s["plate"]) for s in PROD_DEMO_VEHICLE_SPECS}
    assert plates == {"11-AA-22", "33-BB-44", PLATE_PROD_MARLY}
    assert "DEMO-DF-01" not in plates
    assert "DEMO-TP-03" not in plates
    # Local baseline unchanged
    assert len(DEMO_VEHICLE_SPECS) == 4


def test_dry_run_plan_ok_prod_like(db: Session, prod_like: None) -> None:
    plan = build_demo_vehicle_compliance_sync_plan(db)
    assert plan.ok
    assert len(plan.drivers) == 3
    assert plan.summary["excluded_phones"] == [PHONE_TEST_DRIVER_B]
    by_phone = {d.phone: d for d in plan.drivers}
    assert by_phone[PHONE_DEFAULT_DRIVER].partner_id == str(BASELINE_PARTNER_FLEET_UUID)
    assert by_phone[PHONE_DEFAULT_DRIVER].expected_plate == "11-AA-22"
    assert "tvde_sticker" in by_phone[PHONE_DEFAULT_DRIVER].docs_create
    assert "periodic_inspection" in by_phone[PHONE_DEFAULT_DRIVER].docs_date_fix
    assert "vehicle_registration" in by_phone[PHONE_DEFAULT_DRIVER].docs_preserve
    assert by_phone[PHONE_MANEL].expected_plate == "33-BB-44"
    assert set(by_phone[PHONE_MANEL].docs_create) == {
        "vehicle_registration",
        "vehicle_insurance",
        "periodic_inspection",
        "tvde_sticker",
    }
    assert by_phone[PHONE_MARLY].expected_plate == PLATE_PROD_MARLY
    assert by_phone[PHONE_MARLY].vehicle_action == "create"


def test_apply_soft_preserves_file_path_and_creates_marly(
    db: Session, prod_like: None
) -> None:
    v11 = db.execute(
        select(Vehicle).where(Vehicle.plate_normalized == normalize_plate("11-AA-22"))
    ).scalar_one()
    before_paths = {
        d.document_type: d.file_path
        for d in db.execute(
            select(VehicleDocument).where(VehicleDocument.vehicle_id == v11.id)
        ).scalars()
    }
    assert before_paths["vehicle_registration"]
    make_before, model_before = v11.make, v11.model

    before = _counts(db)
    plan1 = apply_demo_vehicle_compliance_sync(db)
    db.commit()
    assert plan1.ok

    mid = _counts(db)
    assert mid["trips"] == before["trips"]
    assert mid["payments"] == before["payments"]
    assert mid["users"] == before["users"]
    assert mid["drivers"] == before["drivers"]
    # +1 Marly vehicle; docs: sticker+date_fix on 11, +4 on 33, +4 on Marly
    assert mid["vehicles"] == before["vehicles"] + 1

    v11 = db.execute(
        select(Vehicle).where(Vehicle.plate_normalized == normalize_plate("11-AA-22"))
    ).scalar_one()
    assert v11.make == make_before
    assert v11.model == model_before
    after_docs = {
        d.document_type: d
        for d in db.execute(
            select(VehicleDocument).where(VehicleDocument.vehicle_id == v11.id)
        ).scalars()
    }
    assert after_docs["vehicle_registration"].file_path == before_paths[
        "vehicle_registration"
    ]
    assert after_docs["vehicle_insurance"].file_path == before_paths["vehicle_insurance"]
    assert after_docs["periodic_inspection"].file_path == before_paths[
        "periodic_inspection"
    ]
    assert after_docs["periodic_inspection"].expires_at == DEMO_DOC_EXPIRES_AT
    assert after_docs["periodic_inspection"].status == "approved"
    assert after_docs["tvde_sticker"].file_path is None
    assert after_docs["tvde_sticker"].status == "approved"

    v_marly = db.execute(
        select(Vehicle).where(
            Vehicle.plate_normalized == normalize_plate(PLATE_PROD_MARLY)
        )
    ).scalar_one()
    assert v_marly.partner_id == BASELINE_PARTNER_FLEET_UUID
    u_marly = db.execute(select(User).where(User.phone == PHONE_MARLY)).scalar_one()
    d_marly = db.execute(
        select(Driver).where(Driver.user_id == u_marly.id)
    ).scalar_one()
    assert d_marly.active_vehicle_id == v_marly.id

    # 3/3 prod roster compliant
    for phone in (PHONE_DEFAULT_DRIVER, PHONE_MARLY, PHONE_MANEL):
        u = db.execute(select(User).where(User.phone == phone)).scalar_one()
        d = db.execute(select(Driver).where(Driver.user_id == u.id)).scalar_one()
        assert d.active_vehicle_id is not None
        v = db.get(Vehicle, d.active_vehicle_id)
        assert v is not None
        docs = list(
            db.execute(
                select(VehicleDocument).where(VehicleDocument.vehicle_id == v.id)
            ).scalars()
        )
        summary = summarize_vehicle_documents_rows(docs)
        assert (
            vehicle_compliance_status(
                summary, has_active_vehicle=True
            ).compliance_status
            == COMPLIANCE_COMPLIANT
        )

    plan2 = apply_demo_vehicle_compliance_sync(db)
    db.commit()
    after = _counts(db)
    assert after["vehicles"] == mid["vehicles"]
    assert after["docs"] == mid["docs"]
    assert plan2.ok
    assert all(
        all(a.startswith(("ok:", "preserve:")) for a in d.docs_actions)
        for d in plan2.drivers
    )


def test_non_test_user_aborts(db: Session, prod_like: None) -> None:
    user = db.execute(select(User).where(User.phone == PHONE_MARLY)).scalar_one()
    user.is_test_account = False
    db.flush()
    plan = build_demo_vehicle_compliance_sync_plan(db)
    assert not plan.ok
    assert any("is_test_account=false" in a for a in plan.aborts)
    with pytest.raises(DemoSyncAbort):
        apply_demo_vehicle_compliance_sync(db)


def test_active_trip_aborts(db: Session, prod_like: None) -> None:
    user = db.execute(select(User).where(User.phone == PHONE_MARLY)).scalar_one()
    pax = db.execute(select(User).where(User.role == Role.passenger)).scalars().first()
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


def test_partner_mismatch_aborts(db: Session, prod_like: None) -> None:
    vehicle = db.execute(
        select(Vehicle).where(Vehicle.plate_normalized == normalize_plate("11-AA-22"))
    ).scalar_one()
    vehicle.partner_id = DEFAULT_PARTNER_UUID
    db.flush()
    plan = build_demo_vehicle_compliance_sync_plan(db)
    assert not plan.ok
    assert any("partner=" in a for a in plan.aborts)


def test_wrong_holder_aborts(db: Session, prod_like: None) -> None:
    u_marly = db.execute(select(User).where(User.phone == PHONE_MARLY)).scalar_one()
    d_marly = db.execute(
        select(Driver).where(Driver.user_id == u_marly.id)
    ).scalar_one()
    v11 = db.execute(
        select(Vehicle).where(Vehicle.plate_normalized == normalize_plate("11-AA-22"))
    ).scalar_one()
    u_test = db.execute(
        select(User).where(User.phone == PHONE_DEFAULT_DRIVER)
    ).scalar_one()
    d_test = db.execute(select(Driver).where(Driver.user_id == u_test.id)).scalar_one()
    d_test.active_vehicle_id = None
    db.flush()
    d_marly.active_vehicle_id = v11.id
    db.flush()
    plan = build_demo_vehicle_compliance_sync_plan(db)
    assert not plan.ok
    assert any("expected holder" in a for a in plan.aborts)


def test_cli_guards_remote_and_confirm(monkeypatch: pytest.MonkeyPatch) -> None:
    import importlib.util
    from pathlib import Path

    path = (
        Path(__file__).resolve().parents[1]
        / "scripts"
        / "sync_demo_vehicle_compliance.py"
    )
    spec = importlib.util.spec_from_file_location("sync_demo_cli", path)
    assert spec and spec.loader
    cli = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(cli)

    monkeypatch.delenv("ALLOW_REMOTE_DEMO_SYNC", raising=False)
    with pytest.raises(SystemExit) as e1:
        cli._assert_remote_read_allowed(hostname="dpg-remote.example")
    assert e1.value.code == 2

    monkeypatch.setenv("ALLOW_REMOTE_DEMO_SYNC", "YES")
    cli._assert_remote_read_allowed(hostname="dpg-remote.example")

    monkeypatch.delenv("ALLOW_REMOTE_DEMO_SYNC", raising=False)
    with pytest.raises(SystemExit) as e2:
        cli._assert_apply_allowed(hostname="dpg-remote.example")
    assert e2.value.code == 2

    with pytest.raises(SystemExit) as e3:
        cli.main(["--apply"])
    assert e3.value.code == 2

    assert CONFIRM_TOKEN == "SYNC_DEMO_VEHICLE_COMPLIANCE"
    assert BASELINE_PARTNER_FLEET_UUID
