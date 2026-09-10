"""Add trip Pet attribute columns (PET-0 model split).

Revision ID: a9b0c1d2e3f4
Revises: f0a1b2c3d4e5
Create Date: 2026-09-10

Pet is no longer modelled only as vehicle_category='pet'. New columns store
Pet / assistance attributes while vehicle_category remains the fare category.
No rewrite of historical vehicle_category values.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "a9b0c1d2e3f4"
down_revision = "f0a1b2c3d4e5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "trips",
        sa.Column(
            "has_pet",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
            comment="Normal Pet attribute (not fare category); assistance uses is_assistance_animal.",
        ),
    )
    op.add_column(
        "trips",
        sa.Column(
            "pet_size",
            sa.String(length=16),
            nullable=True,
            comment="Pet size: small | medium | large (PET-0 foundation).",
        ),
    )
    op.add_column(
        "trips",
        sa.Column(
            "pet_transport",
            sa.String(length=16),
            nullable=True,
            comment="Pet transport: carrier | harness (PET-0 foundation).",
        ),
    )
    op.add_column(
        "trips",
        sa.Column(
            "is_assistance_animal",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
            comment="Assistance animal (not Pet product; no Pet surcharge; no Pet opt-in).",
        ),
    )
    op.add_column(
        "trips",
        sa.Column(
            "pet_occupies_seat",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
            comment="Hint that Pet occupies seat/space (capacity enforcement later).",
        ),
    )


def downgrade() -> None:
    op.drop_column("trips", "pet_occupies_seat")
    op.drop_column("trips", "is_assistance_animal")
    op.drop_column("trips", "pet_transport")
    op.drop_column("trips", "pet_size")
    op.drop_column("trips", "has_pet")
