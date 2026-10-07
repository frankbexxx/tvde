"""Health diagnostic exposes Stripe dev operational readiness (no secrets)."""

from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app


def test_health_diagnostic_stripe_mock_na(monkeypatch):
    monkeypatch.setattr(settings, "ENV", "dev", raising=False)
    monkeypatch.setattr(settings, "ENABLE_DEV_TOOLS", True, raising=False)
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "sk_test_fake", raising=False)

    client = TestClient(app)
    r = client.get("/health", params={"diagnostic": True})
    assert r.status_code == 200
    body = r.json()
    assert body["stripe_mock"] is True
    assert body["stripe_e2e_ready"] is False
    assert body["stripe_e2e_reason"] == "na_mock"
