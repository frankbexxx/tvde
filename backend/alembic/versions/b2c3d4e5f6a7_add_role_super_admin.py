"""Add role_enum value super_admin (SP-F governança).

Revision ID: b2c3d4e5f6a7
Revises: a7c8d9e0f1a2
Create Date: 2026-04-17
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "b2c3d4e5f6a7"
down_revision = "a7c8d9e0f1a2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(sa.text("ALTER TYPE role_enum ADD VALUE 'super_admin'"))


def downgrade() -> None:
    # PostgreSQL: removing an enum value is non-trivial; leave type as-is.
    pass
