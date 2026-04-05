"""Stable UUID for the default fleet partner (migration backfill + new drivers without explicit tenant)."""

import uuid

# Must match Alembic migration `partner_multitenant_base` insert.
DEFAULT_PARTNER_UUID = uuid.UUID("00000000-0000-4000-8000-000000000001")
