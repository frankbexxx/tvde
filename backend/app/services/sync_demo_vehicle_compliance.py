"""NON-WIPE sync of baseline DEMO vehicle compliance (G-KYC-P0-04).

Updates only known demo Drivers (by E.164 phone) with ``is_test_account=true``.
Never truncates / wipes. Safe for controlled prod demo alignment after dry-run review.
"""

from __future__ import annotations

import uuid
from dataclasses import asdict, dataclass, field
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db.models.driver import Driver
from app.db.models.partner import Partner
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.models.vehicle import Vehicle
from app.db.models.vehicle_document import VehicleDocument
from app.models.enums import DriverStatus, TripStatus
from app.services.partner_vehicle_documents import (
    VEHICLE_DOCUMENT_REQUIRED_TYPES_ORDERED,
    summarize_vehicle_documents_rows,
)
from app.services.partner_vehicles import normalize_plate
from app.services.admin_audit import record_admin_action
from app.services.seed_demo_vehicle_compliance import (
    DEMO_DOC_EXPIRES_AT,
    DEMO_DOC_VALID_FROM,
    DEMO_VEHICLE_SPECS,
    _DUMMY_ISSUER,
    _DUMMY_NOTES,
    _dummy_metadata,
    _ensure_vehicle,
)
from app.services.vehicle_document_compliance import vehicle_compliance_status

CONFIRM_TOKEN = "SYNC_DEMO_VEHICLE_COMPLIANCE"
REMOTE_ENV = "ALLOW_REMOTE_DEMO_SYNC"
AUDIT_ACTOR = "system:sync_demo_vehicle_compliance"

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
    vehicle_action: str  # create | reuse | update
    vehicle_id_resolved: str | None
    docs_before: list[dict[str, Any]] = field(default_factory=list)
    docs_actions: list[str] = field(default_factory=list)
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


def _demo_phones() -> list[str]:
    return [str(s["driver_phone"]) for s in DEMO_VEHICLE_SPECS]


def _has_active_trip(db: Session, driver_user_id: uuid.UUID) -> bool:
    row = db.execute(
        select(Trip.id).where(
            Trip.driver_id == driver_user_id,
            Trip.status.in_(list(_ACTIVE_TRIP)),
        ).limit(1)
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
    if '"dev_dummy":true' in meta.replace(" ", "") or "dev_dummy" in meta:
        return True
    if "TVDE DEMO SEED" in issuer or "TVDE DEV SEED" in issuer:
        return True
    if (row.document_number or "").upper().startswith("DEMO-"):
        return True
    return False


def _safe_to_overwrite_doc(row: VehicleDocument) -> bool:
    """Refuse overwrite when an uploaded file looks non-demo (doc number alone is weak)."""
    if not row.file_path:
        return True
    notes = (row.notes or "").upper()
    meta = (row.metadata_json or "").lower()
    issuer = (row.issuer or "").upper()
    if "DEV/TEST DUMMY" in notes or "DEMO" in notes:
        return True
    if "dev_dummy" in meta:
        return True
    if "TVDE DEMO SEED" in issuer or "TVDE DEV SEED" in issuer:
        return True
    return False


def _resolve_vehicle(
    db: Session, spec: dict[str, Any]
) -> tuple[Vehicle | None, str, list[str]]:
    """Return (vehicle_or_none, action, abort_reasons)."""
    aborts: list[str] = []
    vid: uuid.UUID = spec["id"]
    plate: str = spec["plate"]
    plate_norm = normalize_plate(plate)
    expected_partner: uuid.UUID = spec["partner_id"]

    by_id = db.get(Vehicle, vid)
    by_plate = db.execute(
        select(Vehicle).where(Vehicle.plate_normalized == plate_norm)
    ).scalar_one_or_none()

    if by_id is not None and by_plate is not None and by_id.id != by_plate.id:
        aborts.append(
            f"plate {plate} and id {vid} resolve to different vehicles "
            f"({by_plate.id} vs {by_id.id})"
        )
        return None, "conflict", aborts

    vehicle = by_id or by_plate
    if vehicle is None:
        return None, "create", aborts

    if vehicle.partner_id != expected_partner:
        aborts.append(
            f"vehicle {vehicle.id} plate={vehicle.plate} partner={vehicle.partner_id} "
            f"!= expected {expected_partner}"
        )
        return vehicle, "conflict", aborts

    if normalize_plate(vehicle.plate) != plate_norm and by_id is not None:
        aborts.append(
            f"vehicle id {vid} has plate {vehicle.plate!r}, expected {plate!r}"
        )
        return vehicle, "conflict", aborts

    # Assigned to a non-demo / non-test driver?
    holders = list(
        db.execute(
            select(Driver)
            .options(selectinload(Driver.user))
            .where(Driver.active_vehicle_id == vehicle.id)
        )
        .scalars()
        .all()
    )
    demo_phones = set(_demo_phones())
    for d in holders:
        u = d.user
        phone = (u.phone if u else None) or ""
        if u is None or not u.is_test_account or phone not in demo_phones:
            aborts.append(
                f"vehicle {vehicle.id} assigned to non-demo driver "
                f"{d.user_id} phone={phone!r} is_test={getattr(u, 'is_test_account', None)}"
            )
            return vehicle, "conflict", aborts

    # Existing docs that look non-demo with uploads → refuse silent overwrite
    docs = list(
        db.execute(
            select(VehicleDocument).where(VehicleDocument.vehicle_id == vehicle.id)
        )
        .scalars()
        .all()
    )
    for row in docs:
        if not _safe_to_overwrite_doc(row):
            aborts.append(
                f"vehicle {vehicle.id} has non-demo document {row.document_type} "
                f"with file_path; refusing overwrite"
            )
            return vehicle, "conflict", aborts

    action = "reuse"
    if (
        vehicle.plate != plate
        or (vehicle.status or "").lower() != "active"
        or vehicle.make != spec["make"]
        or vehicle.model != spec["model"]
    ):
        action = "update"
    return vehicle, action, aborts


def build_demo_vehicle_compliance_sync_plan(db: Session) -> SyncPlan:
    plan = SyncPlan(ok=True, mode="plan")
    partners = {
        p.id: p for p in db.execute(select(Partner)).scalars().all()
    }

    for spec in DEMO_VEHICLE_SPECS:
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

        # Load docs for before snapshot
        if vehicle is not None:
            vehicle = db.execute(
                select(Vehicle)
                .options(selectinload(Vehicle.documents))
                .where(Vehicle.id == vehicle.id)
            ).scalar_one()

        docs_before = _doc_snapshot(vehicle)
        docs_actions: list[str] = []
        if vehicle is None:
            docs_actions = [f"create:{t}" for t in VEHICLE_DOCUMENT_REQUIRED_TYPES_ORDERED]
        else:
            by = {d.document_type: d for d in (vehicle.documents or [])}
            for t in VEHICLE_DOCUMENT_REQUIRED_TYPES_ORDERED:
                row = by.get(t)
                if row is None:
                    docs_actions.append(f"create:{t}")
                elif (
                    row.status != "approved"
                    or row.expires_at != DEMO_DOC_EXPIRES_AT
                    or not _looks_demo_doc(row)
                ):
                    docs_actions.append(f"repair:{t}")
                else:
                    docs_actions.append(f"ok:{t}")

        actions: list[str] = []
        if v_action == "create":
            actions.append(f"create_vehicle:{spec['plate']}")
        elif v_action == "update":
            actions.append(f"update_vehicle:{spec['plate']}")
        else:
            actions.append(f"reuse_vehicle:{spec['plate']}")
        if driver.active_vehicle_id != (vehicle.id if vehicle else spec["id"]):
            actions.append("assign_active_vehicle")
        if any(a.startswith(("create:", "repair:")) for a in docs_actions):
            actions.append("ensure_docs")

        dp = DriverPlan(
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
            docs_before=docs_before,
            docs_actions=docs_actions,
            compliance_before=_compliance_of(vehicle),
            actions=actions,
        )
        plan.drivers.append(dp)

    # Extra safety: no non-test driver phones in DEMO_VEHICLE_SPECS path already checked
    plan.summary = {
        "demo_driver_count": len(DEMO_VEHICLE_SPECS),
        "planned_drivers": len(plan.drivers),
        "abort_count": len(plan.aborts),
        "phones": _demo_phones(),
        "plates": [str(s["plate"]) for s in DEMO_VEHICLE_SPECS],
    }
    if len(plan.drivers) != len(DEMO_VEHICLE_SPECS):
        plan.ok = False
    return plan


def _sync_docs(db: Session, *, vehicle: Vehicle) -> list[str]:
    """Create/repair only missing or non-compliant DEMO docs. Skip already-ok rows."""
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
        needs = (
            row.status != "approved"
            or row.expires_at != DEMO_DOC_EXPIRES_AT
            or not _looks_demo_doc(row)
        )
        if not needs:
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
        changed.append(f"repair:{doc_type}")
    db.flush()
    return changed


def apply_demo_vehicle_compliance_sync(db: Session) -> SyncPlan:
    """Apply non-wipe demo sync after plan validation. Raises DemoSyncAbort on conflict."""
    plan = build_demo_vehicle_compliance_sync_plan(db)
    if not plan.ok:
        raise DemoSyncAbort("; ".join(plan.aborts) or "demo sync plan not ok")

    phone_to_user_id: dict[str, uuid.UUID] = {}
    for spec in DEMO_VEHICLE_SPECS:
        phone = str(spec["driver_phone"])
        user = db.execute(select(User).where(User.phone == phone)).scalar_one()
        if not user.is_test_account:
            raise DemoSyncAbort(f"non-test user {phone}")
        phone_to_user_id[phone] = user.id

    for phone, uid in phone_to_user_id.items():
        if _has_active_trip(db, uid):
            raise DemoSyncAbort(f"Driver {phone} has active trip")

    applied_actions: list[str] = []
    for spec in DEMO_VEHICLE_SPECS:
        vehicle, _action, aborts = _resolve_vehicle(db, spec)
        if aborts:
            raise DemoSyncAbort("; ".join(aborts))
        vehicle = _ensure_vehicle(db, spec)
        doc_changes = _sync_docs(db, vehicle=vehicle)
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

    # Audit: no phones / PII beyond demo plate identifiers already in scope.
    record_admin_action(
        db,
        actor_user_id=AUDIT_ACTOR,
        action="sync_demo_vehicle_compliance",
        entity_type="demo_dataset",
        entity_id="vehicle_compliance",
        payload={
            "source": "sync_demo_vehicle_compliance",
            "driver_count": len(DEMO_VEHICLE_SPECS),
            "plates": [str(s["plate"]) for s in DEMO_VEHICLE_SPECS],
            "action_count": len(applied_actions),
        },
    )

    db.flush()
    after = build_demo_vehicle_compliance_sync_plan(db)
    after.mode = "applied"
    after.summary["applied"] = True
    after.summary["action_count"] = len(applied_actions)
    return after
