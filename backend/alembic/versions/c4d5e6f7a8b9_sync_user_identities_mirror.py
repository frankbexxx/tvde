"""Re-run the idempotent user_identities mirror.

No schema change. Deploy runs the sync again so accounts created after the
Phase I backfill gain a mirror row. Downgrade does not delete those rows:
authentication still reads `users`, and removing the mirror would not restore
a previous login behaviour.

Revision ID: c4d5e6f7a8b9
Revises: b3c4d5e6f7a8
Create Date: 2026-09-29

"""

from __future__ import annotations

from alembic import op

revision = "c4d5e6f7a8b9"
down_revision = "b3c4d5e6f7a8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    from app.services.user_identities import backfill_user_identities

    backfill_user_identities(op.get_bind())


def downgrade() -> None:
    pass
