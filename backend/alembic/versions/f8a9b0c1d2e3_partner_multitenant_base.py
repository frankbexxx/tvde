"""partners table, role partner, drivers.partner_id, users.partner_org_id.

Revision ID: f8a9b0c1d2e3
Revises: e2b1c3d4f5a6
Create Date: 2026-04-05

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "f8a9b0c1d2e3"
down_revision: Union[str, Sequence[str], None] = "e2b1c3d4f5a6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_PARTNER_ID = "00000000-0000-4000-8000-000000000001"


def upgrade() -> None:
    op.create_table(
        "partners",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
        ),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    # PostgreSQL: extend enum (runs inside Alembic transaction on supported versions).
    # PostgreSQL: safe on first upgrade only (re-run may error if value exists).
    op.execute(sa.text("ALTER TYPE role_enum ADD VALUE 'partner'"))

    op.add_column(
        "drivers",
        sa.Column(
            "partner_id",
            UUID(as_uuid=True),
            nullable=True,
        ),
    )
    op.create_index("ix_drivers_partner_id", "drivers", ["partner_id"], unique=False)
    op.create_foreign_key(
        "fk_drivers_partner_id_partners",
        "drivers",
        "partners",
        ["partner_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    op.execute(
        sa.text(
            "INSERT INTO partners (id, name, created_at) VALUES "
            f"('{DEFAULT_PARTNER_ID}'::uuid, 'Default fleet', NOW())"
        )
    )
    op.execute(
        sa.text(
            f"UPDATE drivers SET partner_id = '{DEFAULT_PARTNER_ID}'::uuid "
            "WHERE partner_id IS NULL"
        )
    )
    op.alter_column("drivers", "partner_id", nullable=False)

    op.add_column(
        "users",
        sa.Column(
            "partner_org_id",
            UUID(as_uuid=True),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_users_partner_org_id", "users", ["partner_org_id"], unique=False
    )
    op.create_foreign_key(
        "fk_users_partner_org_id_partners",
        "users",
        "partners",
        ["partner_org_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_users_partner_org_id_partners", "users", type_="foreignkey")
    op.drop_index("ix_users_partner_org_id", table_name="users")
    op.drop_column("users", "partner_org_id")

    op.drop_constraint("fk_drivers_partner_id_partners", "drivers", type_="foreignkey")
    op.drop_index("ix_drivers_partner_id", table_name="drivers")
    op.drop_column("drivers", "partner_id")

    op.drop_table("partners")
    # role_enum still contains 'partner' — manual cleanup if required.
