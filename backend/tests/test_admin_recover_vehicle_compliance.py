"""Admin recover-driver must respect vehicle operational + compliance gates."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user, get_db
from app.core.config import settings
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.audit_event import AuditEvent
from app.db.models.driver import Driver
from app.db.models.user import User
from app.db.models.vehicle import Vehicle
from app.db.models.vehicle_document import VehicleDocument
from app.main import app
from app.models.enums import DriverStatus, Role, UserStatus
from app.services.partner_vehicle_documents import VEHICLE_DOCUMENT_REQUIRED_TYPES_ORDERED
from app.services.vehicle_compliance_gate import (
    CODE_DOCUMENTS_BLOCKED,
    CODE_NO_ACTIVE_VEHICLE,
)
from app.services.vehicle_operational import CODE_VEHICLE_INACTIVE

_GOVERNANCE = {"governance_reason": "recover stuck driver ops"}


def _create_vehicle_with_docs(
    db: Session,
    *,
    doc_mode: str = "compliant",
    vehicle_status: str = "active",
) -> uuid.UUID:
    plate_suffix = uuid.uuid4().hex[:8].upper()
    vehicle = Vehicle(
        partner_id=DEFAULT_PARTNER_UUID,
        plate=f"ARCV-{plate_suffix}",
        plate_normalized=f"ARCV{plate_suffix}",
        make="Test",
        model="Recover",
        status=vehicle_status,
    )
    db.add(vehicle)
    db.flush()
    now = datetime.now(timezone.utc)
    if doc_mode == "none":
        db.commit()
        return vehicle.id
    for i, doc_type in enumerate(VEHICLE_DOCUMENT_REQUIRED_TYPES_ORDERED):
        status = "approved"
        expires_at = now + timedelta(days=365)
        if doc_mode == "blocked_expired" and i == 0:
            expires_at = now - timedelta(days=1)
        elif doc_mode == "blocked_rejected" and i == 0:
            status = "rejected"
            expires_at = now + timedelta(days=365)
        elif doc_mode == "warning_pending" and i == 0:
            status = "pending_review"
            expires_at = now + timedelta(days=365)
        elif doc_mode == "warning_expiring" and i == 0:
            expires_at = now + timedelta(days=10)
        db.add(
            VehicleDocument(
                vehicle_id=vehicle.id,
                partner_id=DEFAULT_PARTNER_UUID,
                document_type=doc_type,
                status=status,
                expires_at=expires_at,
            )
        )
    db.commit()
    return vehicle.id


def _create_driver(
    db: Session,
    *,
    is_available: bool = False,
    active_vehicle_id: uuid.UUID | None = None,
) -> uuid.UUID:
    user = User(
        role=Role.driver,
        name=f"Recover Gate {uuid.uuid4()}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(user)
    db.flush()
    db.add(
        Driver(
            partner_id=DEFAULT_PARTNER_UUID,
            user_id=user.id,
            status=DriverStatus.approved,
            commission_percent=15.0,
            is_available=is_available,
            vehicle_categories="x",
            active_vehicle_id=active_vehicle_id,
        )
    )
    db.commit()
    return user.id


def _admin_client(db: Session) -> TestClient:
    admin_id = str(uuid.uuid4())

    async def override_user() -> UserContext:
        return UserContext(user_id=admin_id, role=Role.admin)

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[get_db] = override_db
    return TestClient(app)


def _cleanup_overrides() -> None:
    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(get_db, None)


def _recover_audits(db: Session, driver_id: uuid.UUID) -> list[AuditEvent]:
    return list(
        db.execute(
            select(AuditEvent).where(
                AuditEvent.event_type == "admin.driver_recover",
                AuditEvent.entity_id == str(driver_id),
            )
        )
        .scalars()
        .all()
    )


def test_recover_flag_off_allows_incompliant_vehicle(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A: flag OFF + missing docs → recover keeps pre-gate behaviour."""
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", False, raising=False)
    vid = _create_vehicle_with_docs(db, doc_mode="none")
    driver_id = _create_driver(db, is_available=False, active_vehicle_id=vid)
    client = _admin_client(db)
    try:
        r = client.post(f"/admin/recover-driver/{driver_id}", json=_GOVERNANCE)
        assert r.status_code == 200
        assert r.json()["is_available"] is True
        row = db.get(Driver, driver_id)
        assert row is not None and row.is_available is True
        assert len(_recover_audits(db, driver_id)) == 1
    finally:
        _cleanup_overrides()


def test_recover_flag_on_compliant_allows(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    """B: flag ON + compliant → recover OK."""
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", True, raising=False)
    vid = _create_vehicle_with_docs(db, doc_mode="compliant")
    driver_id = _create_driver(db, is_available=False, active_vehicle_id=vid)
    client = _admin_client(db)
    try:
        r = client.post(f"/admin/recover-driver/{driver_id}", json=_GOVERNANCE)
        assert r.status_code == 200
        assert r.json()["is_available"] is True
        row = db.get(Driver, driver_id)
        assert row is not None and row.is_available is True
    finally:
        _cleanup_overrides()


def test_recover_flag_on_no_active_vehicle_blocks(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    """C: flag ON + no active_vehicle_id → 409, availability unchanged."""
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", True, raising=False)
    driver_id = _create_driver(db, is_available=False, active_vehicle_id=None)
    client = _admin_client(db)
    try:
        r = client.post(f"/admin/recover-driver/{driver_id}", json=_GOVERNANCE)
        assert r.status_code == 409
        assert r.json()["detail"] == CODE_NO_ACTIVE_VEHICLE
        row = db.get(Driver, driver_id)
        assert row is not None and row.is_available is False
        assert _recover_audits(db, driver_id) == []
    finally:
        _cleanup_overrides()


@pytest.mark.parametrize(
    "doc_mode",
    ["none", "blocked_expired", "blocked_rejected"],
)
def test_recover_flag_on_blocked_docs_blocks(
    db: Session, monkeypatch: pytest.MonkeyPatch, doc_mode: str
) -> None:
    """D: flag ON + missing/expired/rejected → 409, no side effects."""
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", True, raising=False)
    vid = _create_vehicle_with_docs(db, doc_mode=doc_mode)
    driver_id = _create_driver(db, is_available=False, active_vehicle_id=vid)
    client = _admin_client(db)
    try:
        r = client.post(f"/admin/recover-driver/{driver_id}", json=_GOVERNANCE)
        assert r.status_code == 409
        assert r.json()["detail"] == CODE_DOCUMENTS_BLOCKED
        row = db.get(Driver, driver_id)
        assert row is not None and row.is_available is False
        assert _recover_audits(db, driver_id) == []
    finally:
        _cleanup_overrides()


@pytest.mark.parametrize("doc_mode", ["warning_pending", "warning_expiring"])
def test_recover_flag_on_warning_docs_allow(
    db: Session, monkeypatch: pytest.MonkeyPatch, doc_mode: str
) -> None:
    """E: pending_review / expiring_soon → recover allowed."""
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", True, raising=False)
    vid = _create_vehicle_with_docs(db, doc_mode=doc_mode)
    driver_id = _create_driver(db, is_available=False, active_vehicle_id=vid)
    client = _admin_client(db)
    try:
        r = client.post(f"/admin/recover-driver/{driver_id}", json=_GOVERNANCE)
        assert r.status_code == 200
        assert r.json()["is_available"] is True
        row = db.get(Driver, driver_id)
        assert row is not None and row.is_available is True
    finally:
        _cleanup_overrides()


def test_recover_inactive_vehicle_blocks_even_flag_off(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    """F: vehicle inactive → blocked by P0-03 regardless of compliance flag."""
    monkeypatch.setattr(settings, "ENABLE_VEHICLE_COMPLIANCE_GATES", False, raising=False)
    vid = _create_vehicle_with_docs(
        db, doc_mode="compliant", vehicle_status="inactive"
    )
    driver_id = _create_driver(db, is_available=False, active_vehicle_id=vid)
    client = _admin_client(db)
    try:
        r = client.post(f"/admin/recover-driver/{driver_id}", json=_GOVERNANCE)
        assert r.status_code == 409
        assert r.json()["detail"] == CODE_VEHICLE_INACTIVE
        row = db.get(Driver, driver_id)
        assert row is not None and row.is_available is False
        assert _recover_audits(db, driver_id) == []
    finally:
        _cleanup_overrides()
