"""PARTNER-FLEET-2A — Partner vehicle CRUD + 0/1 assign (tenant-scoped).

Matching continues to use ``drivers.vehicle_categories``; ``service_category`` is metadata only.
"""

from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.db.models.driver import Driver
from app.db.models.user import User
from app.db.models.vehicle import Vehicle
from app.schemas.partner import (
    PartnerVehicleCreateRequest,
    PartnerVehicleItem,
    PartnerVehiclePatchRequest,
)

_ALLOWED_STATUS = frozenset({"active", "inactive"})
_PLATE_STRIP_RE = re.compile(r"[\s\-]+")


def normalize_plate(plate: str) -> str:
    """Uppercase; strip whitespace/hyphens for global uniqueness."""
    return _PLATE_STRIP_RE.sub("", plate.strip().upper())


def _utc_iso(dt: datetime | None) -> str:
    if dt is None:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")


def _validate_status(value: str) -> str:
    s = value.strip().lower()
    if s not in _ALLOWED_STATUS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_vehicle_status",
        )
    return s


def _assigned_driver_row(
    db: Session, *, vehicle_id: uuid.UUID
) -> tuple[Driver, User | None] | None:
    row = db.execute(
        select(Driver, User)
        .outerjoin(User, User.id == Driver.user_id)
        .where(Driver.active_vehicle_id == vehicle_id)
    ).first()
    if row is None:
        return None
    return row[0], row[1]


def vehicle_to_item(db: Session, vehicle: Vehicle) -> PartnerVehicleItem:
    assigned = _assigned_driver_row(db, vehicle_id=vehicle.id)
    driver_id = None
    driver_name = None
    if assigned is not None:
        d, u = assigned
        driver_id = str(d.user_id)
        driver_name = u.name if u else None
    return PartnerVehicleItem(
        id=str(vehicle.id),
        partner_id=str(vehicle.partner_id),
        plate=vehicle.plate,
        plate_normalized=vehicle.plate_normalized,
        make=vehicle.make,
        model=vehicle.model,
        year=vehicle.year,
        color=vehicle.color,
        service_category=vehicle.service_category,
        status=vehicle.status,
        created_at=_utc_iso(vehicle.created_at),
        updated_at=_utc_iso(vehicle.updated_at),
        assigned_driver_id=driver_id,
        assigned_driver_name=driver_name,
    )


def get_vehicle_for_partner(
    db: Session, partner_id: str, vehicle_id: uuid.UUID
) -> Vehicle | None:
    pid = uuid.UUID(partner_id)
    return db.execute(
        select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.partner_id == pid)
    ).scalar_one_or_none()


def list_vehicles_for_partner(db: Session, partner_id: str) -> list[PartnerVehicleItem]:
    pid = uuid.UUID(partner_id)
    vehicles = list(
        db.execute(
            select(Vehicle)
            .where(Vehicle.partner_id == pid)
            .order_by(Vehicle.created_at.asc())
        )
        .scalars()
        .all()
    )
    return [vehicle_to_item(db, v) for v in vehicles]


def create_vehicle_for_partner(
    db: Session,
    *,
    partner_id: str,
    body: PartnerVehicleCreateRequest,
) -> PartnerVehicleItem:
    pid = uuid.UUID(partner_id)
    plate = body.plate.strip()
    if not plate:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_plate"
        )
    plate_norm = normalize_plate(plate)
    if not plate_norm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_plate"
        )
    existing = db.execute(
        select(Vehicle).where(Vehicle.plate_normalized == plate_norm)
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="plate_already_exists"
        )

    status_val = _validate_status(body.status or "active")
    service_cat = (body.service_category or "x").strip() or "x"

    vehicle = Vehicle(
        id=uuid.uuid4(),
        partner_id=pid,
        plate=plate,
        plate_normalized=plate_norm,
        make=body.make.strip(),
        model=body.model.strip(),
        year=body.year,
        color=body.color.strip() if body.color else None,
        service_category=service_cat[:24],
        status=status_val,
    )
    db.add(vehicle)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="plate_already_exists"
        ) from None
    db.refresh(vehicle)
    return vehicle_to_item(db, vehicle)


def patch_vehicle_for_partner(
    db: Session,
    *,
    partner_id: str,
    vehicle_id: uuid.UUID,
    body: PartnerVehiclePatchRequest,
) -> PartnerVehicleItem:
    vehicle = get_vehicle_for_partner(db, partner_id, vehicle_id)
    if vehicle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")

    data = body.model_dump(exclude_unset=True)
    if "plate" in data and data["plate"] is not None:
        plate = data["plate"].strip()
        if not plate:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_plate"
            )
        plate_norm = normalize_plate(plate)
        if not plate_norm:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_plate"
            )
        if plate_norm != vehicle.plate_normalized:
            clash = db.execute(
                select(Vehicle).where(
                    Vehicle.plate_normalized == plate_norm,
                    Vehicle.id != vehicle.id,
                )
            ).scalar_one_or_none()
            if clash is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="plate_already_exists",
                )
        vehicle.plate = plate
        vehicle.plate_normalized = plate_norm

    if "make" in data and data["make"] is not None:
        vehicle.make = data["make"].strip()
    if "model" in data and data["model"] is not None:
        vehicle.model = data["model"].strip()
    if "year" in data:
        vehicle.year = data["year"]
    if "color" in data:
        color = data["color"]
        vehicle.color = color.strip() if isinstance(color, str) and color else color
    if "service_category" in data and data["service_category"] is not None:
        sc = data["service_category"].strip() or "x"
        vehicle.service_category = sc[:24]
    if "status" in data and data["status"] is not None:
        vehicle.status = _validate_status(data["status"])

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="plate_already_exists"
        ) from None
    db.refresh(vehicle)
    return vehicle_to_item(db, vehicle)


def assign_vehicle_to_driver(
    db: Session,
    *,
    partner_id: str,
    vehicle_id: uuid.UUID,
    driver_user_id: uuid.UUID,
) -> PartnerVehicleItem:
    pid = uuid.UUID(partner_id)
    vehicle = get_vehicle_for_partner(db, partner_id, vehicle_id)
    if vehicle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")

    driver = (
        db.execute(
            select(Driver)
            .where(Driver.user_id == driver_user_id, Driver.partner_id == pid)
            .options(joinedload(Driver.user))
        )
        .unique()
        .scalar_one_or_none()
    )
    if driver is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")

    current = _assigned_driver_row(db, vehicle_id=vehicle.id)
    if current is not None and current[0].user_id != driver.user_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="vehicle_already_assigned",
        )

    # Driver swap: free previous vehicle for this driver.
    if (
        driver.active_vehicle_id is not None
        and driver.active_vehicle_id != vehicle.id
    ):
        driver.active_vehicle_id = None
        db.flush()

    driver.active_vehicle_id = vehicle.id
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="vehicle_already_assigned",
        ) from None
    db.refresh(vehicle)
    return vehicle_to_item(db, vehicle)


def unassign_vehicle(
    db: Session,
    *,
    partner_id: str,
    vehicle_id: uuid.UUID,
) -> PartnerVehicleItem:
    vehicle = get_vehicle_for_partner(db, partner_id, vehicle_id)
    if vehicle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")

    current = _assigned_driver_row(db, vehicle_id=vehicle.id)
    if current is not None:
        current[0].active_vehicle_id = None
        db.commit()
    db.refresh(vehicle)
    return vehicle_to_item(db, vehicle)
