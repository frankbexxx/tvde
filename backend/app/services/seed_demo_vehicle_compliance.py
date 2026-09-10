"""Baseline DEMO vehicles + compliant dummy documents (G-KYC-P0-04 readiness).

DEV/TEST ONLY — dummy rows, not real legal credentials.
Idempotent by deterministic vehicle UUIDs / plates / document types.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.partner_constants import (
    BASELINE_PARTNER_FLEET_UUID,
    DEFAULT_PARTNER_UUID,
)
from app.db.models.driver import Driver
from app.db.models.vehicle import Vehicle
from app.db.models.vehicle_document import VehicleDocument
from app.services.partner_vehicle_documents import (
    VEHICLE_DOCUMENT_REQUIRED_TYPES_ORDERED,
)
from app.services.partner_vehicles import normalize_plate

# Fixed far-future expiry — deterministic, not ``now + N`` (avoids flaky tests).
DEMO_DOC_EXPIRES_AT = datetime(2099, 6, 30, tzinfo=timezone.utc)
DEMO_DOC_VALID_FROM = datetime(2020, 1, 1, tzinfo=timezone.utc)
_DUMMY_ISSUER = "TVDE DEMO SEED"
_DUMMY_NOTES = "DEV/TEST DUMMY DOCUMENT ONLY — baseline vehicle compliance"

# Deterministic vehicle ids (stable across resets).
VEHICLE_DEFAULT_FLEET_1 = uuid.UUID("b0000001-0000-4000-8000-000000000001")
VEHICLE_TEST_PARTNER_1 = uuid.UUID("b0000002-0000-4000-8000-000000000001")  # 11-AA-22
VEHICLE_TEST_PARTNER_2 = uuid.UUID("b0000003-0000-4000-8000-000000000001")  # 33-BB-44
VEHICLE_TEST_PARTNER_3 = uuid.UUID("b0000004-0000-4000-8000-000000000001")  # DEMO-TP-03

# Driver phones from BASELINE_USERS → vehicle assignment.
# Fourth demo driver phone is also defined in baseline_reset.BASELINE_USERS.
PHONE_DEFAULT_DRIVER = "+351911111111"
PHONE_MARLY = "+351918304615"
PHONE_MANEL = "+351939694569"
PHONE_TEST_DRIVER_B = "+351911111114"

# PET-5C / PET-4: demo vehicles must declare capacity so CI can run with
# ENABLE_VEHICLE_CAPACITY_GATES=true without blocking matching (NULL = block).
DEMO_VEHICLE_MAX_PASSENGERS = 4

DEMO_VEHICLE_SPECS: tuple[dict[str, Any], ...] = (
    {
        "id": VEHICLE_DEFAULT_FLEET_1,
        "partner_id": DEFAULT_PARTNER_UUID,
        "plate": "DEMO-DF-01",
        "make": "Demo",
        "model": "DefaultFleet1",
        "driver_phone": PHONE_DEFAULT_DRIVER,
        "max_passengers": DEMO_VEHICLE_MAX_PASSENGERS,
    },
    {
        "id": VEHICLE_TEST_PARTNER_1,
        "partner_id": BASELINE_PARTNER_FLEET_UUID,
        "plate": "11-AA-22",
        "make": "Demo",
        "model": "TestPartner1",
        "driver_phone": PHONE_MARLY,
        "max_passengers": DEMO_VEHICLE_MAX_PASSENGERS,
    },
    {
        "id": VEHICLE_TEST_PARTNER_2,
        "partner_id": BASELINE_PARTNER_FLEET_UUID,
        "plate": "33-BB-44",
        "make": "Demo",
        "model": "TestPartner2",
        "driver_phone": PHONE_MANEL,
        "max_passengers": DEMO_VEHICLE_MAX_PASSENGERS,
    },
    {
        "id": VEHICLE_TEST_PARTNER_3,
        "partner_id": BASELINE_PARTNER_FLEET_UUID,
        "plate": "DEMO-TP-03",
        "make": "Demo",
        "model": "TestPartner3",
        "driver_phone": PHONE_TEST_DRIVER_B,
        "max_passengers": DEMO_VEHICLE_MAX_PASSENGERS,
    },
)

# Fixed id for /dev/seed E2E driver (partner fleet) — distinct from baseline DEFAULT fleet vehicle.
VEHICLE_E2E_SEED_DRIVER = uuid.UUID("b0000005-0000-4000-8000-000000000001")


def _dummy_metadata(*, plate: str, document_type: str) -> str:
    return json.dumps(
        {
            "dev_dummy": True,
            "source": "seed_demo_vehicle_compliance",
            "plate": plate,
            "document_type": document_type,
            "warning": "DEV/TEST DUMMY DOCUMENTS ONLY",
        },
        separators=(",", ":"),
    )


def _ensure_vehicle(db: Session, spec: dict[str, Any]) -> Vehicle:
    vid: uuid.UUID = spec["id"]
    plate: str = spec["plate"]
    plate_norm = normalize_plate(plate)
    max_pax = int(spec.get("max_passengers") or DEMO_VEHICLE_MAX_PASSENGERS)
    vehicle = db.get(Vehicle, vid)
    if vehicle is None:
        # Prefer stable id; if plate already exists under another id, reuse that row.
        by_plate = db.execute(
            select(Vehicle).where(Vehicle.plate_normalized == plate_norm)
        ).scalar_one_or_none()
        if by_plate is not None:
            vehicle = by_plate
        else:
            vehicle = Vehicle(
                id=vid,
                partner_id=spec["partner_id"],
                plate=plate,
                plate_normalized=plate_norm,
                make=spec["make"],
                model=spec["model"],
                status="active",
                service_categories="x",
                max_passengers=max_pax,
            )
            db.add(vehicle)
            db.flush()
            return vehicle

    vehicle.partner_id = spec["partner_id"]
    vehicle.plate = plate
    vehicle.plate_normalized = plate_norm
    vehicle.make = spec["make"]
    vehicle.model = spec["model"]
    vehicle.status = "active"
    vehicle.max_passengers = max_pax
    if not (vehicle.service_categories or "").strip():
        vehicle.service_categories = "x"
    db.flush()
    return vehicle


def _ensure_compliant_docs(db: Session, *, vehicle: Vehicle) -> None:
    existing = {
        row.document_type: row
        for row in db.execute(
            select(VehicleDocument).where(VehicleDocument.vehicle_id == vehicle.id)
        )
        .scalars()
        .all()
    }
    for doc_type in VEHICLE_DOCUMENT_REQUIRED_TYPES_ORDERED:
        row = existing.get(doc_type)
        if row is None:
            db.add(
                VehicleDocument(
                    vehicle_id=vehicle.id,
                    partner_id=vehicle.partner_id,
                    document_type=doc_type,
                    status="approved",
                    issuer=_DUMMY_ISSUER,
                    notes=_DUMMY_NOTES,
                    document_number=f"DEMO-{doc_type.upper()}",
                    valid_from=DEMO_DOC_VALID_FROM,
                    expires_at=DEMO_DOC_EXPIRES_AT,
                    metadata_json=_dummy_metadata(
                        plate=vehicle.plate, document_type=doc_type
                    ),
                )
            )
            continue
        # Repair demo docs only (never invent real credentials).
        row.status = "approved"
        row.partner_id = vehicle.partner_id
        row.issuer = row.issuer or _DUMMY_ISSUER
        row.notes = _DUMMY_NOTES
        if not row.document_number:
            row.document_number = f"DEMO-{doc_type.upper()}"
        row.valid_from = row.valid_from or DEMO_DOC_VALID_FROM
        row.expires_at = DEMO_DOC_EXPIRES_AT
        row.metadata_json = _dummy_metadata(
            plate=vehicle.plate, document_type=doc_type
        )
    db.flush()


def _assign_driver(
    db: Session,
    *,
    phone_to_driver: dict[str, Driver],
    phone: str,
    vehicle: Vehicle,
) -> None:
    driver = phone_to_driver.get(phone)
    if driver is None:
        return
    if driver.partner_id != vehicle.partner_id:
        raise RuntimeError(
            f"demo vehicle/partner mismatch for {phone}: "
            f"driver.partner={driver.partner_id} vehicle.partner={vehicle.partner_id}"
        )
    driver.active_vehicle_id = vehicle.id


def ensure_baseline_demo_vehicle_compliance(
    db: Session,
    *,
    phone_to_user_id: dict[str, uuid.UUID],
) -> dict[str, Any]:
    """Ensure 1 active compliant DEMO vehicle per baseline smoke driver.

    Safe to call repeatedly. Does not create Users/Partners — only Vehicles,
    VehicleDocuments, and ``Driver.active_vehicle_id`` assignments.
    """
    drivers = list(
        db.execute(
            select(Driver).where(Driver.user_id.in_(list(phone_to_user_id.values())))
        )
        .scalars()
        .all()
    )
    uid_to_phone = {uid: phone for phone, uid in phone_to_user_id.items()}
    phone_to_driver = {
        uid_to_phone[d.user_id]: d
        for d in drivers
        if d.user_id in uid_to_phone
    }

    assigned: list[dict[str, str]] = []
    for spec in DEMO_VEHICLE_SPECS:
        vehicle = _ensure_vehicle(db, spec)
        _ensure_compliant_docs(db, vehicle=vehicle)
        phone = str(spec["driver_phone"])
        _assign_driver(
            db, phone_to_driver=phone_to_driver, phone=phone, vehicle=vehicle
        )
        assigned.append(
            {
                "phone": phone,
                "vehicle_id": str(vehicle.id),
                "plate": vehicle.plate,
                "partner_id": str(vehicle.partner_id),
                "max_passengers": str(vehicle.max_passengers or ""),
            }
        )

    db.flush()
    return {
        "demo_vehicles": assigned,
        "count": len(assigned),
    }


def ensure_e2e_seed_driver_vehicle(db: Session, driver: Driver) -> Vehicle:
    """Assign a capacity-ready DEMO vehicle to the /dev/seed E2E driver.

    ``/dev/seed`` places ``+351911111111`` on the baseline partner fleet (for
    Partner panel E2E). That differs from baseline_reset DEFAULT-fleet assignment,
    so we ensure a dedicated vehicle on the driver's current ``partner_id``.
    """
    spec = {
        "id": VEHICLE_E2E_SEED_DRIVER,
        "partner_id": driver.partner_id,
        "plate": "DEMO-E2E-01",
        "make": "Demo",
        "model": "E2ESeed",
        "max_passengers": DEMO_VEHICLE_MAX_PASSENGERS,
    }
    vehicle = _ensure_vehicle(db, spec)
    _ensure_compliant_docs(db, vehicle=vehicle)
    if driver.partner_id != vehicle.partner_id:
        raise RuntimeError(
            f"e2e seed vehicle/partner mismatch: "
            f"driver.partner={driver.partner_id} vehicle.partner={vehicle.partner_id}"
        )
    driver.active_vehicle_id = vehicle.id
    db.flush()
    return vehicle
