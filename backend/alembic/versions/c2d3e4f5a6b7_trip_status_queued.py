"""Add trip_status_enum value queued + unique partial index (B2-SPIKE-BE-1).

Revision ID: c2d3e4f5a6b7
Revises: b9c0d1e2f3a4
Create Date: 2026-08-04

ADD VALUE runs in autocommit_block so the new enum label is visible to a
subsequent CREATE INDEX ... WHERE status = 'queued' in the same revision.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "c2d3e4f5a6b7"
down_revision = "b9c0d1e2f3a4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Postgres: ALTER TYPE ... ADD VALUE must commit before the new label can be
    # used in DDL (partial index predicate). Autocommit avoids split migrations.
    with op.get_context().autocommit_block():
        op.execute(sa.text("ALTER TYPE trip_status_enum ADD VALUE 'queued'"))

    op.create_index(
        "uq_trips_one_queued_per_driver",
        "trips",
        ["driver_id"],
        unique=True,
        postgresql_where=sa.text(
            "status = 'queued' AND driver_id IS NOT NULL"
        ),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_trips_one_queued_per_driver",
        table_name="trips",
    )
    # PostgreSQL: removing an enum value is non-trivial; leave type as-is
    # (same pattern as role_enum super_admin / partner).
