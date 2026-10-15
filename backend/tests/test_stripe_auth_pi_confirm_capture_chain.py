"""Mock chain: auth PI create params → update → confirm → capture (server-side complete)."""

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


def test_auth_pi_create_then_confirm_capture_chain_uses_no_redirect_apm() -> None:
    create_params: dict = {}
    confirm_kwargs: dict = {}

    def fake_create(**kwargs: object) -> SimpleNamespace:
        create_params.update(kwargs)
        return SimpleNamespace(
            id="pi_chain_test",
            client_secret="pi_chain_test_secret",
            status="requires_confirmation",
        )

    def fake_confirm(pi_id: str, **kwargs: object) -> SimpleNamespace:
        confirm_kwargs.update(kwargs)
        assert pi_id == "pi_chain_test"
        return SimpleNamespace(status="requires_capture", id=pi_id)

    def fake_capture(pi_id: str, **kwargs: object) -> SimpleNamespace:
        assert pi_id == "pi_chain_test"
        return SimpleNamespace(status="succeeded", id=pi_id)

    with patch.object(stripe_service.stripe.PaymentIntent, "create", fake_create):
        pi = stripe_service.create_authorization_payment_intent(
            amount_cents=50,
            currency="EUR",
            metadata={"trip_id": "trip-chain"},
            customer="cus_x",
            payment_method="pm_card",
        )
    assert pi.id == "pi_chain_test"
    assert create_params["automatic_payment_methods"] == {
        "enabled": True,
        "allow_redirects": "never",
    }

    with patch.object(stripe_service.stripe.PaymentIntent, "modify") as modify:
        modify.return_value = SimpleNamespace(status="requires_confirmation")
        stripe_service.update_payment_intent_amount("pi_chain_test", 450)

    with patch.object(stripe_service.stripe.PaymentIntent, "confirm", fake_confirm):
        confirmed = stripe_service.confirm_payment_intent(
            "pi_chain_test",
            idempotency_key="tvde-pi-confirm-pi_chain_test",
        )
    assert confirmed.status == "requires_capture"
    assert "return_url" not in confirm_kwargs

    with patch.object(stripe_service.stripe.PaymentIntent, "capture", fake_capture):
        captured = stripe_service.capture_payment_intent(
            "pi_chain_test",
            idempotency_key="tvde-pi-cap-pi_chain_test",
        )
    assert captured.status == "succeeded"
