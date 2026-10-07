"""Operational Stripe E2E readiness (local Dev only)."""

import json
from datetime import datetime, timezone

from app.core.config import settings
from app.services.stripe_e2e_dev import evaluate_stripe_e2e_readiness


def test_readiness_false_without_listen_files(tmp_path, monkeypatch):
    base = tmp_path / "backend"
    base.mkdir()
    dev = tmp_path / ".dev-local"
    dev.mkdir()
    monkeypatch.setattr("app.services.stripe_e2e_dev._dev_local_paths", lambda cfg=None: type(
        "P", (), {"root": dev, "listen": dev / "stripe-listen.json", "secret": dev / "stripe-webhook-secret", "probe": dev / "stripe-e2e-probe.json"}
    )())
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    monkeypatch.setattr(settings, "ENV", "dev", raising=False)
    monkeypatch.setattr(settings, "ENABLE_DEV_TOOLS", True, raising=False)
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "sk_test_x", raising=False)
    monkeypatch.setattr(settings, "DATABASE_URL", "postgresql+psycopg2://postgres:postgres@127.0.0.1:5432/ride_db", raising=False)

    r = evaluate_stripe_e2e_readiness(settings)
    assert r.stripe_e2e_ready is False
    assert r.stripe_e2e_reason in ("listener_dead", "whsec_missing", "probe_failed")


def test_readiness_true_with_live_session(tmp_path, monkeypatch):
    dev = tmp_path / ".dev-local"
    dev.mkdir()
    session = "abc123session"
    now = datetime.now(timezone.utc).isoformat()
    listen = dev / "stripe-listen.json"
    listen.write_text(
        json.dumps(
            {
                "session_id": session,
                "pid": 999999,  # unlikely alive — force mock pid check
                "started_at": now,
                "heartbeat_at": now,
                "state": "ready",
                "forward_url": "http://127.0.0.1:8000/webhooks/stripe",
                "whsec_session_id": session,
            }
        ),
        encoding="utf-8",
    )
    (dev / "stripe-webhook-secret").write_text("whsec_testsecret1234567890", encoding="utf-8")
    paths = type("P", (), {"root": dev, "listen": listen, "secret": dev / "stripe-webhook-secret", "probe": dev / "stripe-e2e-probe.json"})()
    (dev / "stripe-e2e-probe.json").write_text(
        json.dumps({"session_id": session, "success_at": now}),
        encoding="utf-8",
    )
    monkeypatch.setattr("app.services.stripe_e2e_dev._dev_local_paths", lambda cfg=None: paths)
    monkeypatch.setattr("app.services.stripe_e2e_dev._pid_alive", lambda pid: True)
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    monkeypatch.setattr(settings, "ENV", "dev", raising=False)
    monkeypatch.setattr(settings, "ENABLE_DEV_TOOLS", True, raising=False)
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "sk_test_x", raising=False)
    monkeypatch.setattr(settings, "DATABASE_URL", "postgresql+psycopg2://postgres:postgres@127.0.0.1:5432/ride_db", raising=False)

    r = evaluate_stripe_e2e_readiness(settings)
    assert r.stripe_e2e_ready is True
    assert r.stripe_e2e_reason is None


def test_readiness_heartbeat_stale(tmp_path, monkeypatch):
    dev = tmp_path / ".dev-local"
    dev.mkdir()
    session = "sess_stale"
    old = "2020-01-01T00:00:00+00:00"
    listen = dev / "stripe-listen.json"
    listen.write_text(
        json.dumps(
            {
                "session_id": session,
                "pid": 1,
                "state": "ready",
                "whsec_session_id": session,
                "heartbeat_at": old,
            }
        ),
        encoding="utf-8",
    )
    paths = type("P", (), {"root": dev, "listen": listen, "secret": dev / "stripe-webhook-secret", "probe": dev / "stripe-e2e-probe.json"})()
    monkeypatch.setattr("app.services.stripe_e2e_dev._dev_local_paths", lambda cfg=None: paths)
    monkeypatch.setattr("app.services.stripe_e2e_dev._pid_alive", lambda pid: True)
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    monkeypatch.setattr(settings, "ENV", "dev", raising=False)
    monkeypatch.setattr(settings, "ENABLE_DEV_TOOLS", True, raising=False)
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "sk_test_x", raising=False)
    monkeypatch.setattr(settings, "DATABASE_URL", "postgresql+psycopg2://postgres:postgres@127.0.0.1:5432/ride_db", raising=False)

    r = evaluate_stripe_e2e_readiness(settings)
    assert r.stripe_e2e_ready is False
    assert r.stripe_e2e_reason == "heartbeat_stale"
