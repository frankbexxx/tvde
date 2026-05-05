"""Driver custom zones (v2).

Revision ID: e9f0a1b2c3d4
Revises: f1a2b3c4d5e6
Create Date: 2026-05-05
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "e9f0a1b2c3d4"
down_revision: Union[str, Sequence[str], None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "driver_zone_customs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "driver_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("zone_id", sa.String(length=128), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id", name="pk_driver_zone_customs"),
        sa.UniqueConstraint("driver_id", "zone_id", name="uq_driver_zone_custom_driver_zone"),
    )
    op.create_index("ix_driver_zone_customs_driver_id", "driver_zone_customs", ["driver_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_driver_zone_customs_driver_id", table_name="driver_zone_customs")
    op.drop_table("driver_zone_customs")

