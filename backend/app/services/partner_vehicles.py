"""PARTNER-FLEET-2A/2C — Partner vehicle CRUD + 0/1 assign (tenant-scoped).

Matching continues to use ``drivers.vehicle_categories``;
``service_categories`` is fleet metadata only (same codes/CSV as Driver).
"""

from __future__ import annotations

import re
import uuid
from collections.abc import Iterable
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.db.models.driver import Driver
from app.db.models.user import User
from app.db.models.vehicle import Vehicle
from app.schemas.partner import (
    PartnerVehicleCompliance,
    PartnerVehicleCreateRequest,
    PartnerVehicleDocumentSummary,
    PartnerVehicleItem,
    PartnerVehiclePatchRequest,
)
from app.services.driver_preferences import (
    VALID_DRIVER_CATEGORIES,
    decode_driver_categories_csv,
    encode_driver_categories_csv,
)
from app.services.partner_vehicle_documents import (
    batch_document_summaries_for_vehicles,
    document_summary_for_vehicle,
)
from app.services.vehicle_document_compliance import vehicle_compliance_status

_ALLOWED_STATUS = frozenset({"active", "inactive"})
_PLATE_STRIP_RE = re.compile(r"[\s\-]+")


def normalize_plate(plate: str) -> str:
    """Uppercase; strip whitespace/hyphens for global uniqueness."""
    return _PLATE_STRIP_RE.sub("", plate.strip().upper())


def require_vehicle_service_categories_csv(values: Iterable[str] | None) -> str:
    """Validate against Driver category vocabulary; return CSV for persistence."""
    if values is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="service_categories_required",
        )
    items = list(values)
    if not items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="service_categories_required",
        )
    mapped: list[str] = []
    for raw in items:
        v = str(raw).strip().lower()
        if not v:
            continue
        if v == "standard":
            v = "x"
        if v not in VALID_DRIVER_CATEGORIES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="invalid_service_category",
            )
        mapped.append(v)
    if not mapped:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="service_categories_required",
        )
    return encode_driver_categories_csv(mapped)


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


def vehicle_compliance_for_summary(
    summary: PartnerVehicleDocumentSummary | None,
) -> PartnerVehicleCompliance:
    """PF3D-2 — docs-only compliance for a vehicle item (never no_active_vehicle)."""
    result = vehicle_compliance_status(summary, has_active_vehicle=True)
    return PartnerVehicleCompliance(
        compliance_status=result.compliance_status,
        blocking_reasons=list(result.blocking_reasons),
        warning_reasons=list(result.warning_reasons),
        worst_status=result.worst_status,
    )


def vehicle_to_item(
    db: Session,
    vehicle: Vehicle,
    *,
    document_summary: PartnerVehicleDocumentSummary | None = None,
) -> PartnerVehicleItem:
    assigned = _assigned_driver_row(db, vehicle_id=vehicle.id)
    driver_id = None
    driver_name = None
    if assigned is not None:
        d, u = assigned
        driver_id = str(d.user_id)
        driver_name = u.name if u else None
    summary = document_summary
    if summary is None:
        summary = document_summary_for_vehicle(
            db,
            partner_id=vehicle.partner_id,
            vehicle_id=vehicle.id,
        )
    return PartnerVehicleItem(
        id=str(vehicle.id),
        partner_id=str(vehicle.partner_id),
        plate=vehicle.plate,
        plate_normalized=vehicle.plate_normalized,
        make=vehicle.make,
        model=vehicle.model,
        year=vehicle.year,
        color=vehicle.color,
        service_categories=decode_driver_categories_csv(vehicle.service_categories),
        status=vehicle.status,
        created_at=_utc_iso(vehicle.created_at),
        updated_at=_utc_iso(vehicle.updated_at),
        assigned_driver_id=driver_id,
        assigned_driver_name=driver_name,
        document_summary=summary,
        vehicle_compliance=vehicle_compliance_for_summary(summary),
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
    summaries = batch_document_summaries_for_vehicles(
        db,
        partner_id=pid,
        vehicle_ids=[v.id for v in vehicles],
    )
    return [
        vehicle_to_item(db, v, document_summary=summaries[v.id]) for v in vehicles
    ]


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
    cats_csv = require_vehicle_service_categories_csv(body.service_categories)

    vehicle = Vehicle(
        id=uuid.uuid4(),
        partner_id=pid,
        plate=plate,
        plate_normalized=plate_norm,
        make=body.make.strip(),
        model=body.model.strip(),
        year=body.year,
        color=body.color.strip() if body.color else None,
        service_categories=cats_csv,
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
    if "service_categories" in data and data["service_categories"] is not None:
        vehicle.service_categories = require_vehicle_service_categories_csv(
            data["service_categories"]
        )
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
            .with_for_update(of=Driver)
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

    if driver.active_vehicle_id is not None and driver.active_vehicle_id != vehicle.id:
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
