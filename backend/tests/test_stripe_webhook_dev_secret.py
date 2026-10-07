"""Dev local: effective webhook secret requires supervised session."""

import json
from datetime import datetime, timezone

from app.core.config import settings


def test_effective_stripe_webhook_secret_requires_session_match(tmp_path, monkeypatch):
    dev = tmp_path / ".dev-local"
    dev.mkdir()
    session = "sess001"
    now = datetime.now(timezone.utc).isoformat()
    listen = dev / "stripe-listen.json"
    listen.write_text(
        json.dumps(
            {
                "session_id": session,
                "pid": 1,
                "state": "ready",
                "whsec_session_id": session,
                "heartbeat_at": now,
            }
        ),
        encoding="utf-8",
    )
    (dev / "stripe-webhook-secret").write_text("whsec_from_listen_session", encoding="utf-8")

    paths = type("P", (), {"root": dev, "listen": listen, "secret": dev / "stripe-webhook-secret", "probe": dev / "stripe-e2e-probe.json"})()
    monkeypatch.setattr("app.services.stripe_e2e_dev._dev_local_paths", lambda cfg=None: paths)
    monkeypatch.setattr("app.core.config._BASE_DIR", tmp_path / "backend", raising=False)
    (tmp_path / "backend").mkdir()

    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    monkeypatch.setattr(settings, "ENV", "dev", raising=False)
    monkeypatch.setattr(settings, "ENABLE_DEV_TOOLS", True, raising=False)
    monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_stale_from_dot_env", raising=False)

    assert settings.effective_stripe_webhook_secret() == "whsec_from_listen_session"


def test_effective_stripe_webhook_secret_session_mismatch_returns_none(tmp_path, monkeypatch):
    dev = tmp_path / ".dev-local"
    dev.mkdir()
    listen = dev / "stripe-listen.json"
    listen.write_text(
        json.dumps({"session_id": "a", "state": "ready", "whsec_session_id": "b"}),
        encoding="utf-8",
    )
    (dev / "stripe-webhook-secret").write_text("whsec_x", encoding="utf-8")
    paths = type("P", (), {"root": dev, "listen": listen, "secret": dev / "stripe-webhook-secret", "probe": dev / "stripe-e2e-probe.json"})()
    monkeypatch.setattr("app.services.stripe_e2e_dev._dev_local_paths", lambda cfg=None: paths)
    monkeypatch.setattr("app.core.config._BASE_DIR", tmp_path / "backend", raising=False)
    (tmp_path / "backend").mkdir()
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    monkeypatch.setattr(settings, "ENV", "dev", raising=False)
    monkeypatch.setattr(settings, "ENABLE_DEV_TOOLS", True, raising=False)

    assert settings.effective_stripe_webhook_secret() is None
