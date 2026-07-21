"""vehicles: service_category → service_categories (CSV multi, alinhado a drivers)

Revision ID: a8b9c0d1e2f3
Revises: f6a7b8c9d0e1
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "a8b9c0d1e2f3"
down_revision = "f6a7b8c9d0e1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "vehicles",
        "service_category",
        new_column_name="service_categories",
        existing_type=sa.String(length=24),
        type_=sa.Text(),
        existing_nullable=False,
        existing_server_default=sa.text("'x'"),
        comment="CSV of service categories (same codes as drivers.vehicle_categories); metadata only.",
    )


def downgrade() -> None:
    # Truncate to first category code for String(24) downgrade.
    op.execute(
        sa.text(
            """
            UPDATE vehicles
            SET service_categories = split_part(service_categories, ',', 1)
            WHERE position(',' in service_categories) > 0
            """
        )
    )
    op.alter_column(
        "vehicles",
        "service_categories",
        new_column_name="service_category",
        existing_type=sa.Text(),
        type_=sa.String(length=24),
        existing_nullable=False,
        existing_server_default=sa.text("'x'"),
        comment="Vehicle metadata only; does not drive matching.",
    )
