"""Stripe wrapper: SetupIntent.create params (API-compatible)."""

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


def test_create_setup_intent_uses_automatic_payment_methods_not_legacy_types() -> None:
    captured: dict = {}

    def fake_create(**kwargs: object) -> SimpleNamespace:
        captured.update(kwargs)
        return SimpleNamespace(id="seti_test", client_secret="seti_test_secret")

    with patch.object(stripe_service.stripe.SetupIntent, "create", fake_create):
        stripe_service.create_setup_intent(
            customer_id="cus_abc",
            metadata={"user_id": "uid-1"},
            idempotency_key="idem-1",
        )

    assert "payment_method_types" not in captured
    assert captured["customer"] == "cus_abc"
    assert captured["usage"] == "off_session"
    assert captured["automatic_payment_methods"] == {"enabled": True}
    assert captured["metadata"] == {"user_id": "uid-1"}
    assert captured["idempotency_key"] == "idem-1"
