"""Tenant-scoped reads for partner role (isolation in SQL, not reused passenger/driver list APIs)."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import cast, or_, select
from sqlalchemy.types import String
from sqlalchemy.orm import Session, joinedload

from app.db.models.driver import Driver
from app.db.models.trip import Trip
from app.models.enums import TripStatus


def list_drivers_for_partner(db: Session, partner_id: str) -> list[Driver]:
    pid = uuid.UUID(partner_id)
    return list(
        db.execute(
            select(Driver)
            .where(Driver.partner_id == pid)
            .order_by(Driver.created_at.asc())
        )
        .scalars()
        .all()
    )


def list_drivers_for_partner_enriched(db: Session, partner_id: str) -> list[Driver]:
    """Same tenant filter as list_drivers_for_partner; loads user + optional last location."""
    pid = uuid.UUID(partner_id)
    return list(
        db.execute(
            select(Driver)
            .where(Driver.partner_id == pid)
            .options(
                joinedload(Driver.user),
                joinedload(Driver.last_location),
            )
            .order_by(Driver.created_at.asc())
        )
        .unique()
        .scalars()
        .all()
    )


def list_trips_for_partner(db: Session, partner_id: str) -> list[Trip]:
    """
    Trips whose assigned driver currently belongs to this partner (JOIN Trip → Driver, filter partner_id).

    Trips are attributed by the driver's partner_id at query time — not historical fleet ownership.
    Reassigning a driver does not rewrite past trip rows; reporting reflects current tenant mapping only.
    """
    pid = uuid.UUID(partner_id)
    stmt = (
        select(Trip)
        .join(Driver, Trip.driver_id == Driver.user_id)
        .where(Driver.partner_id == pid)
        .order_by(Trip.created_at.desc())
    )
    return list(db.execute(stmt).scalars().all())


def get_driver_for_partner(
    db: Session, partner_id: str, driver_user_id: uuid.UUID
) -> Driver | None:
    pid = uuid.UUID(partner_id)
    return (
        db.execute(
            select(Driver)
            .where(Driver.user_id == driver_user_id, Driver.partner_id == pid)
            .options(
                joinedload(Driver.user),
                joinedload(Driver.last_location),
            )
        )
        .unique()
        .scalar_one_or_none()
    )


def get_trip_for_partner(
    db: Session, partner_id: str, trip_id: uuid.UUID
) -> Trip | None:
    pid = uuid.UUID(partner_id)
    return db.execute(
        select(Trip)
        .join(Driver, Trip.driver_id == Driver.user_id)
        .where(Trip.id == trip_id, Driver.partner_id == pid)
    ).scalar_one_or_none()


_ONGOING_STATUSES = (
    TripStatus.assigned,
    TripStatus.accepted,
    TripStatus.arriving,
    TripStatus.ongoing,
)


def list_trips_for_partner_filtered(
    db: Session,
    partner_id: str,
    *,
    status_filter: str | None = None,
    driver_id: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    search: str | None = None,
) -> list[Trip]:
    """Same tenant scope as list_trips_for_partner; optional filters mirror partner UI export."""
    from app.db.models.user import User

    pid = uuid.UUID(partner_id)
    stmt = (
        select(Trip)
        .join(Driver, Trip.driver_id == Driver.user_id)
        .join(User, Driver.user_id == User.id)
        .where(Driver.partner_id == pid)
    )

    if driver_id:
        try:
            did = uuid.UUID(driver_id)
        except ValueError:
            return []
        stmt = stmt.where(Trip.driver_id == did)

    if date_from is not None:
        stmt = stmt.where(Trip.created_at >= date_from)
    if date_to is not None:
        stmt = stmt.where(Trip.created_at <= date_to)

    if status_filter and status_filter != "all":
        if status_filter == "ongoing":
            stmt = stmt.where(Trip.status.in_(_ONGOING_STATUSES))
        elif status_filter == "completed":
            stmt = stmt.where(Trip.status == TripStatus.completed)
        elif status_filter == "cancelled":
            stmt = stmt.where(Trip.status == TripStatus.cancelled)
        elif status_filter == "failed":
            stmt = stmt.where(Trip.status == TripStatus.failed)
        elif status_filter == "assigned":
            stmt = stmt.where(Trip.status == TripStatus.assigned)

    q = (search or "").strip().lower()
    if q:
        clauses = [
            cast(Trip.id, String).ilike(f"%{q}%"),
            cast(Trip.passenger_id, String).ilike(f"%{q}%"),
            User.name.ilike(f"%{q}%"),
        ]
        digits = "".join(c for c in q if c.isdigit())
        if digits:
            clauses.append(User.phone.ilike(f"%{digits}%"))
        stmt = stmt.where(or_(*clauses))

    stmt = stmt.order_by(Trip.created_at.desc())
    return list(db.execute(stmt).unique().scalars().all())
