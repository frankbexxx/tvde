"""Tenant-scoped reads for partner role (isolation in SQL, not reused passenger/driver list APIs)."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db.models.driver import Driver
from app.db.models.trip import Trip


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
