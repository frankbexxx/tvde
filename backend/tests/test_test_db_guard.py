"""Unit tests for TEST-DB-GUARD-1 (no database connection)."""

from __future__ import annotations

from pathlib import Path

import pytest

from tests.support.test_db_guard import (
    REFUSAL_PREFIX,
    assert_safe_test_database_url,
    database_hostname,
    looks_like_remote_test_database_host,
    read_database_url_from_env_file,
    refusal_message,
    resolve_database_url_for_tests,
)


def test_database_hostname_strips_driver_and_userinfo() -> None:
    url = "postgresql+psycopg2://user:s3cret%40pass@dpg-abc.onrender.com/ride_db"
    assert database_hostname(url) == "dpg-abc.onrender.com"


def test_localhost_variants_allowed() -> None:
    for url in (
        "postgresql://postgres:postgres@localhost:5432/test_db",
        "postgresql://postgres:postgres@127.0.0.1:5432/test_db",
        "postgresql://postgres:postgres@[::1]:5432/test_db",
        "postgresql://postgres:postgres@::1:5432/test_db",
    ):
        assert_safe_test_database_url(url)


def test_render_host_refused() -> None:
    url = "postgresql://u:p@dpg-xxx.frankfurt-postgres.render.com/ride_db_wypz"
    with pytest.raises(SystemExit) as ei:
        assert_safe_test_database_url(url)
    msg = str(ei.value)
    assert REFUSAL_PREFIX in msg
    assert "render.com" in msg
    assert "s3cret" not in msg
    assert "p@" not in msg  # no password leak from this URL either
    assert ":p@" not in msg


def test_refusal_message_shows_host_only() -> None:
    msg = refusal_message("dpg-secret.onrender.com")
    assert REFUSAL_PREFIX in msg
    assert "host=dpg-secret.onrender.com" in msg
    # Hint may include an example local URL; must not echo a remote password.
    assert "s3cret" not in msg


def test_non_local_host_refused() -> None:
    url = "postgresql://u:p@db.example.com:5432/app"
    with pytest.raises(SystemExit) as ei:
        assert_safe_test_database_url(url)
    assert REFUSAL_PREFIX in str(ei.value)


def test_allow_remote_override() -> None:
    url = "postgresql://u:p@dpg-xxx.onrender.com/db"
    assert_safe_test_database_url(url, env={"ALLOW_REMOTE_TEST_DB": "YES"})
    assert_safe_test_database_url(url, env={"ALLOW_REMOTE_TEST_DB": "true"})


def test_looks_like_remote() -> None:
    assert looks_like_remote_test_database_host("dpg-x.onrender.com") is True
    assert looks_like_remote_test_database_host("localhost") is False
    assert looks_like_remote_test_database_host("") is True


def test_read_database_url_from_env_file(tmp_path: Path) -> None:
    env = tmp_path / ".env"
    env.write_text(
        "# comment\nJWT_SECRET_KEY=x\nDATABASE_URL=postgresql://u:hidden@127.0.0.1:5432/test_db\n",
        encoding="utf-8",
    )
    assert (
        read_database_url_from_env_file(env)
        == "postgresql://u:hidden@127.0.0.1:5432/test_db"
    )


def test_resolve_prefers_process_env(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql://u:p@127.0.0.1:5432/from_env")
    (tmp_path / ".env").write_text(
        "DATABASE_URL=postgresql://u:p@onrender.com/from_file\n", encoding="utf-8"
    )
    assert resolve_database_url_for_tests(backend_root=tmp_path).endswith("/from_env")
