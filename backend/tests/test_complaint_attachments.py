"""L-12 complaint attachments — type, size, RBAC, history."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user
from app.core.config import settings
from app.db.models.audit_event import AuditEvent
from app.db.models.complaint import ComplaintAttachment, ComplaintHistory
from app.db.models.user import User
from app.db.session import SessionLocal
from app.main import app
from app.models.enums import ComplaintHistoryEventType, ComplaintStatus, Role, UserStatus
from tests.support.unique_phone import unique_test_phone
from tests.test_complaints import _make_admin, _make_passenger

_PDF = b"%PDF-1.4\n"
_JPEG = b"\xff\xd8\xff\xe0" + b"jpeg"
_PNG = b"\x89PNG\r\n\x1a\n" + b"png"


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def upload_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path))
    return tmp_path


def _auth(user: User, role: Role) -> None:
    async def _fake() -> UserContext:
        return UserContext(user_id=str(user.id), role=role)

    app.dependency_overrides[get_current_user] = _fake


def _clear() -> None:
    app.dependency_overrides.pop(get_current_user, None)


def _user(db: Session, role: Role) -> User:
    user = User(
        role=role,
        name=f"U {uuid.uuid4().hex[:6]}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _create(client: TestClient, user: User) -> str:
    _auth(user, Role.passenger)
    res = client.post(
        "/complaints",
        json={"category": "other", "description": "Secret complaint text"},
    )
    assert res.status_code == 201
    return res.json()["public_reference"]


def _upload(client: TestClient, ref: str, name: str, body: bytes, mime: str):
    return client.post(
        f"/complaints/{ref}/attachments",
        files={"file": (name, body, mime)},
    )


def test_pdf_jpeg_png_allowed(client: TestClient, upload_dir) -> None:
    db = SessionLocal()
    try:
        user = _make_passenger(db)
        db.commit()
        ref = _create(client, user)
        for name, body, mime in (
            ("note.pdf", _PDF, "application/pdf"),
            ("photo.jpg", _JPEG, "image/jpeg"),
            ("shot.png", _PNG, "image/png"),
        ):
            res = _upload(client, ref, name, body, mime)
            assert res.status_code == 201, res.text
            assert res.json()["mime_type"] == mime
            assert ".." not in res.json()["original_file_name"]
    finally:
        _clear()
        db.close()


def test_rejects_bad_extension_mime_and_content(client: TestClient, upload_dir) -> None:
    db = SessionLocal()
    try:
        user = _make_passenger(db)
        db.commit()
        ref = _create(client, user)
        html = _upload(client, ref, "x.html", b"<html>", "text/html")
        assert html.status_code == 415
        assert html.json()["detail"] == "invalid_file_type"
        mime = _upload(client, ref, "x.pdf", _PDF, "text/html")
        assert mime.status_code == 415
        mismatch = _upload(client, ref, "x.pdf", _PNG, "application/pdf")
        assert mismatch.status_code == 415
        assert mismatch.json()["detail"] == "invalid_file_content"
    finally:
        _clear()
        db.close()


def test_size_and_count_limits(client: TestClient, upload_dir) -> None:
    db = SessionLocal()
    try:
        user = _make_passenger(db)
        db.commit()
        ref = _create(client, user)
        big = _upload(client, ref, "big.pdf", _PDF + (b"a" * (5 * 1024 * 1024)), "application/pdf")
        assert big.status_code == 413
        for i in range(5):
            ok = _upload(client, ref, f"n{i}.pdf", _PDF, "application/pdf")
            assert ok.status_code == 201
        sixth = _upload(client, ref, "n6.pdf", _PDF, "application/pdf")
        assert sixth.status_code == 409
        assert sixth.json()["detail"] == "attachment_limit"
    finally:
        _clear()
        db.close()


def test_author_rbac_partner_and_closed(client: TestClient, upload_dir) -> None:
    db = SessionLocal()
    try:
        owner = _make_passenger(db)
        other = _make_passenger(db)
        admin = _make_admin(db)
        partner = _user(db, Role.partner)
        db.commit()
        ref = _create(client, owner)
        _auth(other, Role.passenger)
        denied = _upload(client, ref, "a.pdf", _PDF, "application/pdf")
        assert denied.status_code == 403
        _auth(partner, Role.partner)
        partner_denied = _upload(client, ref, "a.pdf", _PDF, "application/pdf")
        assert partner_denied.status_code == 403
        _auth(admin, Role.admin)
        admin_ok = client.post(
            f"/admin/complaints/{ref}/attachments",
            files={"file": ("admin.pdf", _PDF, "application/pdf")},
        )
        assert admin_ok.status_code == 201
        closed = client.patch(f"/admin/complaints/{ref}", json={"status": "closed"})
        assert closed.status_code == 200
        assert closed.json()["status"] == ComplaintStatus.closed.value
        again = client.post(
            f"/admin/complaints/{ref}/attachments",
            files={"file": ("late.pdf", _PDF, "application/pdf")},
        )
        assert again.status_code == 409
        assert again.json()["detail"] == "complaint_closed"
    finally:
        _clear()
        db.close()


def test_download_auth_and_traversal_and_legacy(client: TestClient, upload_dir) -> None:
    db = SessionLocal()
    try:
        owner = _make_passenger(db)
        other = _make_passenger(db)
        db.commit()
        ref = _create(client, owner)
        empty = client.get(f"/complaints/{ref}/attachments")
        assert empty.status_code == 200
        assert empty.json() == []
        uploaded = _upload(client, ref, "../../evil.pdf", _PDF, "application/pdf")
        assert uploaded.status_code == 201
        attachment_id = uploaded.json()["id"]
        row = db.get(ComplaintAttachment, uuid.UUID(attachment_id))
        assert row is not None
        assert ".." not in row.stored_path
        assert row.stored_path.endswith(".pdf")
        got = client.get(f"/complaints/{ref}/attachments/{attachment_id}")
        assert got.status_code == 200
        assert got.content == _PDF
        disposition = got.headers.get("content-disposition", "")
        assert "attachment" in disposition
        _auth(other, Role.passenger)
        foreign = client.get(f"/complaints/{ref}/attachments/{attachment_id}")
        assert foreign.status_code == 403
    finally:
        _clear()
        db.close()


def test_history_and_audit_omit_complaint_text(client: TestClient, upload_dir) -> None:
    db = SessionLocal()
    try:
        user = _make_passenger(db)
        db.commit()
        ref = _create(client, user)
        uploaded = _upload(client, ref, "note.pdf", _PDF, "application/pdf")
        assert uploaded.status_code == 201
        attachment_id = uploaded.json()["id"]
        history = db.execute(
            select(ComplaintHistory).where(
                ComplaintHistory.event_type == ComplaintHistoryEventType.attachment_added.value
            )
        ).scalars().all()
        assert any(
            (h.event_metadata or {}).get("attachment_id") == attachment_id for h in history
        )
        audits = db.execute(
            select(AuditEvent).where(AuditEvent.event_type == "complaint.attachment_added")
        ).scalars().all()
        payload = next(
            (a.payload for a in audits if (a.payload or {}).get("attachment_id") == attachment_id),
            None,
        )
        assert payload is not None
        assert "description" not in payload
        assert "Secret complaint text" not in str(payload)
    finally:
        _clear()
        db.close()
