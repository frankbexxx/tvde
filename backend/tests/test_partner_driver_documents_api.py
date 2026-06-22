"""Partner driver documents — approve guard (D18)."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.auth.security import create_access_token
from app.core.config import settings
from app.db.models.driver import Driver
from app.db.models.partner import Partner
from app.db.models.user import User
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.enums import DriverStatus, Role, UserStatus
from app.services.driver_documents import DOC_KEYS, serialize_state


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL requerido: {exc}")


def test_partner_cannot_approve_document_without_file() -> None:
    db = SessionLocal()
    try:
        pid = uuid.uuid4()
        db.add(Partner(id=pid, name="Doc Guard"))
        u_d = User(
            role=Role.driver,
            name="Doc Driver",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        u_p = User(
            role=Role.partner,
            name="Doc Partner",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
            partner_org_id=pid,
        )
        db.add_all([u_d, u_p])
        db.flush()
        db.add(
            Driver(
                user_id=u_d.id,
                partner_id=pid,
                status=DriverStatus.approved,
                commission_percent=10.0,
                is_available=False,
            )
        )
        db.commit()
        driver_id = str(u_d.id)
        partner_tok = create_access_token(subject=str(u_p.id), role=u_p.role.value)["token"]
    finally:
        db.close()

    c = TestClient(app)
    r = c.patch(
        f"/partner/drivers/{driver_id}/documents",
        json={"docs": {"carta_tvde": {"status": "approved"}}},
        headers={"Authorization": f"Bearer {partner_tok}"},
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "document_file_required"


def test_partner_can_approve_document_after_driver_upload() -> None:
    db = SessionLocal()
    try:
        pid = uuid.uuid4()
        db.add(Partner(id=pid, name="Doc Upload"))
        u_d = User(
            role=Role.driver,
            name="Upload Driver",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        u_p = User(
            role=Role.partner,
            name="Upload Partner",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
            partner_org_id=pid,
        )
        db.add_all([u_d, u_p])
        db.flush()
        db.add(
            Driver(
                user_id=u_d.id,
                partner_id=pid,
                status=DriverStatus.approved,
                commission_percent=10.0,
                is_available=False,
            )
        )
        db.commit()
        driver_id = str(u_d.id)
        driver_tok = create_access_token(subject=str(u_d.id), role=u_d.role.value)["token"]
        partner_tok = create_access_token(subject=str(u_p.id), role=u_p.role.value)["token"]
    finally:
        db.close()

    c = TestClient(app)
    r_up = c.post(
        "/driver/documents/carta_tvde/upload",
        headers={"Authorization": f"Bearer {driver_tok}"},
        files={"file": ("licenca.pdf", b"%PDF-1.4 minimal", "application/pdf")},
    )
    assert r_up.status_code == 200

    r = c.patch(
        f"/partner/drivers/{driver_id}/documents",
        json={"docs": {"carta_tvde": {"status": "approved"}}},
        headers={"Authorization": f"Bearer {partner_tok}"},
    )
    assert r.status_code == 200
    assert r.json()["documents"]["carta_tvde"]["status"] == "approved"


def test_driver_upload_sets_pending_review_status() -> None:
    db = SessionLocal()
    try:
        pid = uuid.uuid4()
        db.add(Partner(id=pid, name="Doc Upload Status"))
        u_d = User(
            role=Role.driver,
            name="Upload Status Driver",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        db.add(u_d)
        db.flush()
        db.add(
            Driver(
                user_id=u_d.id,
                partner_id=pid,
                status=DriverStatus.approved,
                commission_percent=10.0,
                is_available=False,
            )
        )
        db.commit()
        driver_tok = create_access_token(subject=str(u_d.id), role=u_d.role.value)["token"]
    finally:
        db.close()

    c = TestClient(app)
    r_up = c.post(
        "/driver/documents/carta_tvde/upload",
        headers={"Authorization": f"Bearer {driver_tok}"},
        files={"file": ("licenca.pdf", b"%PDF-1.4 minimal", "application/pdf")},
    )
    assert r_up.status_code == 200
    assert r_up.json()["docs"]["carta_tvde"]["status"] == "pending_review"
    assert r_up.json()["docs"]["carta_tvde"].get("submitted_at")

    r_get = c.get(
        "/driver/documents",
        headers={"Authorization": f"Bearer {driver_tok}"},
    )
    assert r_get.status_code == 200
    assert r_get.json()["docs"]["carta_tvde"]["status"] == "pending_review"


def test_driver_replacement_upload_resets_approved_document_to_review(monkeypatch) -> None:
    monkeypatch.setattr(settings, "DRIVER_DOCUMENTS_GATE_ENABLED", True)
    db = SessionLocal()
    try:
        pid = uuid.uuid4()
        db.add(Partner(id=pid, name="Doc Replacement"))
        u_d = User(
            role=Role.driver,
            name="Replacement Driver",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        db.add(u_d)
        db.flush()
        approved_docs = serialize_state(
            {
                "version": 1,
                "docs": {
                    key: {"status": "approved", "file_path": f"{key}/old.pdf"}
                    for key in DOC_KEYS
                },
            }
        )
        db.add(
            Driver(
                user_id=u_d.id,
                partner_id=pid,
                status=DriverStatus.approved,
                documents=approved_docs,
                commission_percent=10.0,
                is_available=True,
            )
        )
        db.commit()
        driver_id = u_d.id
        driver_tok = create_access_token(subject=str(u_d.id), role=u_d.role.value)["token"]
    finally:
        db.close()

    c = TestClient(app)
    r_up = c.post(
        "/driver/documents/carta_tvde/upload",
        headers={"Authorization": f"Bearer {driver_tok}"},
        files={"file": ("nova-licenca.pdf", b"%PDF-1.4 replacement", "application/pdf")},
    )

    assert r_up.status_code == 200
    assert r_up.json()["docs"]["carta_tvde"]["status"] == "pending_review"
    assert r_up.json()["docs"]["carta_tvde"]["file_name"] == "nova-licenca.pdf"

    db = SessionLocal()
    try:
        driver = db.get(Driver, driver_id)
        assert driver is not None
        assert driver.is_available is False
    finally:
        db.close()
