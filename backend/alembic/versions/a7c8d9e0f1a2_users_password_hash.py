"""Optional bcrypt password_hash on users.

Revision ID: a7c8d9e0f1a2
Revises: f8a9b0c1d2e3
Create Date: 2026-04-17

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a7c8d9e0f1a2"
down_revision: Union[str, Sequence[str], None] = "f8a9b0c1d2e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "password_hash",
            sa.String(255),
            nullable=True,
            comment="Optional bcrypt hash; if null, BETA login uses DEFAULT_PASSWORD.",
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "password_hash")
