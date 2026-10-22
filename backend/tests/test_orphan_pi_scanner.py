"""PR4: orphan PaymentIntent preview (T-O8 / T-O9) — Stripe mocked."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from unittest.mock import patch

import pytest
import stripe
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user
from app.core.config import settings
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver
from app.db.models.payment import Payment
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal
from app.main import app
from app.models.enums import DriverStatus, PaymentStatus, Role, TripStatus, UserStatus
from app.services.orphan_payment_intent_scan import preview_orphan_payment_intents
from tests.support.unique_phone import unique_test_phone


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def super_admin_ctx() -> None:
    async def _sa() -> UserContext:
        return UserContext(user_id=str(uuid.uuid4()), role=Role.super_admin)

    app.dependency_overrides[get_current_user] = _sa
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def admin_only_ctx() -> None:
    async def _a() -> UserContext:
        return UserContext(user_id=str(uuid.uuid4()), role=Role.admin)

    app.dependency_overrides[get_current_user] = _a
    yield
    app.dependency_overrides.pop(get_current_user, None)


def _stripe_pi(
    *,
    pi_id: str,
    trip_id: uuid.UUID | None,
    created: int | None = None,
    status: str = "requires_capture",
) -> dict:
    meta = {"trip_id": str(trip_id)} if trip_id else {}
    return {
        "id": pi_id,
        "status": status,
        "metadata": meta,
        "amount": 1500,
        "currency": "eur",
        "created": created or int(datetime.now(timezone.utc).timestamp()) - 3600,
    }


def _seed_trip(db: Session) -> tuple[Trip, User]:
    passenger = User(
        role=Role.passenger,
        name=f"P {uuid.uuid4().hex[:6]}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    driver_u = User(
        role=Role.driver,
        name=f"D {uuid.uuid4().hex[:6]}",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add(passenger)
    db.add(driver_u)
    db.flush()
    db.add(
        Driver(
            partner_id=DEFAULT_PARTNER_UUID,
            user_id=driver_u.id,
            status=DriverStatus.approved,
            commission_percent=15.0,
        )
    )
    trip = Trip(
        passenger_id=passenger.id,
        driver_id=driver_u.id,
        status=TripStatus.accepted,
        origin_lat=38.7,
        origin_lng=-9.1,
        destination_lat=38.72,
        destination_lng=-9.14,
        estimated_price=15.0,
        distance_km=2.0,
        duration_min=8.0,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip, passenger


@pytest.mark.usefixtures("super_admin_ctx")
def test_preview_skipped_stripe_mock(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    r = client.get("/admin/ops/orphan-payment-intents/preview")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["skipped"] is True
    assert body["skip_reason"] == "stripe_mock"


@pytest.mark.usefixtures("admin_only_ctx")
def test_preview_forbidden_for_admin(client: TestClient) -> None:
    r = client.get("/admin/ops/orphan-payment-intents/preview")
    assert r.status_code == 403


@pytest.mark.usefixtures("super_admin_ctx")
def test_preview_grace_minutes_below_minimum_422(client: TestClient) -> None:
    r = client.get("/admin/ops/orphan-payment-intents/preview?grace_minutes=4")
    assert r.status_code == 422


def test_stripe_live_not_authorized(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "sk_live_xxx", raising=False)
    monkeypatch.setattr(settings, "ENV", "staging", raising=False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "staging", raising=False)
    db = SessionLocal()
    try:
        out = preview_orphan_payment_intents(db, window_days=7, grace_minutes=5, limit=100)
        assert out["skipped"] is True
        assert out["skip_reason"] == "stripe_live_not_authorized"
    finally:
        db.close()


def test_staging_test_key_allows_scan_when_mock_off(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "sk_test_xxx", raising=False)
    monkeypatch.setattr(settings, "ENV", "staging", raising=False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "staging", raising=False)
    trip_id = uuid.uuid4()
    pi_id = f"pi_test_{uuid.uuid4().hex[:12]}"

    def _fake_list(**_kwargs: object) -> dict:
        return {
            "data": [_stripe_pi(pi_id=pi_id, trip_id=trip_id)],
            "has_more": False,
        }

    db = SessionLocal()
    try:
        trip, _ = _seed_trip(db)
        assert trip.id != trip_id
        with patch(
            "app.services.orphan_payment_intent_scan.list_payment_intents_page",
            side_effect=_fake_list,
        ):
            out = preview_orphan_payment_intents(
                db, window_days=7, grace_minutes=5, limit=100
            )
        assert out["skipped"] is False
        assert len(out["inconclusive"]) == 1
        assert out["inconclusive"][0]["finding_kind"] == "inconclusive_trip_not_found"
    finally:
        db.close()


def test_confirmed_orphan_trip_exists_no_payment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "sk_test_xxx", raising=False)
    monkeypatch.setattr(settings, "ENV", "staging", raising=False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "staging", raising=False)
    db = SessionLocal()
    pi_id = f"pi_test_{uuid.uuid4().hex[:12]}"
    try:
        trip, _ = _seed_trip(db)

        def _fake_list(**_kwargs: object) -> dict:
            return {
                "data": [_stripe_pi(pi_id=pi_id, trip_id=trip.id, status="requires_capture")],
                "has_more": False,
            }

        with patch(
            "app.services.orphan_payment_intent_scan.list_payment_intents_page",
            side_effect=_fake_list,
        ):
            out = preview_orphan_payment_intents(
                db, window_days=7, grace_minutes=5, limit=100
            )
        assert out["confirmed_orphans"]
        row = out["confirmed_orphans"][0]
        assert row["payment_intent_id"] == pi_id
        assert row["finding_kind"] == "confirmed_orphan"
        assert row["orphan_class"] == "open"
    finally:
        db.close()


def test_linked_pi_with_payment_row(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "sk_test_xxx", raising=False)
    monkeypatch.setattr(settings, "ENV", "staging", raising=False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "staging", raising=False)
    db = SessionLocal()
    pi_id = f"pi_test_{uuid.uuid4().hex[:12]}"
    try:
        trip, _ = _seed_trip(db)
        db.add(
            Payment(
                trip_id=trip.id,
                total_amount=15.0,
                commission_amount=2.0,
                driver_amount=13.0,
                currency="EUR",
                status=PaymentStatus.processing,
                stripe_payment_intent_id=pi_id,
            )
        )
        db.commit()

        def _fake_list(**_kwargs: object) -> dict:
            return {"data": [_stripe_pi(pi_id=pi_id, trip_id=trip.id)], "has_more": False}

        with patch(
            "app.services.orphan_payment_intent_scan.list_payment_intents_page",
            side_effect=_fake_list,
        ):
            out = preview_orphan_payment_intents(
                db, window_days=7, grace_minutes=5, limit=100
            )
        assert out["confirmed_orphans"] == []
        assert out["linked_count"] == 1
    finally:
        db.close()


def test_inconclusive_trip_has_other_payment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "sk_test_xxx", raising=False)
    monkeypatch.setattr(settings, "ENV", "staging", raising=False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "staging", raising=False)
    db = SessionLocal()
    pi_orphan = f"pi_test_{uuid.uuid4().hex[:12]}"
    pi_linked = f"pi_test_{uuid.uuid4().hex[:12]}"
    try:
        trip, _ = _seed_trip(db)
        db.add(
            Payment(
                trip_id=trip.id,
                total_amount=15.0,
                commission_amount=2.0,
                driver_amount=13.0,
                currency="EUR",
                status=PaymentStatus.processing,
                stripe_payment_intent_id=pi_linked,
            )
        )
        db.commit()

        def _fake_list(**_kwargs: object) -> dict:
            return {
                "data": [_stripe_pi(pi_id=pi_orphan, trip_id=trip.id)],
                "has_more": False,
            }

        with patch(
            "app.services.orphan_payment_intent_scan.list_payment_intents_page",
            side_effect=_fake_list,
        ):
            out = preview_orphan_payment_intents(
                db, window_days=7, grace_minutes=5, limit=100
            )
        assert len(out["inconclusive"]) == 1
        assert out["inconclusive"][0]["finding_kind"] == "inconclusive_trip_has_other_payment"
    finally:
        db.close()


def test_inconclusive_invalid_trip_id_metadata(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "sk_test_xxx", raising=False)
    monkeypatch.setattr(settings, "ENV", "staging", raising=False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "staging", raising=False)
    db = SessionLocal()
    try:

        def _fake_list(**_kwargs: object) -> dict:
            pi = _stripe_pi(pi_id="pi_bad_meta", trip_id=None)
            pi["metadata"] = {"trip_id": "not-a-uuid"}
            return {"data": [pi], "has_more": False}

        with patch(
            "app.services.orphan_payment_intent_scan.list_payment_intents_page",
            side_effect=_fake_list,
        ):
            out = preview_orphan_payment_intents(
                db, window_days=7, grace_minutes=5, limit=100
            )
        assert len(out["inconclusive"]) == 1
        assert out["inconclusive"][0]["finding_kind"] == "inconclusive_invalid_trip_id"
    finally:
        db.close()


def test_ignored_external_no_metadata(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "sk_test_xxx", raising=False)
    monkeypatch.setattr(settings, "ENV", "staging", raising=False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "staging", raising=False)
    db = SessionLocal()
    try:

        def _fake_list(**_kwargs: object) -> dict:
            return {
                "data": [_stripe_pi(pi_id="pi_ext", trip_id=None)],
                "has_more": False,
            }

        with patch(
            "app.services.orphan_payment_intent_scan.list_payment_intents_page",
            side_effect=_fake_list,
        ):
            out = preview_orphan_payment_intents(
                db, window_days=7, grace_minutes=5, limit=100
            )
        assert out["ignored_external_count"] == 1
        assert out["confirmed_orphans"] == []
    finally:
        db.close()


def test_grace_period_skips_recent(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "sk_test_xxx", raising=False)
    monkeypatch.setattr(settings, "ENV", "staging", raising=False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "staging", raising=False)
    db = SessionLocal()
    try:
        trip, _ = _seed_trip(db)
        recent = int(datetime.now(timezone.utc).timestamp()) - 60

        def _fake_list(**_kwargs: object) -> dict:
            return {
                "data": [
                    _stripe_pi(
                        pi_id="pi_recent",
                        trip_id=trip.id,
                        created=recent,
                    )
                ],
                "has_more": False,
            }

        with patch(
            "app.services.orphan_payment_intent_scan.list_payment_intents_page",
            side_effect=_fake_list,
        ):
            out = preview_orphan_payment_intents(
                db, window_days=7, grace_minutes=5, limit=100
            )
        assert out["skipped_grace_count"] == 1
        assert out["confirmed_orphans"] == []
    finally:
        db.close()


def test_pagination_partial(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "sk_test_xxx", raising=False)
    monkeypatch.setattr(settings, "ENV", "staging", raising=False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "staging", raising=False)
    db = SessionLocal()
    try:

        def _fake_list(**kwargs: object) -> dict:
            return {
                "data": [_stripe_pi(pi_id="pi_page_1", trip_id=None)],
                "has_more": True,
            }

        with patch(
            "app.services.orphan_payment_intent_scan.list_payment_intents_page",
            side_effect=_fake_list,
        ):
            out = preview_orphan_payment_intents(
                db, window_days=7, grace_minutes=5, limit=1
            )
        assert out["scan_status"] == "partial"
        assert out["has_more"] is True
        assert out["next_starting_after"]
    finally:
        db.close()


def test_stripe_rate_limit_failed(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "sk_test_xxx", raising=False)
    monkeypatch.setattr(settings, "ENV", "staging", raising=False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "staging", raising=False)
    db = SessionLocal()
    try:

        def _boom(**_kwargs: object) -> None:
            raise stripe.error.RateLimitError("Too many requests")

        with patch(
            "app.services.orphan_payment_intent_scan.list_payment_intents_page",
            side_effect=_boom,
        ):
            out = preview_orphan_payment_intents(
                db, window_days=7, grace_minutes=5, limit=100
            )
        assert out["scan_status"] == "failed"
        assert "stripe_rate_limit" in out["errors"]
    finally:
        db.close()


def test_no_stripe_writes(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "sk_test_xxx", raising=False)
    monkeypatch.setattr(settings, "ENV", "staging", raising=False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "staging", raising=False)
    db = SessionLocal()
    try:
        with patch(
            "app.services.orphan_payment_intent_scan.list_payment_intents_page",
            return_value={"data": [], "has_more": False},
        ), patch("stripe.PaymentIntent.create") as create, patch(
            "stripe.PaymentIntent.cancel"
        ) as cancel:
            preview_orphan_payment_intents(db, window_days=7, grace_minutes=5, limit=10)
        create.assert_not_called()
        cancel.assert_not_called()
    finally:
        db.close()
