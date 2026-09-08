"""G-KYC-P0-02: Admin GET /kyc-supervision read-only."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user
from app.db.models.driver import Driver
from app.db.models.partner import Partner
from app.db.models.user import User
from app.db.models.vehicle import Vehicle
from app.db.models.vehicle_document import VehicleDocument
from app.main import app
from app.models.enums import DriverStatus, Role, UserStatus
from app.services.driver_documents import default_docs_dict, serialize_state


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def admin_auth_override() -> None:
    async def _fake_admin() -> UserContext:
        return UserContext(user_id=str(uuid.uuid4()), role=Role.admin)

    app.dependency_overrides[get_current_user] = _fake_admin
    yield
    app.dependency_overrides.pop(get_current_user, None)


def test_kyc_supervision_requires_auth(client: TestClient) -> None:
    r = client.get("/admin/kyc-supervision")
    assert r.status_code == 401


def test_kyc_supervision_forbidden_for_driver(
    client: TestClient, db: Session
) -> None:
    async def _fake_driver() -> UserContext:
        return UserContext(user_id=str(uuid.uuid4()), role=Role.driver)

    app.dependency_overrides[get_current_user] = _fake_driver
    try:
        r = client.get("/admin/kyc-supervision")
        assert r.status_code == 403
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_kyc_supervision_aggregates_driver_and_vehicle(
    client: TestClient, db: Session, admin_auth_override: None
) -> None:
    pid = uuid.uuid4()
    db.add(Partner(id=pid, name="KYC Fleet"))
    u = User(
        role=Role.driver,
        name="KYC Driver",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(u)
    db.flush()
    docs = default_docs_dict()
    docs["carta_tvde"] = {
        "status": "approved",
        "expires_at": (datetime.now(timezone.utc) - timedelta(days=2)).strftime(
            "%Y-%m-%dT00:00:00Z"
        ),
        "file_path": "x/carta.pdf",
    }
    docs["registo_criminal"] = {"status": "pending_review"}
    db.add(
        Driver(
            user_id=u.id,
            partner_id=pid,
            status=DriverStatus.approved,
            commission_percent=15.0,
            documents=serialize_state({"version": 1, "docs": docs}),
        )
    )
    v = Vehicle(
        partner_id=pid,
        plate="AA-00-KYC",
        plate_normalized=f"AA00KYC{uuid.uuid4().hex[:6].upper()}",
        make="Test",
        model="Car",
        status="inactive",
    )
    db.add(v)
    db.flush()
    soon = datetime.now(timezone.utc) + timedelta(days=5)
    db.add(
        VehicleDocument(
            vehicle_id=v.id,
            partner_id=pid,
            document_type="vehicle_insurance",
            status="approved",
            expires_at=soon,
            file_path="v/ins.pdf",
        )
    )
    db.commit()

    r = client.get("/admin/kyc-supervision")
    assert r.status_code == 200
    body = r.json()
    assert body["subject"] == "kyc_supervision"
    assert body["alerts"]["drivers_with_expired_docs"] >= 1
    assert body["alerts"]["drivers_with_pending_or_rejected_docs"] >= 1
    assert body["alerts"]["vehicles_inactive"] >= 1
    assert body["alerts"]["vehicles_with_expiring_soon_docs"] >= 1

    drv = next(d for d in body["drivers"] if d["user_id"] == str(u.id))
    assert drv["partner_name"] == "KYC Fleet"
    assert drv["driver_status"] == "approved"
    carta = next(x for x in drv["documents"] if x["doc_key"] == "carta_tvde")
    assert carta["is_expired"] is True

    veh = next(x for x in body["vehicles"] if x["vehicle_id"] == str(v.id))
    assert veh["status"] == "inactive"
    assert veh["plate"] == "AA-00-KYC"
    ins = next(x for x in veh["documents"] if x["doc_key"] == "vehicle_insurance")
    assert ins["is_expiring_soon"] is True


def test_kyc_supervision_get_is_idempotent_no_mutation(
    client: TestClient, admin_auth_override: None
) -> None:
    r1 = client.get("/admin/kyc-supervision")
    r2 = client.get("/admin/kyc-supervision")
    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r1.json()["alerts"] == r2.json()["alerts"]
