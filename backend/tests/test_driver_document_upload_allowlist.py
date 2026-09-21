"""L-SEC-16: driver document upload allowlist (aligned with vehicle uploads)."""

from __future__ import annotations

import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.auth.security import create_access_token
from app.db.models.driver import Driver
from app.db.models.partner import Partner
from app.db.models.user import User
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.enums import DriverStatus, Role, UserStatus
from app.services.driver_document_upload import (
    _MAX_BYTES,
    media_type_for_stored_driver_document,
)
from app.services.driver_documents import get_documents_for_driver
from tests.support.unique_phone import unique_test_phone


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL requerido: {exc}")


def _seed_driver() -> tuple[str, str]:
    db = SessionLocal()
    try:
        pid = uuid.uuid4()
        db.add(Partner(id=pid, name=f"DrvUpload {uuid.uuid4().hex[:6]}"))
        u = User(
            role=Role.driver,
            name="Allowlist Driver",
            phone=unique_test_phone(),
            status=UserStatus.active,
        )
        db.add(u)
        db.flush()
        db.add(
            Driver(
                user_id=u.id,
                partner_id=pid,
                status=DriverStatus.approved,
                commission_percent=10.0,
                is_available=False,
            )
        )
        db.commit()
        tok = create_access_token(subject=str(u.id), role=u.role.value)["token"]
        return str(u.id), tok
    finally:
        db.close()


@pytest.mark.parametrize(
    "filename,body,ctype",
    [
        ("ok.pdf", b"%PDF-1.4", "application/pdf"),
        ("ok.jpg", b"\xff\xd8\xff\xd9", "image/jpeg"),
        ("ok.jpeg", b"\xff\xd8\xff\xd9", "image/jpeg"),
        ("ok.png", b"\x89PNG\r\n\x1a\n", "image/png"),
    ],
)
def test_driver_upload_accepts_allowlisted_types(
    filename: str, body: bytes, ctype: str
) -> None:
    _, tok = _seed_driver()
    c = TestClient(app)
    r = c.post(
        "/driver/documents/carta_tvde/upload",
        headers={"Authorization": f"Bearer {tok}"},
        files={"file": (filename, body, ctype)},
    )
    assert r.status_code == 200, r.text


@pytest.mark.parametrize(
    "filename,body,ctype",
    [
        ("evil.html", b"<html>x</html>", "text/html"),
        ("evil.htm", b"<html>x</html>", "text/html"),
        ("evil.svg", b"<svg xmlns='http://www.w3.org/2000/svg'/>", "image/svg+xml"),
        ("evil.exe", b"MZ", "application/octet-stream"),
        ("evil.bin", b"raw", "application/octet-stream"),
        ("spoof.pdf", b"%PDF-1.4", "text/html"),
    ],
)
def test_driver_upload_rejects_unsafe_types(
    filename: str, body: bytes, ctype: str
) -> None:
    _, tok = _seed_driver()
    c = TestClient(app)
    r = c.post(
        "/driver/documents/carta_tvde/upload",
        headers={"Authorization": f"Bearer {tok}"},
        files={"file": (filename, body, ctype)},
    )
    assert r.status_code == 415, r.text
    assert r.json()["detail"] == "invalid_file_type"


def test_driver_upload_rejects_oversize() -> None:
    _, tok = _seed_driver()
    c = TestClient(app)
    big = b"x" * (_MAX_BYTES + 1)
    r = c.post(
        "/driver/documents/carta_tvde/upload",
        headers={"Authorization": f"Bearer {tok}"},
        files={"file": ("big.pdf", big, "application/pdf")},
    )
    assert r.status_code == 413
    assert r.json()["detail"] == "file_too_large"


def test_driver_upload_rejects_before_persist_on_bad_type() -> None:
    driver_id, tok = _seed_driver()
    c = TestClient(app)
    r = c.post(
        "/driver/documents/carta_tvde/upload",
        headers={"Authorization": f"Bearer {tok}"},
        files={"file": ("x.html", b"<html>", "text/html")},
    )
    assert r.status_code == 415
    db = SessionLocal()
    try:
        state = get_documents_for_driver(db, uuid.UUID(driver_id))
        assert state["docs"]["carta_tvde"].get("file_path") is None
        assert state["docs"]["carta_tvde"]["status"] == "missing"
    finally:
        db.close()


def test_driver_upload_sanitizes_suspicious_filename_to_uuid_path() -> None:
    """Traversal-like client names must not control storage path; only allowlisted ext."""
    driver_id, tok = _seed_driver()
    c = TestClient(app)
    r = c.post(
        "/driver/documents/carta_tvde/upload",
        headers={"Authorization": f"Bearer {tok}"},
        files={
            "file": (
                "../../etc/passwd.pdf",
                b"%PDF-1.4",
                "application/pdf",
            )
        },
    )
    assert r.status_code == 200, r.text
    stored = r.json()["docs"]["carta_tvde"]["file_path"]
    assert ".." not in stored
    assert stored.startswith(f"{driver_id}/carta_tvde/")
    assert stored.endswith(".pdf")
    assert Path(stored).name != "passwd.pdf"


@pytest.mark.parametrize(
    "filename,body,ctype,media",
    [
        ("a.pdf", b"%PDF-1.4", "application/pdf", "application/pdf"),
        ("a.jpeg", b"\xff\xd8\xff\xd9", "image/jpeg", "image/jpeg"),
        ("a.png", b"\x89PNG\r\n\x1a\n", "image/png", "image/png"),
    ],
)
def test_driver_download_sets_safe_content_type(
    filename: str, body: bytes, ctype: str, media: str
) -> None:
    _, tok = _seed_driver()
    c = TestClient(app)
    up = c.post(
        "/driver/documents/carta_tvde/upload",
        headers={"Authorization": f"Bearer {tok}"},
        files={"file": (filename, body, ctype)},
    )
    assert up.status_code == 200, up.text
    dl = c.get(
        "/driver/documents/carta_tvde/file",
        headers={"Authorization": f"Bearer {tok}"},
    )
    assert dl.status_code == 200
    assert dl.headers["content-type"].startswith(media)
    assert "attachment" in dl.headers.get("content-disposition", "").lower()


def test_media_type_legacy_unknown_ext_is_octet_stream() -> None:
    assert (
        media_type_for_stored_driver_document(Path("legacy/doc/x.bin"))
        == "application/octet-stream"
    )


def test_driver_upload_requires_auth() -> None:
    c = TestClient(app)
    r = c.post(
        "/driver/documents/carta_tvde/upload",
        files={"file": ("ok.pdf", b"%PDF-1.4", "application/pdf")},
    )
    assert r.status_code in (401, 403)
