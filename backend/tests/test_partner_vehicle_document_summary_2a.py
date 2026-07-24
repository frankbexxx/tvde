"""PF3C-2A: document_summary on PartnerVehicleItem (batch list, FE-aligned)."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.auth.security import create_access_token
from app.db.models.partner import Partner
from app.db.models.user import User
from app.db.models.vehicle import Vehicle
from app.db.models.vehicle_document import VehicleDocument
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.enums import Role, UserStatus
from app.services.partner_vehicle_documents import (
    batch_document_summaries_for_vehicles,
    document_alert_slot_status,
    empty_vehicle_document_summary,
    summarize_vehicle_documents_rows,
)


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL requerido: {exc}")


NOW = datetime(2026, 7, 24, 12, 0, tzinfo=timezone.utc)


def _doc(
    *,
    vehicle_id: uuid.UUID,
    partner_id: uuid.UUID,
    document_type: str,
    status: str = "approved",
    expires_at: datetime | None = None,
) -> VehicleDocument:
    return VehicleDocument(
        id=uuid.uuid4(),
        vehicle_id=vehicle_id,
        partner_id=partner_id,
        document_type=document_type,
        status=status,
        expires_at=expires_at,
    )


def test_document_alert_slot_status_expired_pending() -> None:
    yesterday = datetime(2026, 7, 23, 0, 0, tzinfo=timezone.utc)
    assert (
        document_alert_slot_status(
            status_value="pending_review",
            expires_at=yesterday,
            now=NOW,
        )
        == "expired_pending"
    )
    assert (
        document_alert_slot_status(
            status_value="approved",
            expires_at=yesterday,
            now=NOW,
        )
        == "expired"
    )


def test_summarize_empty_and_all_valid() -> None:
    empty = summarize_vehicle_documents_rows([], now=NOW)
    assert empty.total_required == 4
    assert empty.missing_count == 4
    assert empty.worst_status == "missing"

    vid = uuid.uuid4()
    pid = uuid.uuid4()
    far = NOW + timedelta(days=60)
    rows = [
        _doc(
            vehicle_id=vid,
            partner_id=pid,
            document_type=t,
            status="approved",
            expires_at=far,
        )
        for t in (
            "vehicle_registration",
            "vehicle_insurance",
            "periodic_inspection",
            "tvde_sticker",
        )
    ]
    s = summarize_vehicle_documents_rows(rows, now=NOW)
    assert s.valid_count == 4
    assert s.missing_count == 0
    assert s.worst_status == "valid"


def test_summarize_status_buckets() -> None:
    vid = uuid.uuid4()
    pid = uuid.uuid4()
    far = NOW + timedelta(days=60)
    soon = NOW + timedelta(days=10)
    past = NOW - timedelta(days=2)

    def base_valid(extra: VehicleDocument) -> list[VehicleDocument]:
        types = {
            "vehicle_registration",
            "vehicle_insurance",
            "periodic_inspection",
            "tvde_sticker",
        }
        types.discard(extra.document_type)
        rows = [
            _doc(
                vehicle_id=vid,
                partner_id=pid,
                document_type=t,
                status="approved",
                expires_at=far,
            )
            for t in types
        ]
        rows.append(extra)
        return rows

    expired = summarize_vehicle_documents_rows(
        base_valid(
            _doc(
                vehicle_id=vid,
                partner_id=pid,
                document_type="vehicle_insurance",
                status="approved",
                expires_at=past,
            )
        ),
        now=NOW,
    )
    assert expired.expired_count == 1
    assert expired.worst_status == "expired"

    expiring = summarize_vehicle_documents_rows(
        base_valid(
            _doc(
                vehicle_id=vid,
                partner_id=pid,
                document_type="vehicle_insurance",
                status="approved",
                expires_at=soon,
            )
        ),
        now=NOW,
    )
    assert expiring.expiring_soon_count == 1
    assert expiring.worst_status == "expiring_soon"

    pending = summarize_vehicle_documents_rows(
        base_valid(
            _doc(
                vehicle_id=vid,
                partner_id=pid,
                document_type="vehicle_insurance",
                status="pending_review",
                expires_at=far,
            )
        ),
        now=NOW,
    )
    assert pending.pending_review_count == 1
    assert pending.worst_status == "pending_review"

    rejected = summarize_vehicle_documents_rows(
        base_valid(
            _doc(
                vehicle_id=vid,
                partner_id=pid,
                document_type="vehicle_insurance",
                status="rejected",
                expires_at=far,
            )
        ),
        now=NOW,
    )
    assert rejected.rejected_count == 1
    assert rejected.worst_status == "rejected"

    expired_pending = summarize_vehicle_documents_rows(
        base_valid(
            _doc(
                vehicle_id=vid,
                partner_id=pid,
                document_type="vehicle_insurance",
                status="pending_review",
                expires_at=past,
            )
        ),
        now=NOW,
    )
    assert expired_pending.expired_count == 1
    assert expired_pending.pending_review_count == 0
    assert expired_pending.worst_status == "expired_pending"


def test_batch_document_summaries_single_query(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Lista must not N+1: one execute for docs across vehicles."""
    vid1 = uuid.uuid4()
    vid2 = uuid.uuid4()
    pid = uuid.uuid4()

    class _Scalars:
        def all(self) -> list[VehicleDocument]:
            return [
                _doc(
                    vehicle_id=vid1,
                    partner_id=pid,
                    document_type="vehicle_insurance",
                    status="approved",
                    expires_at=NOW + timedelta(days=60),
                )
            ]

    class _Result:
        def scalars(self) -> _Scalars:
            return _Scalars()

    db = MagicMock()
    db.execute.return_value = _Result()

    out = batch_document_summaries_for_vehicles(
        db,
        partner_id=pid,
        vehicle_ids=[vid1, vid2],
        now=NOW,
    )
    assert db.execute.call_count == 1
    assert out[vid1].present_count == 1
    assert out[vid1].missing_count == 3
    assert out[vid2].missing_count == 4
    assert out[vid2].worst_status == "missing"


def _seed() -> dict[str, str]:
    db = SessionLocal()
    try:
        pid_a = uuid.uuid4()
        pid_b = uuid.uuid4()
        db.add_all(
            [
                Partner(id=pid_a, name="Fleet PF3C-2A A"),
                Partner(id=pid_b, name="Fleet PF3C-2A B"),
            ]
        )
        mgr_a = User(
            role=Role.partner,
            name="Mgr 2A Sum A",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
            partner_org_id=pid_a,
        )
        mgr_b = User(
            role=Role.partner,
            name="Mgr 2A Sum B",
            phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
            status=UserStatus.active,
            partner_org_id=pid_b,
        )
        db.add_all([mgr_a, mgr_b])
        db.flush()
        va = Vehicle(
            id=uuid.uuid4(),
            partner_id=pid_a,
            plate="SUM-11-AA",
            plate_normalized=f"SUM11AA{uuid.uuid4().hex[:4].upper()}",
            make="Toyota",
            model="Yaris",
            service_categories="x",
            status="active",
        )
        vb = Vehicle(
            id=uuid.uuid4(),
            partner_id=pid_b,
            plate="SUM-22-BB",
            plate_normalized=f"SUM22BB{uuid.uuid4().hex[:4].upper()}",
            make="VW",
            model="Polo",
            service_categories="x",
            status="active",
        )
        db.add_all([va, vb])
        db.commit()
        return {
            "veh_a": str(va.id),
            "veh_b": str(vb.id),
            "tok_a": create_access_token(subject=str(mgr_a.id), role=mgr_a.role.value)[
                "token"
            ],
            "tok_b": create_access_token(subject=str(mgr_b.id), role=mgr_b.role.value)[
                "token"
            ],
        }
    finally:
        db.close()


def test_partner_vehicles_list_includes_document_summary() -> None:
    seed = _seed()
    c = TestClient(app)
    ha = {"Authorization": f"Bearer {seed['tok_a']}"}
    hb = {"Authorization": f"Bearer {seed['tok_b']}"}

    r = c.get("/partner/vehicles", headers=ha)
    assert r.status_code == 200, r.text
    rows = r.json()
    assert len(rows) >= 1
    mine = next(v for v in rows if v["id"] == seed["veh_a"])
    assert "plate" in mine
    assert "document_summary" in mine
    s = mine["document_summary"]
    assert s["total_required"] == 4
    assert s["missing_count"] == 4
    assert s["worst_status"] == "missing"

    # Partner B vehicle not listed for A
    assert all(v["id"] != seed["veh_b"] for v in rows)

    # Create approved insurance far future → present_count 1, missing 3
    far = (datetime.now(timezone.utc) + timedelta(days=90)).isoformat().replace(
        "+00:00", "Z"
    )
    cr = c.post(
        f"/partner/vehicles/{seed['veh_a']}/documents",
        headers=ha,
        json={
            "document_type": "vehicle_insurance",
            "status": "approved",
            "expires_at": far,
        },
    )
    assert cr.status_code == 201, cr.text

    r2 = c.get(f"/partner/vehicles/{seed['veh_a']}", headers=ha)
    assert r2.status_code == 200
    s2 = r2.json()["document_summary"]
    assert s2["present_count"] == 1
    assert s2["missing_count"] == 3
    assert s2["valid_count"] == 1
    assert s2["worst_status"] == "missing"

    # Tenant: B cannot see A's vehicle summary
    assert c.get(f"/partner/vehicles/{seed['veh_a']}", headers=hb).status_code == 404

    listed_b = c.get("/partner/vehicles", headers=hb)
    assert listed_b.status_code == 200
    assert all(v["id"] != seed["veh_a"] for v in listed_b.json())
    vb = next(v for v in listed_b.json() if v["id"] == seed["veh_b"])
    assert vb["document_summary"]["missing_count"] == 4


def test_empty_vehicle_document_summary_helper() -> None:
    s = empty_vehicle_document_summary()
    assert s.missing_count == 4
    assert s.worst_status == "missing"
