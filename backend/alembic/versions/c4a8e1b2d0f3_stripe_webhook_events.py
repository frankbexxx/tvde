"""stripe_webhook_event dedup table (Stripe evt_ ids).

Bases de dados que ja tinham schema antes de Alembic: fazer
`alembic stamp 80f5b3e9fd12` (se o schema coincide com o baseline) e depois
`alembic upgrade head` para aplicar so esta revisao.

Revision ID: c4a8e1b2d0f3
Revises: 80f5b3e9fd12
Create Date: 2026-03-27

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "c4a8e1b2d0f3"
down_revision: Union[str, Sequence[str], None] = "80f5b3e9fd12"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "stripe_webhook_events",
        sa.Column(
            "stripe_event_id",
            sa.String(length=255),
            nullable=False,
            comment="Stripe event id (evt_…).",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
            comment="First time this event was recorded.",
        ),
        sa.PrimaryKeyConstraint("stripe_event_id"),
    )


def downgrade() -> None:
    op.drop_table("stripe_webhook_events")
