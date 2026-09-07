"""L-12 Complaint foundation — API, history, retention, RBAC."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.audit_event import AuditEvent
from app.db.models.complaint import Complaint, ComplaintHistory
from app.db.models.driver import Driver
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal
from app.main import app
from app.models.enums import (
    ComplaintCategory,
    ComplaintHistoryEventType,
    ComplaintStatus,
    DriverStatus,
    Role,
    TripStatus,
    UserStatus,
)
from app.services.cleanup import run_cleanup
from app.services.complaint_retention import add_calendar_years, compute_retention_until
from app.services.complaints import PUBLIC_REF_MAX_ATTEMPTS, create_complaint, generate_public_reference


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def _make_passenger(db: Session) -> User:
    u = User(
        role=Role.passenger,
        name=f"Pax {uuid.uuid4().hex[:6]}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(u)
    db.flush()
    return u


def _make_driver(db: Session) -> tuple[User, Driver]:
    u = User(
        role=Role.driver,
        name=f"Drv {uuid.uuid4().hex[:6]}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(u)
    db.flush()
    d = Driver(
        partner_id=DEFAULT_PARTNER_UUID,
        user_id=u.id,
        status=DriverStatus.approved,
        commission_percent=15.0,
        is_available=True,
    )
    db.add(d)
    db.commit()
    return u, d


def _make_admin(db: Session) -> User:
    u = User(
        role=Role.admin,
        name=f"Adm {uuid.uuid4().hex[:6]}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(u)
    db.commit()
    return u


def _make_trip(
    db: Session,
    *,
    passenger: User,
    driver: User | None,
    status: TripStatus = TripStatus.completed,
) -> Trip:
    trip = Trip(
        passenger_id=passenger.id,
        driver_id=driver.id if driver else None,
        status=status,
        origin_lat=38.7223,
        origin_lng=-9.1393,
        destination_lat=38.7369,
        destination_lng=-9.1427,
        estimated_price=10.0,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


def _auth(user: User, role: Role):
    async def _fake() -> UserContext:
        return UserContext(user_id=str(user.id), role=role)

    app.dependency_overrides[get_current_user] = _fake


def _clear_auth() -> None:
    app.dependency_overrides.pop(get_current_user, None)


def test_add_calendar_years_leap_day_to_non_leap() -> None:
    submitted = datetime(2024, 2, 29, 12, 0, tzinfo=timezone.utc)
    until = add_calendar_years(submitted, 2)
    assert until == datetime(2026, 3, 1, 12, 0, tzinfo=timezone.utc)
    assert compute_retention_until(submitted) == until


def test_add_calendar_years_non_leap() -> None:
    submitted = datetime(2025, 3, 1, 8, 0, tzinfo=timezone.utc)
    assert add_calendar_years(submitted, 2) == datetime(2027, 3, 1, 8, 0, tzinfo=timezone.utc)


def test_public_reference_format() -> None:
    ref = generate_public_reference(when=datetime(2026, 9, 7, tzinfo=timezone.utc))
    assert ref.startswith("CMP-2026-")
    assert len(ref) == len("CMP-2026-") + 8


def test_passenger_create_list_detail(client: TestClient) -> None:
    db = SessionLocal()
    try:
        pax = _make_passenger(db)
        db.commit()
        _auth(pax, Role.passenger)
        r = client.post(
            "/complaints",
            json={
                "category": "account_app",
                "description": "App crash on login screen.",
            },
        )
        assert r.status_code == 201, r.text
        body = r.json()
        assert body["public_reference"].startswith("CMP-")
        assert body["status"] == "received"
        assert body["resolution"] is None
        assert "assigned_to" not in body
        ref = body["public_reference"]

        listed = client.get("/complaints")
        assert listed.status_code == 200
        assert any(x["public_reference"] == ref for x in listed.json())

        detail = client.get(f"/complaints/{ref}")
        assert detail.status_code == 200
        assert detail.json()["description"].startswith("App crash")
    finally:
        _clear_auth()
        db.close()


def test_driver_create_with_own_trip(client: TestClient) -> None:
    db = SessionLocal()
    try:
        pax = _make_passenger(db)
        drv_u, _ = _make_driver(db)
        trip = _make_trip(db, passenger=pax, driver=drv_u, status=TripStatus.cancelled)
        _auth(drv_u, Role.driver)
        r = client.post(
            "/complaints",
            json={
                "category": "trip_service",
                "description": "Passenger no-show dispute.",
                "trip_id": str(trip.id),
            },
        )
        assert r.status_code == 201, r.text
        assert r.json()["trip_id"] == str(trip.id)
    finally:
        _clear_auth()
        db.close()


def test_passenger_foreign_trip_forbidden(client: TestClient) -> None:
    db = SessionLocal()
    try:
        pax = _make_passenger(db)
        other = _make_passenger(db)
        drv_u, _ = _make_driver(db)
        trip = _make_trip(db, passenger=other, driver=drv_u)
        _auth(pax, Role.passenger)
        r = client.post(
            "/complaints",
            json={
                "category": "payment_price",
                "description": "Wrong price on someone else trip.",
                "trip_id": str(trip.id),
            },
        )
        assert r.status_code == 403
        assert r.json()["detail"] == "forbidden_trip_access"
    finally:
        _clear_auth()
        db.close()


def test_detail_other_user_forbidden(client: TestClient) -> None:
    db = SessionLocal()
    try:
        pax = _make_passenger(db)
        other = _make_passenger(db)
        db.commit()
        _auth(pax, Role.passenger)
        created = client.post(
            "/complaints",
            json={"category": "other", "description": "Mine only."},
        )
        ref = created.json()["public_reference"]
        _auth(other, Role.passenger)
        r = client.get(f"/complaints/{ref}")
        assert r.status_code == 403
        assert r.json()["detail"] == "forbidden_complaint_access"
    finally:
        _clear_auth()
        db.close()


def test_history_received_and_transitions(client: TestClient) -> None:
    db = SessionLocal()
    try:
        pax = _make_passenger(db)
        admin = _make_admin(db)
        _auth(pax, Role.passenger)
        created = client.post(
            "/complaints",
            json={"category": "safety", "description": "Unsafe driving report."},
        )
        ref = created.json()["public_reference"]

        hist = db.execute(
            select(ComplaintHistory)
            .join(Complaint, Complaint.id == ComplaintHistory.complaint_id)
            .where(Complaint.public_reference == ref)
            .order_by(ComplaintHistory.occurred_at.asc())
        ).scalars().all()
        assert len(hist) == 1
        assert hist[0].event_type == ComplaintHistoryEventType.received.value

        _auth(admin, Role.admin)
        r1 = client.patch(
            f"/admin/complaints/{ref}",
            json={"status": "under_review"},
        )
        assert r1.status_code == 200, r1.text
        assert r1.json()["status"] == "under_review"

        r2 = client.patch(
            f"/admin/complaints/{ref}",
            json={"status": "resolved", "resolution": "Driver warned; case closed with passenger."},
        )
        assert r2.status_code == 200, r2.text
        assert r2.json()["status"] == "resolved"
        assert r2.json()["resolved_at"] is not None
        assert r2.json()["resolution"].startswith("Driver warned")

        r3 = client.patch(
            f"/admin/complaints/{ref}",
            json={"status": "under_review"},
        )
        assert r3.status_code == 200, r3.text
        assert r3.json()["status"] == "under_review"
        assert r3.json()["resolved_at"] is None
        # stored previous resolution still visible to admin
        assert r3.json()["resolution"]

        events = [h["event_type"] for h in r3.json()["history"]]
        assert "received" in events
        assert "status_changed" in events
        assert "resolved" in events
        assert "reopened" in events

        _auth(pax, Role.passenger)
        user_view = client.get(f"/complaints/{ref}")
        assert user_view.status_code == 200
        assert user_view.json()["resolution"] is None

        _auth(admin, Role.admin)
        r4 = client.patch(
            f"/admin/complaints/{ref}",
            json={"status": "resolved", "resolution": "Final resolution after reopen."},
        )
        assert r4.status_code == 200
        r5 = client.patch(f"/admin/complaints/{ref}", json={"status": "closed"})
        assert r5.status_code == 200
        seq = [h["event_type"] for h in r5.json()["history"]]
        assert seq[0] == "received"
        assert "closed" in seq
        assert seq.count("resolved") >= 2
    finally:
        _clear_auth()
        db.close()


def test_resolution_required_for_resolved(client: TestClient) -> None:
    db = SessionLocal()
    try:
        pax = _make_passenger(db)
        admin = _make_admin(db)
        _auth(pax, Role.passenger)
        ref = client.post(
            "/complaints",
            json={"category": "other", "description": "Need resolution."},
        ).json()["public_reference"]
        _auth(admin, Role.admin)
        r = client.patch(f"/admin/complaints/{ref}", json={"status": "resolved"})
        assert r.status_code == 400
        assert r.json()["detail"] == "resolution_required"
    finally:
        _clear_auth()
        db.close()


def test_no_delete_endpoint(client: TestClient) -> None:
    db = SessionLocal()
    try:
        pax = _make_passenger(db)
        admin = _make_admin(db)
        _auth(pax, Role.passenger)
        ref = client.post(
            "/complaints",
            json={"category": "other", "description": "No delete."},
        ).json()["public_reference"]
        _auth(admin, Role.admin)
        assert client.delete(f"/admin/complaints/{ref}").status_code in (404, 405)
        assert client.delete(f"/complaints/{ref}").status_code in (404, 405)
    finally:
        _clear_auth()
        db.close()


def test_audit_events_without_full_pii(client: TestClient) -> None:
    db = SessionLocal()
    try:
        pax = _make_passenger(db)
        admin = _make_admin(db)
        secret = f"SECRET_PII_{uuid.uuid4().hex}"
        _auth(pax, Role.passenger)
        ref = client.post(
            "/complaints",
            json={"category": "other", "description": secret},
        ).json()["public_reference"]
        _auth(admin, Role.admin)
        client.patch(
            f"/admin/complaints/{ref}",
            json={"status": "resolved", "resolution": f"RES_{secret}"},
        )
        client.patch(f"/admin/complaints/{ref}", json={"status": "closed"})

        audits = db.execute(
            select(AuditEvent).where(AuditEvent.event_type.like("complaint.%"))
        ).scalars().all()
        types = {a.event_type for a in audits}
        assert "complaint.received" in types
        assert "complaint.status_changed" in types
        assert "complaint.resolved" in types
        assert "complaint.closed" in types
        blob = " ".join(str(a.payload) for a in audits)
        assert secret not in blob
        assert f"RES_{secret}" not in blob
    finally:
        _clear_auth()
        db.close()


def test_cleanup_does_not_remove_complaint_or_history(client: TestClient) -> None:
    db = SessionLocal()
    try:
        pax = _make_passenger(db)
        db.commit()
        _auth(pax, Role.passenger)
        created = client.post(
            "/complaints",
            json={"category": "other", "description": "Keep me."},
        )
        assert created.status_code == 201, created.text
        ref = created.json()["public_reference"]
        complaint = db.execute(
            select(Complaint).where(Complaint.public_reference == ref)
        ).scalar_one()
        hist_before = db.execute(
            select(ComplaintHistory).where(ComplaintHistory.complaint_id == complaint.id)
        ).scalars().all()
        assert hist_before

        # Age operational audit artificially; cleanup must not touch complaints.
        for a in db.execute(
            select(AuditEvent).where(AuditEvent.entity_id == str(complaint.id))
        ).scalars().all():
            a.occurred_at = datetime(2000, 1, 1, tzinfo=timezone.utc)
        db.commit()

        run_cleanup(db)
        db.expire_all()
        still = db.execute(
            select(Complaint).where(Complaint.public_reference == ref)
        ).scalar_one_or_none()
        assert still is not None
        hist_after = db.execute(
            select(ComplaintHistory).where(ComplaintHistory.complaint_id == complaint.id)
        ).scalars().all()
        assert len(hist_after) == len(hist_before)
    finally:
        _clear_auth()
        db.close()


def test_public_reference_collision_retries(client: TestClient) -> None:
    db = SessionLocal()
    try:
        pax = _make_passenger(db)
        db.commit()
        fixed = f"CMP-2026-{uuid.uuid4().hex[:8].upper()}"
        # Pre-insert colliding reference
        existing = Complaint(
            id=uuid.uuid4(),
            public_reference=fixed,
            complainant_role="passenger",
            complainant_user_id=pax.id,
            category=ComplaintCategory.other.value,
            description="collision seed",
            source="in_app",
            submitted_at=datetime.now(timezone.utc),
            status=ComplaintStatus.received.value,
            retention_until=compute_retention_until(datetime.now(timezone.utc)),
        )
        db.add(existing)
        db.commit()

        calls = {"n": 0}

        def _gen(*, when=None):  # noqa: ANN001
            calls["n"] += 1
            if calls["n"] == 1:
                return fixed
            return f"CMP-2026-{uuid.uuid4().hex[:8].upper()}"

        with patch("app.services.complaints.generate_public_reference", side_effect=_gen):
            c = create_complaint(
                db,
                user_id=str(pax.id),
                role=Role.passenger,
                category=ComplaintCategory.other,
                description="Retry after collision.",
            )
        assert c.public_reference != fixed
        assert calls["n"] >= 2
        assert calls["n"] <= PUBLIC_REF_MAX_ATTEMPTS
    finally:
        db.close()


def test_admin_list_filter(client: TestClient) -> None:
    db = SessionLocal()
    try:
        pax = _make_passenger(db)
        admin = _make_admin(db)
        _auth(pax, Role.passenger)
        ref = client.post(
            "/complaints",
            json={"category": "payment_price", "description": "Filter me."},
        ).json()["public_reference"]
        _auth(admin, Role.admin)
        r = client.get("/admin/complaints", params={"category": "payment_price", "status": "received"})
        assert r.status_code == 200
        assert any(x["public_reference"] == ref for x in r.json())
        r2 = client.get("/admin/complaints", params={"public_reference": ref})
        assert len(r2.json()) == 1
    finally:
        _clear_auth()
        db.close()

# --- L-25 external / LRE / RAL ---

def test_admin_create_external_livro_reclamacoes(client: TestClient) -> None:
    db = SessionLocal()
    try:
        admin = _make_admin(db)
        submitted = datetime(2026, 1, 15, 10, 0, tzinfo=timezone.utc)
        _auth(admin, Role.admin)
        r = client.post(
            "/admin/complaints/external",
            json={
                "source": "livro_reclamacoes",
                "category": "trip_service",
                "description": "LRE imported complaint.",
                "submitted_at": submitted.isoformat(),
                "external_reference": "LRE-2026-001",
                "complainant_name": "Ana Externa",
                "complainant_email": "ana@example.com",
                "complainant_phone": "+351910000001",
                "external_response_due_at": datetime(2026, 2, 5, 17, 0, tzinfo=timezone.utc).isoformat(),
            },
        )
        assert r.status_code == 201, r.text
        body = r.json()
        assert body["source"] == "livro_reclamacoes"
        assert body["external_reference"] == "LRE-2026-001"
        assert body["complainant_user_id"] is None
        assert body["complainant_role"] == "external"
        assert body["complainant_name"] == "Ana Externa"
        assert body["public_reference"].startswith("CMP-")
        assert body["status"] == "received"
        assert body["external_response_due_at"] is not None
        retention = datetime.fromisoformat(body["retention_until"].replace("Z", "+00:00"))
        assert retention == compute_retention_until(submitted)

        complaint = db.execute(
            select(Complaint).where(Complaint.public_reference == body["public_reference"])
        ).scalar_one()
        assert complaint.complainant_user_id is None
        hist = db.execute(
            select(ComplaintHistory).where(ComplaintHistory.complaint_id == complaint.id)
        ).scalars().all()
        assert any(h.event_type == ComplaintHistoryEventType.received.value for h in hist)

        audits = db.execute(
            select(AuditEvent).where(
                AuditEvent.entity_id == str(complaint.id),
                AuditEvent.event_type == "complaint.received",
            )
        ).scalars().all()
        assert audits
        blob = " ".join(str(a.payload) for a in audits)
        assert "Ana Externa" not in blob
        assert "ana@example.com" not in blob
        assert "LRE imported complaint" not in blob
        assert "livro_reclamacoes" in blob
        assert "LRE-2026-001" in blob
    finally:
        _clear_auth()
        db.close()


def test_admin_create_external_ral_without_user(client: TestClient) -> None:
    db = SessionLocal()
    try:
        admin = _make_admin(db)
        _auth(admin, Role.admin)
        r = client.post(
            "/admin/complaints/external",
            json={
                "source": "ral",
                "category": "other",
                "description": "RAL case note.",
                "submitted_at": datetime(2025, 6, 1, tzinfo=timezone.utc).isoformat(),
            },
        )
        assert r.status_code == 201, r.text
        body = r.json()
        assert body["source"] == "ral"
        assert body["complainant_user_id"] is None
        assert body["external_reference"] is None
        assert body["external_response_due_at"] is None
    finally:
        _clear_auth()
        db.close()


def test_duplicate_external_reference(client: TestClient) -> None:
    db = SessionLocal()
    try:
        admin = _make_admin(db)
        _auth(admin, Role.admin)
        payload = {
            "source": "livro_reclamacoes",
            "category": "other",
            "description": "First.",
            "submitted_at": datetime(2026, 3, 1, tzinfo=timezone.utc).isoformat(),
            "external_reference": "LRE-DUP-99",
        }
        assert client.post("/admin/complaints/external", json=payload).status_code == 201
        r2 = client.post(
            "/admin/complaints/external",
            json={**payload, "description": "Second."},
        )
        assert r2.status_code == 409
        assert r2.json()["detail"] == "duplicate_external_reference"
    finally:
        _clear_auth()
        db.close()


def test_user_cannot_create_external_source(client: TestClient) -> None:
    db = SessionLocal()
    try:
        pax = _make_passenger(db)
        _auth(pax, Role.passenger)
        # User API has no source field; posting external path is admin-only.
        r = client.post(
            "/admin/complaints/external",
            json={
                "source": "livro_reclamacoes",
                "category": "other",
                "description": "Nope.",
                "submitted_at": datetime.now(timezone.utc).isoformat(),
            },
        )
        assert r.status_code == 403
        # in_app rejected on admin external endpoint
        admin = _make_admin(db)
        _auth(admin, Role.admin)
        r2 = client.post(
            "/admin/complaints/external",
            json={
                "source": "in_app",
                "category": "other",
                "description": "Not allowed.",
                "submitted_at": datetime.now(timezone.utc).isoformat(),
            },
        )
        assert r2.status_code == 422
    finally:
        _clear_auth()
        db.close()


def test_external_null_references_not_unique_conflict(client: TestClient) -> None:
    db = SessionLocal()
    try:
        admin = _make_admin(db)
        _auth(admin, Role.admin)
        base = {
            "source": "other",
            "category": "other",
            "description": "No ext ref A.",
            "submitted_at": datetime(2026, 4, 1, tzinfo=timezone.utc).isoformat(),
        }
        assert client.post("/admin/complaints/external", json=base).status_code == 201
        r2 = client.post(
            "/admin/complaints/external",
            json={**base, "description": "No ext ref B."},
        )
        assert r2.status_code == 201, r2.text
    finally:
        _clear_auth()
        db.close()
