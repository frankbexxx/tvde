"""Motivo público do documento separado da nota interna da frota."""

from __future__ import annotations

import uuid

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
from app.services.driver_documents import default_docs_dict, serialize_state
from tests.support.unique_phone import unique_test_phone

INTERNAL = "nota-so-da-equipa-xyz"
PUBLIC = "Documento ilegivel"


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL requerido: {exc}")


def _token(user: User) -> str:
    return create_access_token(subject=str(user.id), role=user.role.value)["token"]


def _fleet() -> dict[str, str]:
    db = SessionLocal()
    try:
        pid = uuid.uuid4()
        db.add(Partner(id=pid, name="Rejection Fleet"))
        driver = User(
            role=Role.driver,
            name="Rejection Driver",
            phone=unique_test_phone(),
            status=UserStatus.active,
        )
        partner = User(
            role=Role.partner,
            name="Rejection Partner",
            phone=unique_test_phone(),
            status=UserStatus.active,
            partner_org_id=pid,
        )
        passenger = User(
            role=Role.passenger,
            name="Rejection Passenger",
            phone=unique_test_phone(),
            status=UserStatus.active,
        )
        admin = User(
            role=Role.admin,
            name="Rejection Admin",
            phone=unique_test_phone(),
            status=UserStatus.active,
        )
        db.add_all([driver, partner, passenger, admin])
        db.flush()
        docs = default_docs_dict()
        docs["carta_tvde"] = {
            "status": "pending_review",
            "file_path": "x/carta.pdf",
            "file_name": "carta.pdf",
            "partner_note": INTERNAL,
        }
        db.add(
            Driver(
                user_id=driver.id,
                partner_id=pid,
                status=DriverStatus.approved,
                commission_percent=10.0,
                is_available=False,
                documents=serialize_state({"version": 1, "docs": docs}),
            )
        )
        db.commit()
        return {
            "driver_id": str(driver.id),
            "driver": _token(driver),
            "partner": _token(partner),
            "passenger": _token(passenger),
            "admin": _token(admin),
        }
    finally:
        db.close()


def test_old_internal_note_stays_hidden_and_public_reason_is_separate() -> None:
    ids = _fleet()
    client = TestClient(app)
    partner_headers = {"Authorization": f"Bearer {ids['partner']}"}
    driver_headers = {"Authorization": f"Bearer {ids['driver']}"}

    before = client.get(f"/partner/drivers/{ids['driver_id']}", headers=partner_headers)
    assert before.status_code == 200
    stored = before.json()["documents"]["carta_tvde"]
    assert stored["partner_note"] == INTERNAL
    assert "public_rejection_reason" not in stored

    driver_before = client.get("/driver/documents", headers=driver_headers)
    assert driver_before.status_code == 200
    body = driver_before.json()
    carta = body["docs"]["carta_tvde"]
    assert "partner_note" not in carta
    assert INTERNAL not in driver_before.text
    assert "public_rejection_reason" not in carta

    rejected = client.patch(
        f"/partner/drivers/{ids['driver_id']}/documents",
        headers=partner_headers,
        json={
            "docs": {
                "carta_tvde": {
                    "status": "rejected",
                    "public_rejection_reason": PUBLIC,
                    "partner_note": INTERNAL,
                }
            }
        },
    )
    assert rejected.status_code == 200, rejected.text
    row = rejected.json()["documents"]["carta_tvde"]
    assert row["status"] == "rejected"
    assert row["public_rejection_reason"] == PUBLIC
    assert row["partner_note"] == INTERNAL

    driver_after = client.get("/driver/documents", headers=driver_headers)
    assert driver_after.status_code == 200
    visible = driver_after.json()["docs"]["carta_tvde"]
    assert visible["status"] == "rejected"
    assert visible["public_rejection_reason"] == PUBLIC
    assert "partner_note" not in visible
    assert INTERNAL not in driver_after.text

    public_only = client.patch(
        f"/partner/drivers/{ids['driver_id']}/documents",
        headers=partner_headers,
        json={"docs": {"carta_tvde": {"public_rejection_reason": "A matricula nao coincide"}}},
    )
    assert public_only.status_code == 200
    only = public_only.json()["documents"]["carta_tvde"]
    assert only["public_rejection_reason"] == "A matricula nao coincide"
    assert only["partner_note"] == INTERNAL


def test_driver_cannot_write_internal_note_or_public_reason() -> None:
    ids = _fleet()
    client = TestClient(app)
    partner_headers = {"Authorization": f"Bearer {ids['partner']}"}
    driver_headers = {"Authorization": f"Bearer {ids['driver']}"}
    client.patch(
        f"/partner/drivers/{ids['driver_id']}/documents",
        headers=partner_headers,
        json={
            "docs": {
                "carta_tvde": {
                    "status": "rejected",
                    "public_rejection_reason": PUBLIC,
                    "partner_note": INTERNAL,
                }
            }
        },
    )
    attacked = client.patch(
        "/driver/documents",
        headers=driver_headers,
        json={
            "docs": {
                "carta_tvde": {
                    "status": "rejected",
                    "partner_note": "nota-injectada-pelo-motorista",
                    "public_rejection_reason": "motivo-injectado",
                }
            }
        },
    )
    assert attacked.status_code == 200
    assert "partner_note" not in attacked.json()["docs"]["carta_tvde"]
    assert INTERNAL not in attacked.text
    assert "nota-injectada-pelo-motorista" not in attacked.text
    kept = client.get(f"/partner/drivers/{ids['driver_id']}", headers=partner_headers)
    carta = kept.json()["documents"]["carta_tvde"]
    assert carta["partner_note"] == INTERNAL
    assert carta["public_rejection_reason"] == PUBLIC


def test_passenger_and_driver_responses_omit_internal_note() -> None:
    ids = _fleet()
    client = TestClient(app)
    passenger_headers = {"Authorization": f"Bearer {ids['passenger']}"}
    driver_docs = client.get("/driver/documents", headers=passenger_headers)
    assert driver_docs.status_code == 403
    assert INTERNAL not in driver_docs.text
    partner_docs = client.get(
        f"/partner/drivers/{ids['driver_id']}",
        headers=passenger_headers,
    )
    assert partner_docs.status_code == 403
    assert INTERNAL not in partner_docs.text
    admin_docs = client.get("/admin/kyc-supervision", headers=passenger_headers)
    assert admin_docs.status_code == 403
    assert INTERNAL not in admin_docs.text


def test_admin_reads_both_fields_and_approve_clears_only_public_reason() -> None:
    ids = _fleet()
    client = TestClient(app)
    partner_headers = {"Authorization": f"Bearer {ids['partner']}"}
    admin_headers = {"Authorization": f"Bearer {ids['admin']}"}
    client.patch(
        f"/partner/drivers/{ids['driver_id']}/documents",
        headers=partner_headers,
        json={
            "docs": {
                "carta_tvde": {
                    "status": "rejected",
                    "public_rejection_reason": PUBLIC,
                    "partner_note": INTERNAL,
                }
            }
        },
    )
    admin = client.get("/admin/kyc-supervision", headers=admin_headers)
    assert admin.status_code == 200
    drv = next(row for row in admin.json()["drivers"] if row["user_id"] == ids["driver_id"])
    carta = next(item for item in drv["documents"] if item["doc_key"] == "carta_tvde")
    assert carta["public_rejection_reason"] == PUBLIC
    assert carta["partner_note"] == INTERNAL
    for vehicle in admin.json()["vehicles"]:
        assert INTERNAL not in str(vehicle)

    approved = client.patch(
        f"/partner/drivers/{ids['driver_id']}/documents",
        headers=partner_headers,
        json={"docs": {"carta_tvde": {"status": "approved"}}},
    )
    assert approved.status_code == 200, approved.text
    row = approved.json()["documents"]["carta_tvde"]
    assert row["status"] == "approved"
    assert "public_rejection_reason" not in row
    assert row["partner_note"] == INTERNAL
    driver = client.get(
        "/driver/documents",
        headers={"Authorization": f"Bearer {ids['driver']}"},
    )
    assert INTERNAL not in driver.text
    assert "public_rejection_reason" not in driver.json()["docs"]["carta_tvde"]
