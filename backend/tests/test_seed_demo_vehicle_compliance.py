"""Baseline DEMO vehicle compliance seed (G-KYC-P0-04 readiness)."""

from __future__ import annotations

import pytest
from sqlalchemy import select, text
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.db.models.driver import Driver
from app.db.models.user import User
from app.db.models.vehicle import Vehicle
from app.db.models.vehicle_document import VehicleDocument
from app.db.session import engine
from app.models.enums import DriverStatus
from app.services.baseline_reset import (
    BASELINE_USERS,
    assert_baseline_state,
    run_full_baseline_reset,
)
from app.services.partner_vehicle_documents import (
    VEHICLE_DOCUMENT_REQUIRED_TYPES_ORDERED,
    summarize_vehicle_documents_rows,
)
from app.services.seed_demo_vehicle_compliance import (
    DEMO_VEHICLE_SPECS,
    ensure_baseline_demo_vehicle_compliance,
)
from app.services.vehicle_compliance_gate import (
    evaluate_driver_new_trip_ops_eligibility,
)
from app.services.vehicle_document_compliance import (
    COMPLIANCE_COMPLIANT,
    vehicle_compliance_status,
)

TEST_PWD = "demo-seed-pass-123456"


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL requerido: {exc}")


def test_baseline_roster_includes_fourth_demo_driver() -> None:
    phones = {p for p, _, _ in BASELINE_USERS}
    assert "+351911111114" in phones
    assert len(BASELINE_USERS) == 11


def test_demo_vehicle_seed_after_baseline_reset(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ADMIN_PHONE", "+351924075365", raising=False)
    monkeypatch.setattr(settings, "TEST_ACCOUNT_PASSWORD", TEST_PWD, raising=False)

    run_full_baseline_reset(db)
    assert_baseline_state(db)

    drivers = list(db.execute(select(Driver)).scalars().all())
    assert len(drivers) == 4
    assert all(d.active_vehicle_id is not None for d in drivers)
    assert all(d.status == DriverStatus.approved for d in drivers)

    vehicles = list(
        db.execute(select(Vehicle).options(selectinload(Vehicle.documents)))
        .scalars()
        .all()
    )
    assert len(vehicles) == 4
    assert all((v.status or "").lower() == "active" for v in vehicles)

    for v in vehicles:
        types = {d.document_type for d in (v.documents or [])}
        assert set(VEHICLE_DOCUMENT_REQUIRED_TYPES_ORDERED) <= types
        summary = summarize_vehicle_documents_rows(list(v.documents or []))
        result = vehicle_compliance_status(summary, has_active_vehicle=True)
        assert result.compliance_status == COMPLIANCE_COMPLIANT

    phone_to_id = {
        u.phone: u.id
        for u in db.execute(select(User)).scalars().all()
        if u.phone
    }
    before_v = db.execute(select(Vehicle.id)).all()
    before_d = db.execute(select(VehicleDocument.id)).all()
    ensure_baseline_demo_vehicle_compliance(db, phone_to_user_id=phone_to_id)
    db.commit()
    after_v = db.execute(select(Vehicle.id)).all()
    after_d = db.execute(select(VehicleDocument.id)).all()
    assert len(after_v) == len(before_v) == 4
    assert len(after_d) == len(before_d) == 16

    driver_users = {
        u.id: u
        for u in db.execute(select(User)).scalars().all()
        if any(d.user_id == u.id for d in drivers)
    }
    assert all(u.is_test_account for u in driver_users.values())

    plates = {v.plate for v in vehicles}
    assert {"DEMO-DF-01", "11-AA-22", "33-BB-44", "DEMO-TP-03"} <= plates
    assert len(DEMO_VEHICLE_SPECS) == 4


def test_demo_seed_would_block_zero_if_gate_on(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ADMIN_PHONE", "+351924075365", raising=False)
    monkeypatch.setattr(settings, "TEST_ACCOUNT_PASSWORD", TEST_PWD, raising=False)
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", True, raising=False)

    run_full_baseline_reset(db)
    drivers = list(db.execute(select(Driver)).scalars().all())
    blocked = sum(
        1
        for d in drivers
        if not evaluate_driver_new_trip_ops_eligibility(db, d).allowed
    )
    assert blocked == 0
