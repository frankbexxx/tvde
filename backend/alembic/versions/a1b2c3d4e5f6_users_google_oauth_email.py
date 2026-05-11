"""users: email + oauth_google_sub (login Google)

Revision ID: a1b2c3d4e5f6
Revises: e9f0a1b2c3d4
Create Date: 2026-05-12

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "a1b2c3d4e5f6"
down_revision = "e9f0a1b2c3d4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("email", sa.String(255), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("oauth_google_sub", sa.String(128), nullable=True),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index(
        "ix_users_oauth_google_sub",
        "users",
        ["oauth_google_sub"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_users_oauth_google_sub", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_column("users", "oauth_google_sub")
    op.drop_column("users", "email")
