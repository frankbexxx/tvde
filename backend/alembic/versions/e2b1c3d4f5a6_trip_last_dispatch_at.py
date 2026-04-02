"""trips.last_dispatch_at for redispatch throttling.

Revision ID: e2b1c3d4f5a6
Revises: c4a8e1b2d0f3
Create Date: 2026-03-27

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "e2b1c3d4f5a6"
down_revision: Union[str, Sequence[str], None] = "c4a8e1b2d0f3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "trips",
        sa.Column(
            "last_dispatch_at",
            sa.DateTime(timezone=True),
            nullable=True,
            comment="Last time create_offers_for_trip ran for this trip (redispatch throttle).",
        ),
    )


def downgrade() -> None:
    op.drop_column("trips", "last_dispatch_at")
