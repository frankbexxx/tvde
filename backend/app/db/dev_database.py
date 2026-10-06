"""Dev database policy: local Postgres only. Never fall back to Render."""

from __future__ import annotations

from urllib.parse import urlparse

_LOCAL_HOSTS = frozenset({"127.0.0.1", "localhost", "::1"})


def database_url_host(url: str) -> str:
    parsed = urlparse((url or "").replace("+psycopg2", ""))
    return (parsed.hostname or "").strip().lower()


def assert_dev_database_is_local(*, database_url: str, is_development: bool) -> None:
    """Abort Dev startup when DATABASE_URL is not loopback.

    Production/staging/test are untouched. No silent remap to Render or local.
    """
    if not is_development:
        return
    host = database_url_host(database_url)
    if host in _LOCAL_HOSTS:
        return
    raise RuntimeError(
        f"DEV abort: DATABASE_URL host={host!r} is not local. "
        "Dev must use 127.0.0.1/localhost:5432/ride_db. No Render fallback."
    )
