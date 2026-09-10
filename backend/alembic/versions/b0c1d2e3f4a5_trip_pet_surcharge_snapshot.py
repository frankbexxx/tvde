"""Add trip Pet surcharge snapshot + price breakdown (PET-1).

Revision ID: b0c1d2e3f4a5
Revises: a9b0c1d2e3f4
Create Date: 2026-09-10

Additive columns only. Historical rows keep NULL snapshot → no retroactive
Pet surcharge. New trips persist amount (incl. 0.00) + JSON breakdown.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "b0c1d2e3f4a5"
down_revision = "a9b0c1d2e3f4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "trips",
        sa.Column(
            "pet_surcharge_amount",
            sa.Numeric(10, 2),
            nullable=True,
            comment="Snapshotted Pet surcharge EUR (NULL = pre-PET-1 / no snapshot).",
        ),
    )
    op.add_column(
        "trips",
        sa.Column(
            "pet_surcharge_rule",
            sa.String(length=32),
            nullable=True,
            comment="Pet surcharge rule id, e.g. pet_surcharge_v1.",
        ),
    )
    op.add_column(
        "trips",
        sa.Column(
            "price_breakdown",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
            comment="Price breakdown snapshot (base/km/min/pet/tolls/total).",
        ),
    )


def downgrade() -> None:
    op.drop_column("trips", "price_breakdown")
    op.drop_column("trips", "pet_surcharge_rule")
    op.drop_column("trips", "pet_surcharge_amount")
