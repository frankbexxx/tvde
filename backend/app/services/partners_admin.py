"""Admin operations on Partner orgs and driver ↔ tenant assignment."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.db.models.driver import Driver, DriverLocation
from app.db.models.partner import Partner
from app.db.models.trip import Trip
from app.db.models.user import User
from app.models.enums import Role, TripStatus, UserStatus
from app.services.partner_time import get_today_range_utc
from app.utils.logging import log_event

# GPS freshness for "active" fleet driver: recent ping OR no row yet + is_available fallback.
_ACTIVE_LOCATION_MAX_AGE_SEC = 30

ACTIVE_TRIP_STATUSES = frozenset(
    {
        TripStatus.assigned,
        TripStatus.accepted,
        TripStatus.arriving,
        TripStatus.ongoing,
    }
)


def create_partner(db: Session, name: str) -> Partner:
    """Create a new fleet org. Caller must enforce admin auth."""
    trimmed = name.strip()
    if len(trimmed) < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="name_required",
        )
    if len(trimmed) > 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="name_too_long",
        )
    p = Partner(name=trimmed)
    db.add(p)
    db.commit()
    db.refresh(p)
    log_event("partner_org_created", partner_id=str(p.id), name=p.name)
    return p


def create_partner_org_admin(
    db: Session,
    *,
    partner_id: uuid.UUID,
    name: str,
    phone: str,
) -> User:
    """Create role=partner user bound to partner_org_id. Caller enforces admin auth only."""
    partner = db.execute(
        select(Partner).where(Partner.id == partner_id)
    ).scalar_one_or_none()
    if not partner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="partner_not_found",
        )
    normalized_phone = phone.strip()
    if len(normalized_phone) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="phone_required",
        )
    existing = db.execute(
        select(User.id).where(User.phone == normalized_phone).limit(1)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="phone_already_registered",
        )
    display_name = name.strip()
    if len(display_name) < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="name_required",
        )
    u = User(
        role=Role.partner,
        name=display_name,
        phone=normalized_phone,
        status=UserStatus.active,
        partner_org_id=partner_id,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    log_event(
        "partner_org_admin_created",
        partner_id=str(partner_id),
        user_id=str(u.id),
        phone=normalized_phone,
    )
    return u


def _driver_has_active_trip(db: Session, driver_user_id: uuid.UUID) -> bool:
    row = db.execute(
        select(Trip.id)
        .where(
            Trip.driver_id == driver_user_id,
            Trip.status.in_(ACTIVE_TRIP_STATUSES),
        )
        .limit(1)
    ).first()
    return row is not None


def assign_driver_to_partner(
    db: Session,
    *,
    driver_user_id: uuid.UUID,
    partner_id: uuid.UUID,
) -> Driver:
    """
    Move driver to another fleet. Trips rows are unchanged (history stays with trip.driver_id);
    partner list views use current Driver.partner_id only.

    Blocks reassignment while the driver has a trip in assigned/accepted/arriving/ongoing
    to avoid ambiguous fleet ownership during live execution.
    """
    driver = db.execute(
        select(Driver).where(Driver.user_id == driver_user_id)
    ).scalar_one_or_none()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="driver_not_found",
        )
    partner = db.execute(
        select(Partner).where(Partner.id == partner_id)
    ).scalar_one_or_none()
    if not partner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="partner_not_found",
        )
    if driver.partner_id == partner_id:
        return driver
    if _driver_has_active_trip(db, driver_user_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="driver_has_active_trip",
        )
    old_pid = str(driver.partner_id)
    driver.partner_id = partner_id
    db.commit()
    db.refresh(driver)
    log_event(
        "partner_driver_assigned",
        driver_user_id=str(driver_user_id),
        partner_id=str(partner_id),
        previous_partner_id=old_pid,
    )
    return driver


def partner_metrics(db: Session, partner_id: uuid.UUID) -> dict[str, int]:
    """Counts for partner dashboard."""
    now = datetime.now(timezone.utc)
    day_start, day_end = get_today_range_utc(now)

    trips_total = db.execute(
        select(func.count())
        .select_from(Trip)
        .join(Driver, Trip.driver_id == Driver.user_id)
        .where(Driver.partner_id == partner_id)
    ).scalar_one()
    trips_today = db.execute(
        select(func.count())
        .select_from(Trip)
        .join(Driver, Trip.driver_id == Driver.user_id)
        .where(
            Driver.partner_id == partner_id,
            Trip.created_at >= day_start,
            Trip.created_at < day_end,
        )
    ).scalar_one()

    cutoff = now - timedelta(seconds=_ACTIVE_LOCATION_MAX_AGE_SEC)
    # Active driver: fresh GPS ping, OR no location row yet and flagged available.
    active_drivers = db.execute(
        select(func.count())
        .select_from(Driver)
        .outerjoin(DriverLocation, DriverLocation.driver_id == Driver.user_id)
        .where(
            Driver.partner_id == partner_id,
            or_(
                DriverLocation.timestamp >= cutoff,
                and_(
                    DriverLocation.driver_id.is_(None),
                    Driver.is_available.is_(True),
                ),
            ),
        )
    ).scalar_one()

    return {
        "trips_total": int(trips_total or 0),
        "trips_today": int(trips_today or 0),
        "active_drivers": int(active_drivers or 0),
    }
