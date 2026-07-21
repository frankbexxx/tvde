"""PARTNER-FLEET-3A: vehicle_documents API (tenant-safe, upload local)."""

from __future__ import annotations

import io
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException as FastAPIHTTPException
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.auth.security import create_access_token
from app.db.models.driver import Driver
from app.db.models.partner import Partner
from app.db.models.user import User
from app.db.models.vehicle import Vehicle
from app.db.models.vehicle_document import VehicleDocument
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.enums import DriverStatus, Role, UserStatus
from app.services.partner_vehicle_documents import compute_vehicle_document_status
from app.services.vehicle_document_upload import resolve_vehicle_document_path


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL requerido: {exc}")


def test_compute_vehicle_document_status() -> None:
    now = datetime(2026, 7, 21, tzinfo=timezone.utc)
    assert (
        compute_vehicle_document_status(
            status_value="rejected", expires_at=None, now=now
        )
        == "rejected"
    )
    assert (
        compute_vehicle_document_status(
            status_value="pending_review", expires_at=None, now=now
        )
        == "pending_review"
    )
    assert (
        compute_vehicle_document_status(
            status_value="approved",
            expires_at=now - timedelta(days=1),
            now=now,
        )
        == "expired"
    )
    assert (
        compute_vehicle_document_status(
            status_value="approved",
            expires_at=now + timedelta(days=10),
            now=now,
        )
        == "expiring_soon"
    )
    assert (
        compute_vehicle_document_status(
            status_value="approved",
            expires_at=now + timedelta(days=60),
            now=now,
        )
        == "valid"
    )


def _seed() -> dict[str, str]:
    db = SessionLocal()
    try:
        pid_a = uuid.uuid4()
        pid_b = uuid.uuid4()
        db.add_all(
            [
                Partner(id=pid_a, name="Fleet 3A A"),
                Partner(id=pid_b, name="Fleet 3A B"),
            ]
        )
        mgr_a = User(
            role=Role.partner,
            name="Mgr 3A A",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
            partner_org_id=pid_a,
        )
        mgr_b = User(
            role=Role.partner,
            name="Mgr 3A B",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
            partner_org_id=pid_b,
        )
        u_d = User(
            role=Role.driver,
            name="Driver 3A",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
        )
        db.add_all([mgr_a, mgr_b, u_d])
        db.flush()
        db.add(
            Driver(
                user_id=u_d.id,
                partner_id=pid_a,
                status=DriverStatus.approved,
                commission_percent=15.0,
                is_available=True,
            )
        )
        va = Vehicle(
            id=uuid.uuid4(),
            partner_id=pid_a,
            plate="AA-11-BB",
            plate_normalized=f"AA11BB{uuid.uuid4().hex[:4].upper()}",
            make="Toyota",
            model="Corolla",
            service_categories="x",
            status="active",
        )
        vb = Vehicle(
            id=uuid.uuid4(),
            partner_id=pid_b,
            plate="CC-22-DD",
            plate_normalized=f"CC22DD{uuid.uuid4().hex[:4].upper()}",
            make="VW",
            model="Golf",
            service_categories="x",
            status="active",
        )
        db.add_all([va, vb])
        db.commit()
        return {
            "pid_a": str(pid_a),
            "pid_b": str(pid_b),
            "veh_a": str(va.id),
            "veh_b": str(vb.id),
            "tok_a": create_access_token(subject=str(mgr_a.id), role=mgr_a.role.value)[
                "token"
            ],
            "tok_b": create_access_token(subject=str(mgr_b.id), role=mgr_b.role.value)[
                "token"
            ],
            "driver_a": str(u_d.id),
        }
    finally:
        db.close()


def test_partner_vehicle_documents_crud_upload_tenant() -> None:
    seed = _seed()
    c = TestClient(app)
    ha = {"Authorization": f"Bearer {seed['tok_a']}"}
    hb = {"Authorization": f"Bearer {seed['tok_b']}"}
    veh_a = seed["veh_a"]
    veh_b = seed["veh_b"]

    # 1) create P0 OK
    r = c.post(
        f"/partner/vehicles/{veh_a}/documents",
        headers=ha,
        json={
            "document_type": "vehicle_insurance",
            "document_number": "POL-1",
            "issuer": "Seguradora X",
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=60)).isoformat(),
            "status": "approved",
        },
    )
    assert r.status_code == 201, r.text
    doc = r.json()
    assert doc["document_type"] == "vehicle_insurance"
    assert doc["computed_status"] == "valid"
    assert doc["has_file"] is False
    doc_id = doc["id"]

    # 2) invalid type
    r_bad = c.post(
        f"/partner/vehicles/{veh_a}/documents",
        headers=ha,
        json={"document_type": "spaceship_license"},
    )
    assert r_bad.status_code == 400
    assert r_bad.json()["detail"] == "invalid_document_type"

    # 3) list
    r_list = c.get(f"/partner/vehicles/{veh_a}/documents", headers=ha)
    assert r_list.status_code == 200
    assert len(r_list.json()) == 1

    # 4) patch
    r_patch = c.patch(
        f"/partner/vehicles/{veh_a}/documents/{doc_id}",
        headers=ha,
        json={
            "notes": "ok",
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=10)).isoformat(),
        },
    )
    assert r_patch.status_code == 200
    assert r_patch.json()["notes"] == "ok"
    assert r_patch.json()["computed_status"] == "expiring_soon"

    # 5) unique type → 409
    r_dup = c.post(
        f"/partner/vehicles/{veh_a}/documents",
        headers=ha,
        json={"document_type": "vehicle_insurance"},
    )
    assert r_dup.status_code == 409
    assert r_dup.json()["detail"] == "document_type_exists"

    # 6) tenant — B cannot list/patch/download A
    assert c.get(f"/partner/vehicles/{veh_a}/documents", headers=hb).status_code == 404
    assert (
        c.patch(
            f"/partner/vehicles/{veh_a}/documents/{doc_id}",
            headers=hb,
            json={"notes": "hack"},
        ).status_code
        == 404
    )

    # 7-8) upload + download
    files = {"file": ("apolice.pdf", io.BytesIO(b"%PDF-1.4 fake"), "application/pdf")}
    r_up = c.post(
        f"/partner/vehicles/{veh_a}/documents/{doc_id}/upload",
        headers=ha,
        files=files,
    )
    assert r_up.status_code == 200, r_up.text
    assert r_up.json()["has_file"] is True
    assert r_up.json()["file_name"] == "apolice.pdf"
    assert r_up.json()["status"] == "pending_review"

    r_approve = c.patch(
        f"/partner/vehicles/{veh_a}/documents/{doc_id}",
        headers=ha,
        json={"status": "approved"},
    )
    assert r_approve.status_code == 200, r_approve.text
    assert r_approve.json()["status"] == "approved"
    assert r_approve.json()["reviewed_by"] is not None
    assert r_approve.json()["reviewed_at"] is not None

    replacement = {
        "file": (
            "apolice-renovada.pdf",
            io.BytesIO(b"%PDF-1.5 replacement"),
            "application/pdf",
        )
    }
    r_replace = c.post(
        f"/partner/vehicles/{veh_a}/documents/{doc_id}/upload",
        headers=ha,
        files=replacement,
    )
    assert r_replace.status_code == 200, r_replace.text
    assert r_replace.json()["file_name"] == "apolice-renovada.pdf"
    assert r_replace.json()["status"] == "pending_review"
    assert r_replace.json()["reviewed_by"] is None
    assert r_replace.json()["reviewed_at"] is None

    r_dl = c.get(
        f"/partner/vehicles/{veh_a}/documents/{doc_id}/file",
        headers=ha,
    )
    assert r_dl.status_code == 200
    assert r_dl.content.startswith(b"%PDF")

    assert (
        c.get(
            f"/partner/vehicles/{veh_a}/documents/{doc_id}/file",
            headers=hb,
        ).status_code
        == 404
    )

    # 9) path traversal blocked (poison file_path)
    db = SessionLocal()
    try:
        row = db.get(VehicleDocument, uuid.UUID(doc_id))
        assert row is not None
        row.file_path = "../etc/passwd"
        db.commit()
    finally:
        db.close()
    db2 = SessionLocal()
    try:
        with pytest.raises(FastAPIHTTPException) as exc_info:
            resolve_vehicle_document_path(
                db2,
                partner_id=seed["pid_a"],
                vehicle_id=uuid.UUID(veh_a),
                document_id=uuid.UUID(doc_id),
            )
        assert exc_info.value.status_code == 404
    finally:
        db2.close()

    # 10) hard delete
    r_del = c.delete(
        f"/partner/vehicles/{veh_a}/documents/{doc_id}",
        headers=ha,
    )
    assert r_del.status_code == 204
    assert c.get(f"/partner/vehicles/{veh_a}/documents", headers=ha).json() == []

    # create again after delete (slot free)
    r_again = c.post(
        f"/partner/vehicles/{veh_a}/documents",
        headers=ha,
        json={"document_type": "vehicle_insurance"},
    )
    assert r_again.status_code == 201

    # B vehicle isolation
    r_b = c.post(
        f"/partner/vehicles/{veh_b}/documents",
        headers=hb,
        json={"document_type": "tvde_sticker"},
    )
    assert r_b.status_code == 201
    assert c.get(f"/partner/vehicles/{veh_b}/documents", headers=ha).status_code == 404

    # 11) regression: vehicles list + assign still OK; driver docs endpoint untouched shape
    r_veh = c.get("/partner/vehicles", headers=ha)
    assert r_veh.status_code == 200
    assert any(v["id"] == veh_a for v in r_veh.json())

    r_as = c.post(
        f"/partner/vehicles/{veh_a}/assign",
        headers=ha,
        json={"driver_user_id": seed["driver_a"]},
    )
    assert r_as.status_code == 200

    r_drv_docs = c.get(f"/partner/drivers/{seed['driver_a']}", headers=ha)
    assert r_drv_docs.status_code == 200
    assert "documents" in r_drv_docs.json()
