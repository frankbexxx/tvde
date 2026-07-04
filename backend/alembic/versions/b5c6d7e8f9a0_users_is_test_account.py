"""users: is_test_account flag

Revision ID: b5c6d7e8f9a0
Revises: e6f7a8b9c0d1
Create Date: 2026-07-04

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "b5c6d7e8f9a0"
down_revision = "e6f7a8b9c0d1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "is_test_account",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
            comment="Demo/dev account; login only when BETA_MODE and password_hash set.",
        ),
    )
    op.alter_column("users", "is_test_account", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "is_test_account")
