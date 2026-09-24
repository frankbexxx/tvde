"""Add trips.intermediation_rate_percent (L-15).

Revision ID: c5d6e7f8a9b0
Revises: e3f4a5b6c7d8
Create Date: 2026-09-24

Additive nullable column. No server default and no backfill.
Historical trips stay NULL and keep the previous driver-percent settlement.
New trips persist the commercial rate at create.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "c5d6e7f8a9b0"
down_revision = "e3f4a5b6c7d8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "trips",
        sa.Column(
            "intermediation_rate_percent",
            sa.Numeric(5, 2),
            nullable=True,
            comment=(
                "Frozen intermediation rate for this trip. "
                "NULL = legacy row; settlement uses driver.commission_percent."
            ),
        ),
    )


def downgrade() -> None:
    op.drop_column("trips", "intermediation_rate_percent")
