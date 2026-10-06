"""Dev DATABASE_URL must be loopback; no Render remap."""

from __future__ import annotations

import asyncio

import pytest

import app.main as main_module
from app.core.config import settings
from app.db.dev_database import assert_dev_database_is_local, database_url_host

_LOCAL_URL = "postgresql://postgres:postgres@127.0.0.1:5432/ride_db"
_RENDER_URL = "postgresql://u:p@dpg-example.frankfurt-postgres.render.com:5432/ride_db_wypz"


def _run_lifespan() -> None:
    async def _enter() -> None:
        async with main_module.lifespan(main_module.app):
            pass

    asyncio.run(_enter())


@pytest.fixture
def dev_settings(monkeypatch: pytest.MonkeyPatch) -> pytest.MonkeyPatch:
    monkeypatch.setattr(settings, "ENV", "dev")
    monkeypatch.setattr(settings, "ENVIRONMENT", None)
    return monkeypatch


def test_database_url_host_strips_driver() -> None:
    assert (
        database_url_host(
            "postgresql+psycopg2://u:p@127.0.0.1:5432/ride_db"
        )
        == "127.0.0.1"
    )


@pytest.mark.parametrize(
    "url",
    [
        "postgresql://postgres:postgres@127.0.0.1:5432/ride_db",
        "postgresql://postgres:postgres@localhost:5432/ride_db",
        "postgresql://postgres:postgres@[::1]:5432/ride_db",
    ],
)
def test_assert_dev_allows_loopback(url: str) -> None:
    assert_dev_database_is_local(database_url=url, is_development=True)


def test_assert_dev_aborts_render_host() -> None:
    url = (
        "postgresql://u:p@dpg-example.frankfurt-postgres.render.com:5432/ride_db_wypz"
    )
    with pytest.raises(RuntimeError, match="DEV abort"):
        assert_dev_database_is_local(database_url=url, is_development=True)


def test_assert_dev_skips_when_not_development() -> None:
    url = "postgresql://u:p@dpg-example.frankfurt-postgres.render.com/ride_db_wypz"
    assert_dev_database_is_local(database_url=url, is_development=False)


def test_dev_startup_runs_upgrade_head(dev_settings: pytest.MonkeyPatch) -> None:
    calls: list[str] = []
    dev_settings.setattr(settings, "DATABASE_URL", _LOCAL_URL)
    dev_settings.setattr(main_module, "upgrade_to_head", lambda: calls.append("up"))
    _run_lifespan()
    assert calls == ["up"]


def test_dev_startup_aborts_when_migration_fails(dev_settings: pytest.MonkeyPatch) -> None:
    def _boom() -> None:
        raise RuntimeError("migration failed")

    dev_settings.setattr(settings, "DATABASE_URL", _LOCAL_URL)
    dev_settings.setattr(main_module, "upgrade_to_head", _boom)
    with pytest.raises(RuntimeError, match="migration failed"):
        _run_lifespan()


def test_dev_startup_aborts_on_render_url(dev_settings: pytest.MonkeyPatch) -> None:
    calls: list[str] = []
    dev_settings.setattr(settings, "DATABASE_URL", _RENDER_URL)
    dev_settings.setattr(main_module, "upgrade_to_head", lambda: calls.append("up"))
    with pytest.raises(RuntimeError, match="DEV abort"):
        _run_lifespan()
    assert calls == []
