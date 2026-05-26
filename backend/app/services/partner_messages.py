"""Partner ↔ driver inbox."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.db.models.driver import Driver
from app.db.models.partner_message import (
    MESSAGE_DIRECTION_TO_DRIVER,
    MESSAGE_DIRECTION_TO_PARTNER,
    DriverMessageRead,
    PartnerMessage,
    PartnerMessageRead,
)
from app.services.partner_queries import get_driver_for_partner


def _utc_iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")


def create_partner_message(
    db: Session,
    *,
    partner_id: uuid.UUID,
    created_by: uuid.UUID,
    title: str,
    body: str,
    priority: str,
    driver_user_id: uuid.UUID | None,
) -> PartnerMessage:
    if driver_user_id is not None:
        d = get_driver_for_partner(db, str(partner_id), driver_user_id)
        if not d:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
    msg = PartnerMessage(
        partner_id=partner_id,
        driver_user_id=driver_user_id,
        direction=MESSAGE_DIRECTION_TO_DRIVER,
        title=title.strip(),
        body=body.strip(),
        priority=priority if priority in ("normal", "high") else "normal",
        created_by=created_by,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def create_driver_message_to_partner(
    db: Session,
    *,
    driver_user_id: uuid.UUID,
    title: str,
    body: str,
    priority: str,
) -> PartnerMessage:
    driver = db.get(Driver, driver_user_id)
    if not driver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
    msg = PartnerMessage(
        partner_id=driver.partner_id,
        driver_user_id=driver_user_id,
        direction=MESSAGE_DIRECTION_TO_PARTNER,
        title=title.strip(),
        body=body.strip(),
        priority=priority if priority in ("normal", "high") else "normal",
        created_by=driver_user_id,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def list_partner_sent_messages(db: Session, *, partner_id: uuid.UUID) -> list[PartnerMessage]:
    return list(
        db.scalars(
            select(PartnerMessage)
            .where(
                PartnerMessage.partner_id == partner_id,
                PartnerMessage.direction == MESSAGE_DIRECTION_TO_DRIVER,
            )
            .order_by(PartnerMessage.created_at.desc())
            .limit(100)
        ).all()
    )


def list_partner_inbox_from_drivers(
    db: Session, *, partner_id: uuid.UUID, partner_user_id: uuid.UUID
) -> list[tuple[PartnerMessage, bool]]:
    msgs = db.scalars(
        select(PartnerMessage)
        .where(
            PartnerMessage.partner_id == partner_id,
            PartnerMessage.direction == MESSAGE_DIRECTION_TO_PARTNER,
        )
        .order_by(PartnerMessage.created_at.desc())
        .limit(100)
    ).all()
    read_ids = set(
        db.scalars(
            select(PartnerMessageRead.message_id).where(
                PartnerMessageRead.partner_user_id == partner_user_id
            )
        ).all()
    )
    return [(m, m.id in read_ids) for m in msgs]


def list_driver_messages(
    db: Session, *, driver_user_id: uuid.UUID
) -> list[tuple[PartnerMessage, bool]]:
    driver = db.get(Driver, driver_user_id)
    if not driver:
        return []
    pid = driver.partner_id
    msgs = db.scalars(
        select(PartnerMessage)
        .where(
            PartnerMessage.partner_id == pid,
            PartnerMessage.direction == MESSAGE_DIRECTION_TO_DRIVER,
            or_(
                PartnerMessage.driver_user_id.is_(None),
                PartnerMessage.driver_user_id == driver_user_id,
            ),
        )
        .order_by(PartnerMessage.created_at.desc())
        .limit(100)
    ).all()
    read_ids = set(
        db.scalars(
            select(DriverMessageRead.message_id).where(
                DriverMessageRead.driver_user_id == driver_user_id
            )
        ).all()
    )
    return [(m, m.id in read_ids) for m in msgs]


def list_driver_sent_messages(db: Session, *, driver_user_id: uuid.UUID) -> list[PartnerMessage]:
    driver = db.get(Driver, driver_user_id)
    if not driver:
        return []
    return list(
        db.scalars(
            select(PartnerMessage)
            .where(
                PartnerMessage.partner_id == driver.partner_id,
                PartnerMessage.direction == MESSAGE_DIRECTION_TO_PARTNER,
                PartnerMessage.driver_user_id == driver_user_id,
            )
            .order_by(PartnerMessage.created_at.desc())
            .limit(100)
        ).all()
    )


def mark_driver_message_read(
    db: Session, *, driver_user_id: uuid.UUID, message_id: uuid.UUID
) -> None:
    msg = db.get(PartnerMessage, message_id)
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
    if msg.direction != MESSAGE_DIRECTION_TO_DRIVER:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
    driver = db.get(Driver, driver_user_id)
    if not driver or driver.partner_id != msg.partner_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
    if msg.driver_user_id not in (None, driver_user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
    existing = db.get(DriverMessageRead, {"message_id": message_id, "driver_user_id": driver_user_id})
    if existing:
        return
    db.add(DriverMessageRead(message_id=message_id, driver_user_id=driver_user_id))
    db.commit()


def mark_partner_message_read(
    db: Session, *, partner_id: uuid.UUID, partner_user_id: uuid.UUID, message_id: uuid.UUID
) -> None:
    msg = db.get(PartnerMessage, message_id)
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
    if msg.direction != MESSAGE_DIRECTION_TO_PARTNER or msg.partner_id != partner_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
    existing = db.get(
        PartnerMessageRead, {"message_id": message_id, "partner_user_id": partner_user_id}
    )
    if existing:
        return
    db.add(PartnerMessageRead(message_id=message_id, partner_user_id=partner_user_id))
    db.commit()
