"""Unique Portuguese E.164 phones for tests (`+351` + 9 digits).

Avoids the flaky pattern ``+3519{uuid % 10_000_000:07d}`` (only ~10M values),
which collides under ``ix_users_phone`` when CI reuses the same Postgres across
hundreds of tests in one run.
"""

from __future__ import annotations

import uuid


def unique_test_phone() -> str:
    """Return a random ``+351XXXXXXXXX`` unlikely to collide in a test suite run."""
    return f"+351{uuid.uuid4().int % 10**9:09d}"
