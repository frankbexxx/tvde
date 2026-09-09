"""NON-WIPE soft sync of PROD DEMO vehicle compliance (G-KYC-P0-04).

PROD roster is intentionally separate from local ``DEMO_VEHICLE_SPECS`` /
baseline (4 drivers). This module targets the real prod demo set of 3 drivers.

Never truncates / wipes. Never overwrites ``file_path``. Soft-repairs expiry/status
on uploaded docs only when the spec allows it.
"""

from __future__ import annotations

import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.partner_constants import BASELINE_PARTNER_FLEET_UUID
from app.db.models.driver import Driver
from app.db.models.partner import Partner
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.models.vehicle import Vehicle
from app.db.models.vehicle_document import VehicleDocument
from app.models.enums import DriverStatus, TripStatus
from app.services.admin_audit import record_admin_action
from app.services.partner_vehicle_documents import (
    VEHICLE_DOCUMENT_REQUIRED_TYPES_ORDERED,
    summarize_vehicle_documents_rows,
)
from app.services.partner_vehicles import normalize_plate
from app.services.seed_demo_vehicle_compliance import (
    DEMO_DOC_EXPIRES_AT,
    DEMO_DOC_VALID_FROM,
    PHONE_DEFAULT_DRIVER,
    PHONE_MANEL,
    PHONE_MARLY,
    PHONE_TEST_DRIVER_B,
    _DUMMY_ISSUER,
    _DUMMY_NOTES,
    _dummy_metadata,
)
from app.services.vehicle_document_compliance import vehicle_compliance_status

CONFIRM_TOKEN = "SYNC_DEMO_VEHICLE_COMPLIANCE"  # nosec B105  # CLI confirm token, not a password
REMOTE_ENV = "ALLOW_REMOTE_DEMO_SYNC"
AUDIT_ACTOR = "system:sync_demo_vehicle_compliance"

# Deterministic Marly PROD-only vehicle (not used by local 4-driver baseline seed).
VEHICLE_PROD_MARLY = uuid.UUID("b0000005-0000-4000-8000-000000000001")
PLATE_PROD_MARLY = "DEMO-TP-02"

# Prefer plate match for existing Francisco-created vehicles (UUID may differ from seed).
VEHICLE_ID_11_AA_22 = uuid.UUID("b0000002-0000-4000-8000-000000000001")
VEHICLE_ID_33_BB_44 = uuid.UUID("b0000003-0000-4000-8000-000000000001")

PROD_DEMO_VEHICLE_SPECS: tuple[dict[str, Any], ...] = (
    {
        "id": VEHICLE_ID_11_AA_22,
        "partner_id": BASELINE_PARTNER_FLEET_UUID,
        "plate": "11-AA-22",
        "driver_phone": PHONE_DEFAULT_DRIVER,  # +351911111111 → test_partner (PROD)
        "preserve_vehicle_identity": True,
        "allow_date_fix_with_file": True,
    },
    {
        "id": VEHICLE_ID_33_BB_44,
        "partner_id": BASELINE_PARTNER_FLEET_UUID,
        "plate": "33-BB-44",
        "driver_phone": PHONE_MANEL,
        "preserve_vehicle_identity": True,
        "allow_date_fix_with_file": True,
    },
    {
        "id": VEHICLE_PROD_MARLY,
        "partner_id": BASELINE_PARTNER_FLEET_UUID,
        "plate": PLATE_PROD_MARLY,
        "make": "Demo",
        "model": "MarlyProd1",
        "driver_phone": PHONE_MARLY,
        "preserve_vehicle_identity": False,
        "allow_date_fix_with_file": False,
    },
)

_ACTIVE_TRIP = (TripStatus.accepted, TripStatus.arriving, TripStatus.ongoing)


class DemoSyncAbort(RuntimeError):
    """Hard stop — unexpected / unsafe state."""


@dataclass
class DriverPlan:
    phone: str
    user_id: str
    partner_id: str
    partner_name: str
    is_test_account: bool
    driver_status: str
    is_available: bool
    active_vehicle_id_before: str | None
    expected_plate: str
    expected_vehicle_id: str
    vehicle_action: str  # create | reuse | conflict
    vehicle_id_resolved: str | None
    docs_before: list[dict[str, Any]] = field(default_factory=list)
    docs_actions: list[str] = field(default_factory=list)
    docs_preserve: list[str] = field(default_factory=list)
    docs_create: list[str] = field(default_factory=list)
    docs_date_fix: list[str] = field(default_factory=list)
    compliance_before: str | None = None
    compliance_after_expected: str = "compliant"
    actions: list[str] = field(default_factory=list)


@dataclass
class SyncPlan:
    ok: bool
    mode: str
    drivers: list[DriverPlan] = field(default_factory=list)
    aborts: list[str] = field(default_factory=list)
    summary: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "ok": self.ok,
            "mode": self.mode,
            "aborts": self.aborts,
            "summary": self.summary,
            "drivers": [asdict(d) for d in self.drivers],
        }


def _prod_phones() -> list[str]:
    return [str(s["driver_phone"]) for s in PROD_DEMO_VEHICLE_SPECS]


def _has_active_trip(db: Session, driver_user_id: uuid.UUID) -> bool:
    row = db.execute(
        select(Trip.id)
        .where(
            Trip.driver_id == driver_user_id,
            Trip.status.in_(list(_ACTIVE_TRIP)),
        )
        .limit(1)
    ).first()
    return row is not None


def _doc_snapshot(vehicle: Vehicle | None) -> list[dict[str, Any]]:
    if vehicle is None:
        return []
    by = {d.document_type: d for d in (vehicle.documents or [])}
    out: list[dict[str, Any]] = []
    for dtype in VEHICLE_DOCUMENT_REQUIRED_TYPES_ORDERED:
        row = by.get(dtype)
        if row is None:
            out.append({"type": dtype, "state": "missing"})
        else:
            out.append(
                {
                    "type": dtype,
                    "status": row.status,
                    "expires_at": row.expires_at.isoformat() if row.expires_at else None,
                    "has_file": bool(row.file_path),
                    "notes": (row.notes or "")[:80],
                }
            )
    return out


def _compliance_of(vehicle: Vehicle | None) -> str | None:
    if vehicle is None:
        return None
    summary = summarize_vehicle_documents_rows(list(vehicle.documents or []))
    return vehicle_compliance_status(summary, has_active_vehicle=True).compliance_status


def _looks_demo_doc(row: VehicleDocument) -> bool:
    notes = (row.notes or "").upper()
    meta = (row.metadata_json or "").lower()
    issuer = (row.issuer or "").upper()
    if "DEV/TEST DUMMY" in notes or "DEMO" in notes:
        return True
    if "dev_dummy" in meta:
        return True
    if "TVDE DEMO SEED" in issuer or "TVDE DEV SEED" in issuer:
        return True
    if (row.document_number or "").upper().startswith("DEMO-"):
        return True
    return False


def _doc_needs_date_fix(row: VehicleDocument) -> bool:
    """True when status/expiry would block compliance."""
    if row.status != "approved":
        return True
    if row.expires_at is None:
        return True
    return row.expires_at < datetime.now(timezone.utc)


def _plan_doc_actions(
    vehicle: Vehicle | None, *, allow_date_fix_with_file: bool
) -> tuple[list[str], list[str], list[str], list[str], list[str]]:
    """Return (docs_actions, preserve, create, date_fix, aborts)."""
    actions: list[str] = []
    preserve: list[str] = []
    create: list[str] = []
    date_fix: list[str] = []
    aborts: list[str] = []
    if vehicle is None:
        create = list(VEHICLE_DOCUMENT_REQUIRED_TYPES_ORDERED)
        actions = [f"create:{t}" for t in create]
        return actions, preserve, create, date_fix, aborts

    by = {d.document_type: d for d in (vehicle.documents or [])}
    for t in VEHICLE_DOCUMENT_REQUIRED_TYPES_ORDERED:
        row = by.get(t)
        if row is None:
            create.append(t)
            actions.append(f"create:{t}")
            continue
        if row.file_path:
            preserve.append(t)
            if _doc_needs_date_fix(row):
                if allow_date_fix_with_file:
                    date_fix.append(t)
                    actions.append(f"date_fix:{t}")
                else:
                    aborts.append(
                        f"vehicle {vehicle.id} doc {t} has file_path and needs "
                        f"expiry/status fix but allow_date_fix_with_file=false"
                    )
                    actions.append(f"conflict:{t}")
            else:
                actions.append(f"preserve:{t}")
            continue
        # No upload — DEMO repair allowed
        if (
            row.status == "approved"
            and row.expires_at == DEMO_DOC_EXPIRES_AT
            and _looks_demo_doc(row)
        ):
            actions.append(f"ok:{t}")
        else:
            actions.append(f"repair_demo:{t}")
    return actions, preserve, create, date_fix, aborts


def _resolve_vehicle(
    db: Session, spec: dict[str, Any]
) -> tuple[Vehicle | None, str, list[str]]:
    """Return (vehicle_or_none, action, abort_reasons)."""
    aborts: list[str] = []
    vid: uuid.UUID = spec["id"]
    plate: str = spec["plate"]
    plate_norm = normalize_plate(plate)
    expected_partner: uuid.UUID = spec["partner_id"]
    expected_holder = str(spec["driver_phone"])
    preserve_identity = bool(spec.get("preserve_vehicle_identity"))

    by_id = db.get(Vehicle, vid)
    by_plate = db.execute(
        select(Vehicle).where(Vehicle.plate_normalized == plate_norm)
    ).scalar_one_or_none()

    if by_id is not None and by_plate is not None and by_id.id != by_plate.id:
        # Prefer plate for preserved Francisco vehicles
        if preserve_identity:
            vehicle = by_plate
        else:
            aborts.append(
                f"plate {plate} and id {vid} resolve to different vehicles "
                f"({by_plate.id} vs {by_id.id})"
            )
            return None, "conflict", aborts
    else:
        vehicle = by_plate or by_id

    if vehicle is None:
        return None, "create", aborts

    if vehicle.partner_id != expected_partner:
        aborts.append(
            f"vehicle {vehicle.id} plate={vehicle.plate} partner={vehicle.partner_id} "
            f"!= expected {expected_partner}"
        )
        return vehicle, "conflict", aborts

    if normalize_plate(vehicle.plate) != plate_norm:
        aborts.append(
            f"vehicle id {vehicle.id} has plate {vehicle.plate!r}, expected {plate!r}"
        )
        return vehicle, "conflict", aborts

    holders = list(
        db.execute(
            select(Driver)
            .options(selectinload(Driver.user))
            .where(Driver.active_vehicle_id == vehicle.id)
        )
        .scalars()
        .all()
    )
    prod_phones = set(_prod_phones())
    for d in holders:
        u = d.user
        phone = (u.phone if u else None) or ""
        if u is None or not u.is_test_account or phone not in prod_phones:
            aborts.append(
                f"vehicle {vehicle.id} assigned to non-prod-demo driver "
                f"{d.user_id} phone={phone!r} is_test={getattr(u, 'is_test_account', None)}"
            )
            return vehicle, "conflict", aborts
        if phone != expected_holder:
            aborts.append(
                f"vehicle {vehicle.id} held by {phone}, expected holder {expected_holder}"
            )
            return vehicle, "conflict", aborts

    action = "reuse"
    if not preserve_identity:
        if (
            vehicle.plate != plate
            or (vehicle.status or "").lower() != "active"
            or vehicle.make != spec.get("make")
            or vehicle.model != spec.get("model")
        ):
            action = "update"
    elif (vehicle.status or "").lower() != "active":
        action = "update"
    return vehicle, action, aborts


def build_demo_vehicle_compliance_sync_plan(db: Session) -> SyncPlan:
    plan = SyncPlan(ok=True, mode="plan")
    partners = {p.id: p for p in db.execute(select(Partner)).scalars().all()}

    for spec in PROD_DEMO_VEHICLE_SPECS:
        phone = str(spec["driver_phone"])
        expected_partner: uuid.UUID = spec["partner_id"]
        user = db.execute(select(User).where(User.phone == phone)).scalar_one_or_none()
        if user is None:
            plan.aborts.append(f"missing User for demo phone {phone}")
            plan.ok = False
            continue
        if not user.is_test_account:
            plan.aborts.append(
                f"User {phone} is_test_account=false — refusing (non-test)"
            )
            plan.ok = False
            continue
        driver = db.execute(
            select(Driver).where(Driver.user_id == user.id)
        ).scalar_one_or_none()
        if driver is None:
            plan.aborts.append(f"missing Driver for demo phone {phone}")
            plan.ok = False
            continue
        if driver.partner_id != expected_partner:
            plan.aborts.append(
                f"Driver {phone} partner={driver.partner_id} != expected {expected_partner}"
            )
            plan.ok = False
            continue
        if _has_active_trip(db, driver.user_id):
            plan.aborts.append(f"Driver {phone} has active trip — abort")
            plan.ok = False
            continue

        partner = partners.get(driver.partner_id)
        vehicle, v_action, v_aborts = _resolve_vehicle(db, spec)
        if v_aborts:
            plan.aborts.extend(v_aborts)
            plan.ok = False

        if vehicle is not None:
            vehicle = db.execute(
                select(Vehicle)
                .options(selectinload(Vehicle.documents))
                .where(Vehicle.id == vehicle.id)
            ).scalar_one()

        docs_actions, preserve, create, date_fix, doc_aborts = _plan_doc_actions(
            vehicle,
            allow_date_fix_with_file=bool(spec.get("allow_date_fix_with_file")),
        )
        if doc_aborts:
            plan.aborts.extend(doc_aborts)
            plan.ok = False

        actions: list[str] = []
        if v_action == "create":
            actions.append(f"create_vehicle:{spec['plate']}")
        elif v_action == "update":
            actions.append(f"update_vehicle:{spec['plate']}")
        elif v_action == "conflict":
            actions.append(f"conflict_vehicle:{spec['plate']}")
        else:
            actions.append(f"reuse_vehicle:{spec['plate']}")
        expected_vid = vehicle.id if vehicle is not None else spec["id"]
        if driver.active_vehicle_id != expected_vid:
            actions.append("assign_active_vehicle")
        if any(
            a.startswith(("create:", "repair_demo:", "date_fix:")) for a in docs_actions
        ):
            actions.append("ensure_docs")

        plan.drivers.append(
            DriverPlan(
                phone=phone,
                user_id=str(user.id),
                partner_id=str(driver.partner_id),
                partner_name=(partner.name if partner else "?"),
                is_test_account=True,
                driver_status=str(driver.status),
                is_available=bool(driver.is_available),
                active_vehicle_id_before=(
                    str(driver.active_vehicle_id) if driver.active_vehicle_id else None
                ),
                expected_plate=str(spec["plate"]),
                expected_vehicle_id=str(spec["id"]),
                vehicle_action=v_action,
                vehicle_id_resolved=str(vehicle.id) if vehicle else None,
                docs_before=_doc_snapshot(vehicle),
                docs_actions=docs_actions,
                docs_preserve=preserve,
                docs_create=create,
                docs_date_fix=date_fix,
                compliance_before=_compliance_of(vehicle),
                actions=actions,
            )
        )

    plan.summary = {
        "roster": "prod_demo",
        "demo_driver_count": len(PROD_DEMO_VEHICLE_SPECS),
        "planned_drivers": len(plan.drivers),
        "abort_count": len(plan.aborts),
        "phones": _prod_phones(),
        "plates": [str(s["plate"]) for s in PROD_DEMO_VEHICLE_SPECS],
        "excluded_phones": [PHONE_TEST_DRIVER_B],
        "excluded_plates": ["DEMO-DF-01", "DEMO-TP-03"],
    }
    if len(plan.drivers) != len(PROD_DEMO_VEHICLE_SPECS):
        plan.ok = False
    return plan


def _ensure_prod_vehicle(db: Session, spec: dict[str, Any]) -> Vehicle:
    """Create or soft-update vehicle. Never changes plate/partner on preserve."""
    vid: uuid.UUID = spec["id"]
    plate: str = spec["plate"]
    plate_norm = normalize_plate(plate)
    preserve = bool(spec.get("preserve_vehicle_identity"))

    by_plate = db.execute(
        select(Vehicle).where(Vehicle.plate_normalized == plate_norm)
    ).scalar_one_or_none()
    by_id = db.get(Vehicle, vid)
    vehicle = by_plate or by_id

    if vehicle is None:
        vehicle = Vehicle(
            id=vid,
            partner_id=spec["partner_id"],
            plate=plate,
            plate_normalized=plate_norm,
            make=spec.get("make") or "Demo",
            model=spec.get("model") or "ProdDemo",
            status="active",
            service_categories="x",
        )
        db.add(vehicle)
        db.flush()
        return vehicle

    if vehicle.partner_id != spec["partner_id"]:
        raise DemoSyncAbort(
            f"refusing partner change on {plate}: {vehicle.partner_id} -> {spec['partner_id']}"
        )
    if (vehicle.status or "").lower() != "active":
        vehicle.status = "active"
    if not preserve:
        vehicle.plate = plate
        vehicle.plate_normalized = plate_norm
        if spec.get("make"):
            vehicle.make = spec["make"]
        if spec.get("model"):
            vehicle.model = spec["model"]
        if not (vehicle.service_categories or "").strip():
            vehicle.service_categories = "x"
    db.flush()
    return vehicle


def _soft_sync_docs(db: Session, *, vehicle: Vehicle, spec: dict[str, Any]) -> list[str]:
    allow_date = bool(spec.get("allow_date_fix_with_file"))
    existing = {
        row.document_type: row
        for row in db.execute(
            select(VehicleDocument).where(VehicleDocument.vehicle_id == vehicle.id)
        )
        .scalars()
        .all()
    }
    changed: list[str] = []
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
            changed.append(f"create:{doc_type}")
            continue

        if row.file_path:
            # Never touch file_path / binary. Optional expiry+status only.
            if not _doc_needs_date_fix(row):
                continue
            if not allow_date:
                raise DemoSyncAbort(
                    f"cannot date_fix {doc_type} on {vehicle.id} without allow flag"
                )
            old_path = row.file_path
            row.status = "approved"
            if row.expires_at is None or row.expires_at < DEMO_DOC_EXPIRES_AT:
                row.expires_at = DEMO_DOC_EXPIRES_AT
            if row.file_path != old_path:
                raise DemoSyncAbort("file_path mutated unexpectedly")
            changed.append(f"date_fix:{doc_type}")
            continue

        # No upload — full DEMO repair OK
        if (
            row.status == "approved"
            and row.expires_at == DEMO_DOC_EXPIRES_AT
            and _looks_demo_doc(row)
        ):
            continue
        row.status = "approved"
        row.partner_id = vehicle.partner_id
        row.issuer = _DUMMY_ISSUER
        row.notes = _DUMMY_NOTES
        if not row.document_number:
            row.document_number = f"DEMO-{doc_type.upper()}"
        row.valid_from = row.valid_from or DEMO_DOC_VALID_FROM
        row.expires_at = DEMO_DOC_EXPIRES_AT
        row.metadata_json = _dummy_metadata(
            plate=vehicle.plate, document_type=doc_type
        )
        changed.append(f"repair_demo:{doc_type}")
    db.flush()
    return changed


def apply_demo_vehicle_compliance_sync(db: Session) -> SyncPlan:
    """Apply soft non-wipe PROD demo sync. Raises DemoSyncAbort on conflict."""
    plan = build_demo_vehicle_compliance_sync_plan(db)
    if not plan.ok:
        raise DemoSyncAbort("; ".join(plan.aborts) or "demo sync plan not ok")

    phone_to_user_id: dict[str, uuid.UUID] = {}
    for spec in PROD_DEMO_VEHICLE_SPECS:
        phone = str(spec["driver_phone"])
        user = db.execute(select(User).where(User.phone == phone)).scalar_one()
        if not user.is_test_account:
            raise DemoSyncAbort(f"non-test user {phone}")
        phone_to_user_id[phone] = user.id

    for phone, uid in phone_to_user_id.items():
        if _has_active_trip(db, uid):
            raise DemoSyncAbort(f"Driver {phone} has active trip")

    applied_actions: list[str] = []
    for spec in PROD_DEMO_VEHICLE_SPECS:
        vehicle, _action, aborts = _resolve_vehicle(db, spec)
        if aborts:
            raise DemoSyncAbort("; ".join(aborts))
        vehicle = _ensure_prod_vehicle(db, spec)
        doc_changes = _soft_sync_docs(db, vehicle=vehicle, spec=spec)
        phone = str(spec["driver_phone"])
        driver = db.execute(
            select(Driver).where(Driver.user_id == phone_to_user_id[phone])
        ).scalar_one()
        if driver.partner_id != vehicle.partner_id:
            raise DemoSyncAbort(f"partner mismatch assigning {phone}")
        if driver.status != DriverStatus.approved:
            raise DemoSyncAbort(
                f"Driver {phone} status={driver.status} (expected approved)"
            )
        if driver.active_vehicle_id != vehicle.id:
            driver.active_vehicle_id = vehicle.id
            applied_actions.append(f"assign:{phone}:{vehicle.plate}")
        applied_actions.extend(f"{phone}:{c}" for c in doc_changes)
        applied_actions.append(f"vehicle:{vehicle.plate}:{vehicle.id}")

    record_admin_action(
        db,
        actor_user_id=AUDIT_ACTOR,
        action="sync_demo_vehicle_compliance",
        entity_type="demo_dataset",
        entity_id="vehicle_compliance_prod",
        payload={
            "source": "sync_demo_vehicle_compliance",
            "roster": "prod_demo",
            "driver_count": len(PROD_DEMO_VEHICLE_SPECS),
            "plates": [str(s["plate"]) for s in PROD_DEMO_VEHICLE_SPECS],
            "action_count": len(applied_actions),
        },
    )

    db.flush()
    after = build_demo_vehicle_compliance_sync_plan(db)
    after.mode = "applied"
    after.summary["applied"] = True
    after.summary["action_count"] = len(applied_actions)
    return after
