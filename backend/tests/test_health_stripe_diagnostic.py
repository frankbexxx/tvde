"""Health diagnostic exposes Stripe dev readiness flags (no secrets)."""

from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app


def test_health_diagnostic_stripe_flags_dev(monkeypatch):
    monkeypatch.setattr(settings, "ENV", "dev", raising=False)
    monkeypatch.setattr(settings, "ENABLE_DEV_TOOLS", True, raising=False)
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "sk_test_fake", raising=False)
    monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_fake", raising=False)

    client = TestClient(app)
    r = client.get("/health", params={"diagnostic": True})
    assert r.status_code == 200
    body = r.json()
    assert body["stripe_mock"] is False
    assert body["stripe_test_mode"] is True
    assert body["stripe_webhook_secret_set"] is True
    assert body["stripe_e2e_ready"] is True
