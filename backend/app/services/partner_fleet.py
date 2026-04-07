"""Partner fleet mutations — driver enable/disable and forced availability (tenant-scoped)."""

from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.models.driver import Driver
from app.models.enums import DriverStatus
from app.services.partner_queries import get_driver_for_partner


def set_partner_driver_enabled(
    db: Session,
    *,
    partner_id: str,
    driver_user_id: uuid.UUID,
    enabled: bool,
) -> Driver:
    """
    Enable/disable driver for fleet operations: approved vs rejected.
    Does not approve drivers still pending (admin flow).
    """
    d = get_driver_for_partner(db, partner_id, driver_user_id)
    if not d:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
    if d.status == DriverStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="cannot_change_pending_status",
        )
    if enabled:
        d.status = DriverStatus.approved
    else:
        d.status = DriverStatus.rejected
    db.commit()
    db.refresh(d)
    return d


def set_partner_driver_availability(
    db: Session,
    *,
    partner_id: str,
    driver_user_id: uuid.UUID,
    online: bool,
) -> Driver:
    """Force driver online (available) or offline without touching core trip logic."""
    d = get_driver_for_partner(db, partner_id, driver_user_id)
    if not d:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
    if d.status != DriverStatus.approved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="driver_not_approved",
        )
    d.is_available = online
    db.commit()
    db.refresh(d)
    return d
