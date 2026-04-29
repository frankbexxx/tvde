"""Add trips.vehicle_category for category-aware dispatch.

Revision ID: d4e5f6a7b8c9
Revises: c9d8e7f6a5b4
Create Date: 2026-04-29
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, Sequence[str], None] = "c9d8e7f6a5b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "trips",
        sa.Column(
            "vehicle_category",
            sa.String(length=24),
            nullable=True,
            comment="Requested vehicle category (x, xl, pet, comfort, black, electric, van).",
        ),
    )
    op.execute(sa.text("UPDATE trips SET vehicle_category = 'x' WHERE vehicle_category IS NULL"))


def downgrade() -> None:
    op.drop_column("trips", "vehicle_category")

