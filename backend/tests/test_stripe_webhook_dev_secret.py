"""Dev local: effective webhook secret follows .dev-local/stripe listen file."""

from app.core.config import Settings, settings


def test_effective_stripe_webhook_secret_prefers_dev_local_file(tmp_path, monkeypatch):
    dev_local = tmp_path / ".dev-local"
    dev_local.mkdir()
    secret_file = dev_local / "stripe-webhook-secret"
    file_whsec = "whsec_from_stripe_listen_session_abc123"
    secret_file.write_text(file_whsec, encoding="utf-8")

    backend_dir = tmp_path / "backend"
    backend_dir.mkdir()
    monkeypatch.setattr(
        "app.core.config._BASE_DIR",
        backend_dir,
        raising=False,
    )
    monkeypatch.setattr(
        settings,
        "STRIPE_MOCK",
        False,
        raising=False,
    )
    monkeypatch.setattr(settings, "ENV", "dev", raising=False)
    monkeypatch.setattr(settings, "ENABLE_DEV_TOOLS", True, raising=False)
    monkeypatch.setattr(
        settings,
        "STRIPE_WEBHOOK_SECRET",
        "whsec_stale_from_dot_env",
        raising=False,
    )

    assert settings.effective_stripe_webhook_secret() == file_whsec


def test_effective_stripe_webhook_secret_deployed_ignores_file(tmp_path, monkeypatch):
    dev_local = tmp_path / ".dev-local"
    dev_local.mkdir()
    (dev_local / "stripe-webhook-secret").write_text("whsec_local_only", encoding="utf-8")
    backend_dir = tmp_path / "backend"
    backend_dir.mkdir()
    monkeypatch.setattr("app.core.config._BASE_DIR", backend_dir, raising=False)

    s = Settings(
        DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/ride_db",
        JWT_SECRET_KEY="x" * 32,
        OTP_SECRET="y" * 32,
        ENV="production",
        STRIPE_MOCK=False,
        STRIPE_WEBHOOK_SECRET="whsec_render_dashboard",
    )
    assert s.effective_stripe_webhook_secret() == "whsec_render_dashboard"
