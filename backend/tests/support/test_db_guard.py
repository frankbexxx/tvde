"""TEST-DB-GUARD-1: refuse pytest against remote / Render databases.

Pure helpers — no app imports. Called from conftest before Alembic / SessionLocal.
"""

from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import urlparse

REFUSAL_PREFIX = "Refusing to run tests against remote database"

_LOCAL_HOSTS = frozenset({"localhost", "127.0.0.1", "::1"})
_REMOTE_HOST_MARKERS = ("onrender.com", "render.com")


def backend_root_from_conftest(conftest_file: str | Path) -> Path:
    """tests/conftest.py → backend/."""
    return Path(conftest_file).resolve().parents[1]


def read_database_url_from_env_file(env_path: Path) -> str | None:
    """Read DATABASE_URL from a .env file without loading secrets into os.environ."""
    if not env_path.is_file():
        return None
    try:
        text = env_path.read_text(encoding="utf-8")
    except OSError:
        return None
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export ") :].strip()
        if not line.startswith("DATABASE_URL="):
            continue
        value = line.split("=", 1)[1].strip()
        if (value.startswith('"') and value.endswith('"')) or (
            value.startswith("'") and value.endswith("'")
        ):
            value = value[1:-1]
        return value or None
    return None


def resolve_database_url_for_tests(*, backend_root: Path) -> str:
    """Prefer process env; else backend/.env. Raise if missing."""
    from_env = (os.environ.get("DATABASE_URL") or "").strip()
    if from_env:
        return from_env
    from_file = read_database_url_from_env_file(backend_root / ".env")
    if from_file:
        return from_file
    raise RuntimeError(
        "DATABASE_URL is not set. For local pytest use a local Postgres URL, e.g. "
        "postgresql://postgres:postgres@127.0.0.1:5432/test_db "
        "(see docs/testing/BACKEND_PYTEST_SAFE.md)."
    )


def database_hostname(url: str) -> str:
    """Hostname only — never return userinfo/password."""
    normalized = url.strip()
    normalized = normalized.replace("postgresql+psycopg2://", "postgresql://", 1)
    normalized = normalized.replace("postgres+psycopg2://", "postgres://", 1)
    # Bare IPv6 localhost without brackets confuses urlparse; treat as ::1.
    if "@::1:" in normalized or "@::1/" in normalized or normalized.startswith("postgresql://::1"):
        return "::1"
    host = urlparse(normalized).hostname
    return (host or "").lower()


def allow_remote_test_db_enabled(
    env: dict[str, str] | None = None,
) -> bool:
    src = env if env is not None else os.environ
    raw = (src.get("ALLOW_REMOTE_TEST_DB") or "").strip().lower()
    return raw in {"yes", "1", "true"}


def is_local_test_database_host(hostname: str) -> bool:
    return hostname in _LOCAL_HOSTS


def looks_like_remote_test_database_host(hostname: str) -> bool:
    if not hostname:
        return True
    if is_local_test_database_host(hostname):
        return False
    if any(marker in hostname for marker in _REMOTE_HOST_MARKERS):
        return True
    # Any non-local host is treated as remote for pytest.
    return True


def refusal_message(hostname: str) -> str:
    host_disp = hostname or "(unknown)"
    return (
        f"{REFUSAL_PREFIX} (host={host_disp}). "
        "Use a local DATABASE_URL (localhost / 127.0.0.1 / ::1), e.g. "
        "postgresql://postgres:postgres@127.0.0.1:5432/test_db. "
        "Override only if intentional: ALLOW_REMOTE_TEST_DB=YES."
    )


def assert_safe_test_database_url(
    url: str,
    *,
    env: dict[str, str] | None = None,
) -> None:
    """Raise SystemExit with a clear message if URL is not safe for pytest."""
    hostname = database_hostname(url)
    if allow_remote_test_db_enabled(env):
        return
    if is_local_test_database_host(hostname):
        return
    if looks_like_remote_test_database_host(hostname):
        raise SystemExit(refusal_message(hostname))


def assert_safe_test_database_for_pytest(*, backend_root: Path) -> str:
    """Resolve URL and enforce guard. Returns the URL used (for diagnostics without secrets)."""
    url = resolve_database_url_for_tests(backend_root=backend_root)
    assert_safe_test_database_url(url)
    return url
