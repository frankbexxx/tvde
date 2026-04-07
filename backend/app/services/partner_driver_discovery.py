"""Partner driver discovery & add-to-fleet (C018).

Discovery is limited to drivers currently in the DEFAULT_PARTNER_UUID pool to avoid cross-tenant exposure.
"""

from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver
from app.db.models.user import User
from app.models.enums import DriverStatus
from app.services.partners_admin import assign_driver_to_partner


def discover_drivers_for_partner(
    db: Session,
    *,
    query: str,
    limit: int = 50,
) -> list[Driver]:
    q = (query or "").strip()
    if len(q) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="query_too_short",
        )
    stmt = (
        select(Driver)
        .join(User, Driver.user_id == User.id)
        .where(Driver.partner_id == DEFAULT_PARTNER_UUID)
        .where(Driver.status == DriverStatus.approved)
        .where(or_(User.phone.ilike(f"%{q}%"), User.name.ilike(f"%{q}%")))
        .options(joinedload(Driver.user))
        .order_by(User.name.asc())
        .limit(limit)
    )
    return list(db.execute(stmt).scalars().unique().all())


def partner_add_driver_to_fleet(
    db: Session,
    *,
    partner_id: str,
    driver_user_id: uuid.UUID,
) -> Driver:
    pid = uuid.UUID(partner_id)
    # reuse admin service with its active-trip guard + partner existence check
    return assign_driver_to_partner(db, driver_user_id=driver_user_id, partner_id=pid)

