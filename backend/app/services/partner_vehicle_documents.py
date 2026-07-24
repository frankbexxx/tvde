"""PARTNER-FLEET-3A — Vehicle documents service (tenant-safe).

Hard delete MVP. UNIQUE(vehicle_id, document_type) → duplicate create = 409.
``inspecao_viatura`` on drivers.documents is untouched.
"""

from __future__ import annotations

import json
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models.vehicle import Vehicle
from app.db.models.vehicle_document import VehicleDocument
from app.schemas.partner import PartnerVehicleDocumentSummary
from app.schemas.partner_vehicle_documents import (
    VEHICLE_DOCUMENT_STATUSES,
    VEHICLE_DOCUMENT_TYPES,
    PartnerVehicleDocumentCreateRequest,
    PartnerVehicleDocumentItem,
    PartnerVehicleDocumentPatchRequest,
    PartnerVehicleDocumentsSummaryItem,
)

_EXPIRING_SOON_DAYS = 30

# Stable P0 order — matches FE PARTNER_VEHICLE_DOCUMENT_TYPES / PF3C-1.
VEHICLE_DOCUMENT_REQUIRED_TYPES_ORDERED: tuple[str, ...] = (
    "vehicle_registration",
    "vehicle_insurance",
    "periodic_inspection",
    "tvde_sticker",
)

_WORST_STATUS_RANK: dict[str, int] = {
    "rejected": 0,
    "expired": 1,
    "expired_pending": 2,
    "missing": 3,
    "expiring_soon": 4,
    "pending_review": 5,
    "valid": 6,
}


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _utc_iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")


def _parse_optional_dt(raw: str | None, *, field: str) -> datetime | None:
    if raw is None:
        return None
    s = raw.strip()
    if not s:
        return None
    try:
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        dt = datetime.fromisoformat(s)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"invalid_{field}",
        ) from exc
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _as_utc_date(dt: datetime) -> date:
    """Calendar date in UTC (date-only validity; today counts as still valid)."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.date()


def compute_vehicle_document_status(
    *,
    status_value: str,
    expires_at: datetime | None,
    now: datetime | None = None,
) -> str:
    """Derived status for API/UI (expiry beats pending_review for compliance).

    Priority: rejected → expired → expiring_soon → pending_review → valid.

    Expiry uses **UTC calendar dates**, not wall-clock timestamps:
    ``expires_at`` on today's date is still valid (not expired) until end of day.
    """
    st = (status_value or "").strip().lower()
    if st == "rejected":
        return "rejected"
    ref = now or _utc_now()
    if expires_at is not None:
        exp_day = _as_utc_date(expires_at)
        today = _as_utc_date(ref)
        if exp_day < today:
            return "expired"
        if exp_day <= today + timedelta(days=_EXPIRING_SOON_DAYS):
            return "expiring_soon"
    if st == "pending_review":
        return "pending_review"
    if st == "approved":
        return "valid"
    return st or "pending_review"


def document_alert_slot_status(
    *,
    status_value: str,
    expires_at: datetime | None,
    now: datetime | None = None,
) -> str:
    """PF3C-2A alert slot status (FE-aligned; may emit ``expired_pending``).

    Distinct from ``compute_vehicle_document_status`` used by GET …/documents,
    which collapses pending+expired → ``expired`` only.
    """
    st = (status_value or "").strip().lower()
    if st == "rejected":
        return "rejected"
    ref = now or _utc_now()
    if expires_at is not None:
        exp_day = _as_utc_date(expires_at)
        today = _as_utc_date(ref)
        days_left = (exp_day - today).days
        if days_left < 0:
            return "expired_pending" if st == "pending_review" else "expired"
        if days_left <= _EXPIRING_SOON_DAYS:
            return "expiring_soon"
    if st == "pending_review":
        return "pending_review"
    if st == "approved":
        return "valid"
    return st or "pending_review"


def empty_vehicle_document_summary(
    *,
    required_types: tuple[str, ...] = VEHICLE_DOCUMENT_REQUIRED_TYPES_ORDERED,
) -> PartnerVehicleDocumentSummary:
    n = len(required_types)
    if n == 0:
        return PartnerVehicleDocumentSummary(
            total_required=0,
            present_count=0,
            missing_count=0,
            expired_count=0,
            expiring_soon_count=0,
            pending_review_count=0,
            rejected_count=0,
            valid_count=0,
            worst_status="valid",
        )
    return PartnerVehicleDocumentSummary(
        total_required=n,
        present_count=0,
        missing_count=n,
        expired_count=0,
        expiring_soon_count=0,
        pending_review_count=0,
        rejected_count=0,
        valid_count=0,
        worst_status="missing",
    )


def summarize_vehicle_documents_rows(
    rows: list[VehicleDocument],
    *,
    required_types: tuple[str, ...] = VEHICLE_DOCUMENT_REQUIRED_TYPES_ORDERED,
    now: datetime | None = None,
) -> PartnerVehicleDocumentSummary:
    """Aggregate P0 slots from ORM rows (last-wins per document_type)."""
    if not required_types:
        return empty_vehicle_document_summary(required_types=required_types)

    required = set(required_types)
    by_type: dict[str, VehicleDocument] = {}
    for row in rows:
        key = (row.document_type or "").strip()
        if key and key in required:
            by_type[key] = row

    present_count = 0
    missing_count = 0
    expired_count = 0
    expiring_soon_count = 0
    pending_review_count = 0
    rejected_count = 0
    valid_count = 0
    worst_status: str | None = None

    for doc_type in required_types:
        row = by_type.get(doc_type)
        if row is None:
            missing_count += 1
            status_key = "missing"
        else:
            present_count += 1
            status_key = document_alert_slot_status(
                status_value=row.status,
                expires_at=row.expires_at,
                now=now,
            )

        if status_key == "rejected":
            rejected_count += 1
        elif status_key in ("expired", "expired_pending"):
            expired_count += 1
        elif status_key == "expiring_soon":
            expiring_soon_count += 1
        elif status_key == "pending_review":
            pending_review_count += 1
        elif status_key == "valid":
            valid_count += 1

        rank = _WORST_STATUS_RANK.get(status_key, 100)
        if worst_status is None or rank < _WORST_STATUS_RANK.get(worst_status, 100):
            worst_status = status_key

    return PartnerVehicleDocumentSummary(
        total_required=len(required_types),
        present_count=present_count,
        missing_count=missing_count,
        expired_count=expired_count,
        expiring_soon_count=expiring_soon_count,
        pending_review_count=pending_review_count,
        rejected_count=rejected_count,
        valid_count=valid_count,
        worst_status=worst_status or "missing",
    )


def batch_document_summaries_for_vehicles(
    db: Session,
    *,
    partner_id: uuid.UUID,
    vehicle_ids: list[uuid.UUID],
    now: datetime | None = None,
) -> dict[uuid.UUID, PartnerVehicleDocumentSummary]:
    """One query for all docs of the partner's vehicles; aggregate in memory."""
    out: dict[uuid.UUID, PartnerVehicleDocumentSummary] = {
        vid: empty_vehicle_document_summary() for vid in vehicle_ids
    }
    if not vehicle_ids:
        return out

    rows = list(
        db.execute(
            select(VehicleDocument).where(
                VehicleDocument.partner_id == partner_id,
                VehicleDocument.vehicle_id.in_(vehicle_ids),
            )
        )
        .scalars()
        .all()
    )
    by_vid: dict[uuid.UUID, list[VehicleDocument]] = {vid: [] for vid in vehicle_ids}
    for row in rows:
        bucket = by_vid.get(row.vehicle_id)
        if bucket is not None:
            bucket.append(row)

    for vid, docs in by_vid.items():
        out[vid] = summarize_vehicle_documents_rows(docs, now=now)
    return out


def document_summary_for_vehicle(
    db: Session,
    *,
    partner_id: uuid.UUID,
    vehicle_id: uuid.UUID,
    now: datetime | None = None,
) -> PartnerVehicleDocumentSummary:
    """Single-vehicle summary (1 query); used by get/create/patch/assign."""
    return batch_document_summaries_for_vehicles(
        db,
        partner_id=partner_id,
        vehicle_ids=[vehicle_id],
        now=now,
    )[vehicle_id]


def _decode_metadata(raw: str | None) -> dict[str, Any] | None:
    if not raw:
        return None
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return None
    return parsed if isinstance(parsed, dict) else None


def _encode_metadata(data: dict[str, Any] | None) -> str | None:
    if data is None:
        return None
    return json.dumps(data, ensure_ascii=False)


def document_to_item(doc: VehicleDocument) -> PartnerVehicleDocumentItem:
    return PartnerVehicleDocumentItem(
        id=str(doc.id),
        vehicle_id=str(doc.vehicle_id),
        partner_id=str(doc.partner_id),
        document_type=doc.document_type,
        status=doc.status,
        computed_status=compute_vehicle_document_status(
            status_value=doc.status, expires_at=doc.expires_at
        ),
        file_path=doc.file_path,
        file_name=doc.file_name,
        has_file=bool(doc.file_path),
        document_number=doc.document_number,
        issuer=doc.issuer,
        valid_from=_utc_iso(doc.valid_from),
        expires_at=_utc_iso(doc.expires_at),
        issued_at=_utc_iso(doc.issued_at),
        metadata=_decode_metadata(doc.metadata_json),
        notes=doc.notes,
        reviewed_by=str(doc.reviewed_by) if doc.reviewed_by else None,
        reviewed_at=_utc_iso(doc.reviewed_at),
        created_at=_utc_iso(doc.created_at) or "",
        updated_at=_utc_iso(doc.updated_at) or "",
    )


def get_vehicle_for_partner_or_404(
    db: Session, *, partner_id: str, vehicle_id: uuid.UUID
) -> Vehicle:
    pid = uuid.UUID(partner_id)
    vehicle = db.execute(
        select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.partner_id == pid)
    ).scalar_one_or_none()
    if vehicle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
    return vehicle


def get_document_for_partner_or_404(
    db: Session,
    *,
    partner_id: str,
    vehicle_id: uuid.UUID,
    document_id: uuid.UUID,
) -> VehicleDocument:
    get_vehicle_for_partner_or_404(db, partner_id=partner_id, vehicle_id=vehicle_id)
    pid = uuid.UUID(partner_id)
    doc = db.execute(
        select(VehicleDocument).where(
            VehicleDocument.id == document_id,
            VehicleDocument.vehicle_id == vehicle_id,
            VehicleDocument.partner_id == pid,
        )
    ).scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
    return doc


def _require_document_type(value: str) -> str:
    t = value.strip().lower()
    if t not in VEHICLE_DOCUMENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_document_type",
        )
    return t


def _require_status(value: str) -> str:
    s = value.strip().lower()
    if s not in VEHICLE_DOCUMENT_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_document_status",
        )
    return s


def list_vehicle_documents(
    db: Session, *, partner_id: str, vehicle_id: uuid.UUID
) -> list[PartnerVehicleDocumentItem]:
    get_vehicle_for_partner_or_404(db, partner_id=partner_id, vehicle_id=vehicle_id)
    rows = list(
        db.execute(
            select(VehicleDocument)
            .where(VehicleDocument.vehicle_id == vehicle_id)
            .order_by(VehicleDocument.document_type.asc())
        )
        .scalars()
        .all()
    )
    return [document_to_item(d) for d in rows]


def documents_summary_for_vehicle(
    db: Session, *, partner_id: str, vehicle_id: uuid.UUID
) -> list[PartnerVehicleDocumentsSummaryItem]:
    """P0 types with missing when no row — helper for future UI/alerts."""
    items = list_vehicle_documents(db, partner_id=partner_id, vehicle_id=vehicle_id)
    by_type = {i.document_type: i for i in items}
    out: list[PartnerVehicleDocumentsSummaryItem] = []
    for doc_type in sorted(VEHICLE_DOCUMENT_TYPES):
        existing = by_type.get(doc_type)
        if existing is None:
            out.append(
                PartnerVehicleDocumentsSummaryItem(
                    document_type=doc_type,
                    computed_status="missing",
                    document_id=None,
                )
            )
        else:
            out.append(
                PartnerVehicleDocumentsSummaryItem(
                    document_type=doc_type,
                    computed_status=existing.computed_status,
                    document_id=existing.id,
                )
            )
    return out


def create_vehicle_document(
    db: Session,
    *,
    partner_id: str,
    vehicle_id: uuid.UUID,
    body: PartnerVehicleDocumentCreateRequest,
) -> PartnerVehicleDocumentItem:
    vehicle = get_vehicle_for_partner_or_404(
        db, partner_id=partner_id, vehicle_id=vehicle_id
    )
    doc_type = _require_document_type(body.document_type)
    status_val = _require_status(body.status or "pending_review")

    doc = VehicleDocument(
        id=uuid.uuid4(),
        vehicle_id=vehicle.id,
        partner_id=vehicle.partner_id,
        document_type=doc_type,
        status=status_val,
        document_number=body.document_number.strip() if body.document_number else None,
        issuer=body.issuer.strip() if body.issuer else None,
        valid_from=_parse_optional_dt(body.valid_from, field="valid_from"),
        expires_at=_parse_optional_dt(body.expires_at, field="expires_at"),
        issued_at=_parse_optional_dt(body.issued_at, field="issued_at"),
        metadata_json=_encode_metadata(body.metadata),
        notes=body.notes,
    )
    db.add(doc)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="document_type_exists",
        ) from None
    db.refresh(doc)
    return document_to_item(doc)


def patch_vehicle_document(
    db: Session,
    *,
    partner_id: str,
    vehicle_id: uuid.UUID,
    document_id: uuid.UUID,
    body: PartnerVehicleDocumentPatchRequest,
    reviewer_user_id: uuid.UUID | None = None,
) -> PartnerVehicleDocumentItem:
    doc = get_document_for_partner_or_404(
        db,
        partner_id=partner_id,
        vehicle_id=vehicle_id,
        document_id=document_id,
    )
    data = body.model_dump(exclude_unset=True)
    if "status" in data and data["status"] is not None:
        new_status = _require_status(data["status"])
        doc.status = new_status
        if new_status in {"approved", "rejected"} and reviewer_user_id is not None:
            doc.reviewed_by = reviewer_user_id
            doc.reviewed_at = _utc_now()
    if "document_number" in data:
        v = data["document_number"]
        doc.document_number = v.strip() if isinstance(v, str) and v else v
    if "issuer" in data:
        v = data["issuer"]
        doc.issuer = v.strip() if isinstance(v, str) and v else v
    if "valid_from" in data:
        doc.valid_from = _parse_optional_dt(data["valid_from"], field="valid_from")
    if "expires_at" in data:
        doc.expires_at = _parse_optional_dt(data["expires_at"], field="expires_at")
    if "issued_at" in data:
        doc.issued_at = _parse_optional_dt(data["issued_at"], field="issued_at")
    if "metadata" in data:
        doc.metadata_json = _encode_metadata(data["metadata"])
    if "notes" in data:
        doc.notes = data["notes"]

    db.commit()
    db.refresh(doc)
    return document_to_item(doc)


def delete_vehicle_document(
    db: Session,
    *,
    partner_id: str,
    vehicle_id: uuid.UUID,
    document_id: uuid.UUID,
) -> None:
    """Hard delete MVP (UNIQUE type slot becomes free). File on disk left orphan OK for MVP."""
    doc = get_document_for_partner_or_404(
        db,
        partner_id=partner_id,
        vehicle_id=vehicle_id,
        document_id=document_id,
    )
    db.delete(doc)
    db.commit()
