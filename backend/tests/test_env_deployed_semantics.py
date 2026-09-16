"""ENV / ENVIRONMENT deployed-vs-development semantics (Fase A+B)."""

from __future__ import annotations

import pytest

from app.core.config import Settings, settings
from app.main import _cors_middleware_params


def _apply_env(
    monkeypatch: pytest.MonkeyPatch,
    *,
    env: str,
    environment: str | None = None,
    stripe_mock: bool | None = None,
    enable_dev_tools: bool | None = None,
    beta_mode: bool | None = None,
    allow_default_password: bool | None = None,
    cors_origins: str | None = None,
) -> None:
    monkeypatch.setattr(settings, "ENV", env, raising=False)
    monkeypatch.setattr(settings, "ENVIRONMENT", environment, raising=False)
    if stripe_mock is not None:
        monkeypatch.setattr(settings, "STRIPE_MOCK", stripe_mock, raising=False)
    if enable_dev_tools is not None:
        monkeypatch.setattr(settings, "ENABLE_DEV_TOOLS", enable_dev_tools, raising=False)
    if beta_mode is not None:
        monkeypatch.setattr(settings, "BETA_MODE", beta_mode, raising=False)
    if allow_default_password is not None:
        monkeypatch.setattr(
            settings, "ALLOW_DEFAULT_PASSWORD_LOGIN", allow_default_password, raising=False
        )
    if cors_origins is not None:
        monkeypatch.setattr(settings, "CORS_ALLOWED_ORIGINS", cors_origins, raising=False)


@pytest.mark.parametrize(
    ("label", "prod", "staging", "dev", "test", "deployed"),
    [
        ("production", True, False, False, False, True),
        ("prod", True, False, False, False, True),
        ("staging", False, True, False, False, True),
        ("stage", False, True, False, False, True),
        ("dev", False, False, True, False, False),
        ("development", False, False, True, False, False),
        ("test", False, False, False, True, False),
        ("unknown-cloud", False, False, False, False, True),
        ("", False, False, False, False, True),
    ],
)
def test_environment_helper_matrix(
    monkeypatch: pytest.MonkeyPatch,
    label: str,
    prod: bool,
    staging: bool,
    dev: bool,
    test: bool,
    deployed: bool,
) -> None:
    _apply_env(monkeypatch, env=label, environment=None)
    assert settings.is_production_environment() is prod
    assert settings.is_staging_environment() is staging
    assert settings.is_development_environment() is dev
    assert settings.is_test_environment() is test
    assert settings.is_deployed_environment() is deployed
    assert settings.uses_permissive_cors() is (not deployed)
    assert settings.should_run_alembic_on_startup() is deployed


def test_environment_overrides_env(monkeypatch: pytest.MonkeyPatch) -> None:
    _apply_env(monkeypatch, env="production", environment="staging")
    assert settings._raw_environment_label() == "staging"
    assert settings.is_staging_environment() is True
    assert settings.is_production_environment() is False
    assert settings.is_deployed_environment() is True
    assert settings.is_development_environment() is False


def test_staging_safety_matrix(monkeypatch: pytest.MonkeyPatch) -> None:
    _apply_env(
        monkeypatch,
        env="staging",
        environment=None,
        enable_dev_tools=False,
        beta_mode=True,
        allow_default_password=None,
        cors_origins="https://tvde-staging-app.onrender.com,http://localhost:5173",
    )
    assert settings.is_staging_environment() is True
    assert settings.is_development_environment() is False
    assert settings.is_deployed_environment() is True
    assert settings.uses_permissive_cors() is False
    assert settings.should_run_alembic_on_startup() is True
    assert settings.dev_tools_router_enabled() is False
    assert settings.debug_router_enabled() is True  # BETA_MODE, same as prod policy
    assert settings.allow_default_password_login() is False
    assert settings.is_forbidden_default_password(settings.DEFAULT_PASSWORD) is True

    cors = _cors_middleware_params()
    assert cors["allow_origins"] != ["*"]
    assert "https://tvde-staging-app.onrender.com" in cors["allow_origins"]
    assert cors["allow_credentials"] is True


def test_staging_debug_not_always_on_without_beta(monkeypatch: pytest.MonkeyPatch) -> None:
    _apply_env(monkeypatch, env="staging", beta_mode=False, enable_dev_tools=False)
    assert settings.debug_router_enabled() is False


def test_staging_dev_tools_off_even_with_enable_flag(monkeypatch: pytest.MonkeyPatch) -> None:
    _apply_env(monkeypatch, env="staging", enable_dev_tools=True)
    assert settings.dev_tools_router_enabled() is False


@pytest.mark.parametrize(
    ("env", "stripe_mock", "live"),
    [
        ("production", False, True),
        ("production", True, True),
        ("staging", True, False),
        ("staging", False, True),
        ("dev", True, False),
        ("dev", False, False),
        ("test", True, False),
    ],
)
def test_stripe_live_deploy_matrix(
    monkeypatch: pytest.MonkeyPatch, env: str, stripe_mock: bool, live: bool
) -> None:
    _apply_env(monkeypatch, env=env, stripe_mock=stripe_mock)
    assert settings.is_stripe_live_deploy() is live


def test_regression_current_prod_config(monkeypatch: pytest.MonkeyPatch) -> None:
    """Render prod today: ENV=production ENVIRONMENT=None BETA_MODE=True."""
    _apply_env(
        monkeypatch,
        env="production",
        environment=None,
        beta_mode=True,
        enable_dev_tools=False,
        allow_default_password=None,
        cors_origins="https://tvde-app-j51f.onrender.com,http://localhost:5173",
    )
    assert settings.is_production_environment() is True
    assert settings.is_staging_environment() is False
    assert settings.is_development_environment() is False
    assert settings.is_deployed_environment() is True
    assert settings.dev_tools_router_enabled() is False
    assert settings.debug_router_enabled() is True
    assert settings.should_run_alembic_on_startup() is True
    assert settings.uses_permissive_cors() is False
    assert settings.allow_default_password_login() is False
    cors = _cors_middleware_params()
    assert cors["allow_credentials"] is True
    assert "*" not in cors["allow_origins"]


def test_regression_current_staging_config(monkeypatch: pytest.MonkeyPatch) -> None:
    """Render staging today still uses ENV=production (same helpers as prod)."""
    _apply_env(
        monkeypatch,
        env="production",
        environment=None,
        beta_mode=True,
        enable_dev_tools=False,
        allow_default_password=None,
    )
    assert settings.is_production_environment() is True
    assert settings.is_staging_environment() is False
    assert settings.is_deployed_environment() is True
    assert settings.is_development_environment() is False
    assert settings.dev_tools_router_enabled() is False
    assert settings.debug_router_enabled() is True
    assert settings.should_run_alembic_on_startup() is True
    assert settings.uses_permissive_cors() is False


def test_unknown_label_is_deployed_safe(monkeypatch: pytest.MonkeyPatch) -> None:
    _apply_env(monkeypatch, env="weird-env", enable_dev_tools=True, beta_mode=False)
    assert settings.is_development_environment() is False
    assert settings.is_deployed_environment() is True
    assert settings.uses_permissive_cors() is False
    assert settings.dev_tools_router_enabled() is False
    assert settings.debug_router_enabled() is False


def test_settings_class_raw_label_trim_case() -> None:
    # Construct without full required secrets by using model_construct
    s = Settings.model_construct(
        ENV="  Dev  ",
        ENVIRONMENT=None,
        DATABASE_URL="postgresql://x",
        JWT_SECRET_KEY="x" * 32,
        OTP_SECRET="y" * 32,
    )
    assert s._raw_environment_label() == "dev"
    assert s.is_development_environment() is True
