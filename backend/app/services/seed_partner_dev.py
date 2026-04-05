"""DEV-only seed: one partner, two drivers, one partner fleet admin."""

from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.db.models.driver import Driver, DriverLocation
from app.db.models.partner import Partner
from app.db.models.user import User
from app.models.enums import DriverStatus, Role, UserStatus


def run_partner_pilot_seed(db: Session) -> dict[str, object]:
    """Idempotent-ish: always inserts new rows with unique phones."""
    pid = uuid.uuid4()
    db.add(Partner(id=pid, name="Pilot demo fleet"))
    db.flush()

    phones = {
        "d1": f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        "d2": f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        "mgr": f"+3519{uuid.uuid4().int % 10_000_000:07d}",
    }

    u1 = User(
        role=Role.driver,
        name="Pilot Driver 1",
        phone=phones["d1"],
        status=UserStatus.active,
    )
    u2 = User(
        role=Role.driver,
        name="Pilot Driver 2",
        phone=phones["d2"],
        status=UserStatus.active,
    )
    mgr = User(
        role=Role.partner,
        name="Pilot Fleet Admin",
        phone=phones["mgr"],
        status=UserStatus.active,
        partner_org_id=pid,
    )
    db.add_all([u1, u2, mgr])
    db.flush()

    for u in (u1, u2):
        db.add(
            Driver(
                user_id=u.id,
                partner_id=pid,
                status=DriverStatus.approved,
                commission_percent=15.0,
                is_available=True,
            )
        )
        db.add(
            DriverLocation(
                driver_id=u.id,
                lat=38.72,
                lng=-9.14,
            )
        )
    db.commit()

    return {
        "partner_id": str(pid),
        "driver_user_ids": [str(u1.id), str(u2.id)],
        "partner_admin_user_id": str(mgr.id),
        "phones": phones,
    }
