"""Add trip.passenger_count + vehicle.max_passengers (PET-4).

Revision ID: c1d2e3f4a5b6
Revises: b0c1d2e3f4a5
Create Date: 2026-09-10

Backward compatible:
- trips.passenger_count NOT NULL DEFAULT 1
- vehicles.max_passengers nullable (NULL = unknown / legacy)
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "c1d2e3f4a5b6"
down_revision = "b0c1d2e3f4a5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "trips",
        sa.Column(
            "passenger_count",
            sa.Integer(),
            nullable=False,
            server_default="1",
            comment="Number of passengers (excludes driver). Default 1 for legacy clients.",
        ),
    )
    op.add_column(
        "vehicles",
        sa.Column(
            "max_passengers",
            sa.Integer(),
            nullable=True,
            comment=(
                "Max passengers (excludes driver). NULL = unknown/legacy; "
                "when capacity gates ON, NULL blocks new trip ops."
            ),
        ),
    )


def downgrade() -> None:
    op.drop_column("vehicles", "max_passengers")
    op.drop_column("trips", "passenger_count")
