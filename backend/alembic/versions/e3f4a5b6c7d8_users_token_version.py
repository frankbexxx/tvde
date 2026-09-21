"""users.token_version for JWT revocation after password change (L-SEC-13)

Revision ID: e3f4a5b6c7d8
Revises: d2e3f4a5b6c7
Create Date: 2026-09-21

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "e3f4a5b6c7d8"
down_revision = "d2e3f4a5b6c7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "token_version",
            sa.Integer(),
            nullable=False,
            server_default="0",
            comment="Incremented on password change; JWT claim must match (L-SEC-13).",
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "token_version")
