"""Admin read-only KYC supervision snapshot (G-KYC-P0-02).

Reuses driver JSON vault parsing and vehicle document expiry helpers.
No mutations; no second approval workflow.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db.models.driver import Driver
from app.db.models.partner import Partner
from app.db.models.user import User
from app.db.models.vehicle import Vehicle
from app.db.models.vehicle_document import VehicleDocument
from app.schemas.admin_kyc import (
    AdminKycAlertsSummary,
    AdminKycDocItem,
    AdminKycDriverRow,
    AdminKycPartnerOption,
    AdminKycSupervisionResponse,
    AdminKycVehicleRow,
)
from app.services.driver_documents import DOC_KEYS, parse_documents_column
from app.services.partner_vehicle_documents import (
    VEHICLE_DOCUMENT_REQUIRED_TYPES_ORDERED,
    compute_vehicle_document_status,
    summarize_vehicle_documents_rows,
)


def _parse_expires_at(raw: str | None) -> datetime | None:
    if not raw or not isinstance(raw, str):
        return None
    s = raw.strip()
    if not s:
        return None
    try:
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        dt = datetime.fromisoformat(s)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _driver_doc_item(doc_key: str, entry: dict) -> AdminKycDocItem:
    stored = str(entry.get("status") or "missing")
    expires_raw = entry.get("expires_at")
    expires_at = expires_raw if isinstance(expires_raw, str) else None
    exp_dt = _parse_expires_at(expires_at)
    # Same calendar expiry rule as vehicle docs (30d soon) — display only.
    computed = compute_vehicle_document_status(
        status_value=stored if stored != "missing" else "pending_review",
        expires_at=exp_dt,
    )
    if stored == "missing" and exp_dt is None:
        computed = "missing"
    is_expired = computed == "expired" or stored == "expired"
    is_expiring_soon = computed == "expiring_soon" and not is_expired
    has_file = bool(
        (isinstance(entry.get("file_path"), str) and entry["file_path"].strip())
        or (isinstance(entry.get("file_name"), str) and entry["file_name"].strip())
    )
    return AdminKycDocItem(
        doc_key=doc_key,
        stored_status=stored,
        expires_at=expires_at,
        computed_status=computed,
        is_expired=is_expired,
        is_expiring_soon=is_expiring_soon,
        has_file=has_file,
    )


def _vehicle_doc_item(doc: VehicleDocument) -> AdminKycDocItem:
    computed = compute_vehicle_document_status(
        status_value=doc.status,
        expires_at=doc.expires_at,
    )
    expires_iso = None
    if doc.expires_at is not None:
        dt = doc.expires_at
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        else:
            dt = dt.astimezone(timezone.utc)
        expires_iso = dt.isoformat().replace("+00:00", "Z")
    return AdminKycDocItem(
        doc_key=doc.document_type,
        stored_status=doc.status,
        expires_at=expires_iso,
        computed_status=computed,
        is_expired=computed == "expired",
        is_expiring_soon=computed == "expiring_soon",
        has_file=bool(doc.file_path),
    )


def build_admin_kyc_supervision(
    db: Session,
    *,
    driver_limit: int = 500,
    vehicle_limit: int = 500,
) -> AdminKycSupervisionResponse:
    partners = list(
        db.execute(select(Partner).order_by(Partner.name.asc())).scalars().all()
    )
    partner_name = {str(p.id): p.name for p in partners}

    drivers = list(
        db.execute(
            select(Driver)
            .options(selectinload(Driver.user))
            .order_by(Driver.created_at.desc())
            .limit(driver_limit)
        )
        .scalars()
        .all()
    )

    driver_rows: list[AdminKycDriverRow] = []
    drivers_expired = 0
    drivers_pending_rej = 0
    for d in drivers:
        state = parse_documents_column(d.documents)
        docs_map = state.get("docs") or {}
        items = [_driver_doc_item(k, docs_map.get(k) or {}) for k in sorted(DOC_KEYS)]
        if any(i.is_expired or i.stored_status == "expired" for i in items):
            drivers_expired += 1
        if any(
            i.stored_status in ("pending_review", "pending", "rejected") for i in items
        ):
            drivers_pending_rej += 1
        u: User | None = getattr(d, "user", None)
        driver_rows.append(
            AdminKycDriverRow(
                user_id=str(d.user_id),
                driver_name=(u.name if u else None),
                driver_phone=(u.phone if u else None),
                partner_id=str(d.partner_id),
                partner_name=partner_name.get(str(d.partner_id)),
                driver_status=d.status.value if d.status else "unknown",
                documents=items,
            )
        )

    vehicles = list(
        db.execute(
            select(Vehicle)
            .options(selectinload(Vehicle.documents), selectinload(Vehicle.assigned_driver))
            .order_by(Vehicle.created_at.desc())
            .limit(vehicle_limit)
        )
        .scalars()
        .all()
    )

    # Enrich assigned driver names
    assigned_ids = [
        v.assigned_driver.user_id
        for v in vehicles
        if v.assigned_driver is not None
    ]
    user_by_id: dict[str, User] = {}
    if assigned_ids:
        users = (
            db.execute(select(User).where(User.id.in_(assigned_ids))).scalars().all()
        )
        user_by_id = {str(u.id): u for u in users}

    vehicle_rows: list[AdminKycVehicleRow] = []
    veh_expired = 0
    veh_soon = 0
    veh_inactive = 0
    for v in vehicles:
        if (v.status or "").lower() == "inactive":
            veh_inactive += 1
        docs_by_type = {d.document_type: d for d in (v.documents or [])}
        items: list[AdminKycDocItem] = []
        for dtype in VEHICLE_DOCUMENT_REQUIRED_TYPES_ORDERED:
            row = docs_by_type.get(dtype)
            if row is None:
                items.append(
                    AdminKycDocItem(
                        doc_key=dtype,
                        stored_status="missing",
                        computed_status="missing",
                        is_expired=False,
                        is_expiring_soon=False,
                        has_file=False,
                    )
                )
            else:
                items.append(_vehicle_doc_item(row))
        summary = summarize_vehicle_documents_rows(list(v.documents or []))
        if summary.expired_count > 0:
            veh_expired += 1
        if summary.expiring_soon_count > 0:
            veh_soon += 1
        assigned = v.assigned_driver
        assigned_uid = str(assigned.user_id) if assigned else None
        assigned_name = None
        if assigned_uid and assigned_uid in user_by_id:
            assigned_name = user_by_id[assigned_uid].name
        vehicle_rows.append(
            AdminKycVehicleRow(
                vehicle_id=str(v.id),
                plate=v.plate,
                partner_id=str(v.partner_id),
                partner_name=partner_name.get(str(v.partner_id)),
                status=v.status,
                assigned_driver_user_id=assigned_uid,
                assigned_driver_name=assigned_name,
                documents=items,
                worst_document_status=summary.worst_status,
            )
        )

    return AdminKycSupervisionResponse(
        alerts=AdminKycAlertsSummary(
            drivers_with_expired_docs=drivers_expired,
            drivers_with_pending_or_rejected_docs=drivers_pending_rej,
            vehicles_with_expired_docs=veh_expired,
            vehicles_with_expiring_soon_docs=veh_soon,
            vehicles_inactive=veh_inactive,
        ),
        partners=[
            AdminKycPartnerOption(id=str(p.id), name=p.name) for p in partners
        ],
        drivers=driver_rows,
        vehicles=vehicle_rows,
    )
