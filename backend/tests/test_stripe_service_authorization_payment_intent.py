"""Stripe wrapper: PaymentIntent.create params for accept authorization (API-compatible)."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import patch

import pytest

from app.core.config import settings
from app.services import stripe_service


@pytest.fixture(autouse=True)
def _stripe_live_ready(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "sk_test_unit_fake", raising=False)


def test_create_authorization_payment_intent_uses_automatic_payment_methods() -> None:
    captured: dict = {}

    def fake_create(**kwargs: object) -> SimpleNamespace:
        captured.update(kwargs)
        return SimpleNamespace(id="pi_test", client_secret="pi_test_secret")

    with patch.object(stripe_service.stripe.PaymentIntent, "create", fake_create):
        stripe_service.create_authorization_payment_intent(
            amount_cents=50,
            currency="EUR",
            metadata={"trip_id": "trip-1"},
            idempotency_key="idem-auth-1",
            customer="cus_abc",
            payment_method="pm_card",
        )

    assert "payment_method_types" not in captured
    assert captured["amount"] == 50
    assert captured["currency"] == "EUR"
    assert captured["capture_method"] == "manual"
    assert captured["confirm"] is False
    assert captured["automatic_payment_methods"] == {"enabled": True}
    assert captured["metadata"] == {"trip_id": "trip-1"}
    assert captured["idempotency_key"] == "idem-auth-1"
    assert captured["customer"] == "cus_abc"
    assert captured["payment_method"] == "pm_card"
