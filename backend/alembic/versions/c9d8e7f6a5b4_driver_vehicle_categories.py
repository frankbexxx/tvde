"""Add drivers.vehicle_categories for driver preference persistence.

Revision ID: c9d8e7f6a5b4
Revises: b2c3d4e5f6a7
Create Date: 2026-04-29
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c9d8e7f6a5b4"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "drivers",
        sa.Column(
            "vehicle_categories",
            sa.Text(),
            nullable=True,
            comment="Preferred vehicle categories for this driver (csv, ex: x,xl,pet).",
        ),
    )


def downgrade() -> None:
    op.drop_column("drivers", "vehicle_categories")

