"""L-12 complaints service — Complaint state + ComplaintHistory procedure trail."""

from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models.audit_event import AuditEvent
from app.db.models.complaint import Complaint, ComplaintHistory
from app.db.models.trip import Trip
from app.models.enums import (
    ComplaintCategory,
    ComplaintComplainantRole,
    ComplaintHistoryEventType,
    ComplaintSource,
    ComplaintStatus,
    Role,
)
from app.schemas.complaints import (
    ComplaintAdminItem,
    ComplaintAdminListItem,
    ComplaintHistoryItem,
    ComplaintUserItem,
)
from app.services.complaint_retention import compute_retention_until

DESCRIPTION_MAX = 4000
RESOLUTION_MAX = 4000
PUBLIC_REF_MAX_ATTEMPTS = 8

ACTIVE_RESOLUTION_STATUSES = frozenset(
    {ComplaintStatus.resolved.value, ComplaintStatus.closed.value}
)

# from_status -> allowed to_status
ALLOWED_TRANSITIONS: dict[str, frozenset[str]] = {
    ComplaintStatus.received.value: frozenset(
        {
            ComplaintStatus.under_review.value,
            ComplaintStatus.awaiting_info.value,
            ComplaintStatus.resolved.value,
            ComplaintStatus.closed.value,
        }
    ),
    ComplaintStatus.under_review.value: frozenset(
        {
            ComplaintStatus.received.value,
            ComplaintStatus.awaiting_info.value,
            ComplaintStatus.resolved.value,
            ComplaintStatus.closed.value,
        }
    ),
    ComplaintStatus.awaiting_info.value: frozenset(
        {
            ComplaintStatus.received.value,
            ComplaintStatus.under_review.value,
            ComplaintStatus.resolved.value,
            ComplaintStatus.closed.value,
        }
    ),
    ComplaintStatus.resolved.value: frozenset(
        {
            ComplaintStatus.under_review.value,
            ComplaintStatus.closed.value,
        }
    ),
    ComplaintStatus.closed.value: frozenset(),
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_uuid(value: str | uuid.UUID, *, detail: str) -> uuid.UUID:
    try:
        return uuid.UUID(str(value).strip())
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail) from exc


def generate_public_reference(*, when: datetime | None = None) -> str:
    year = (when or _now()).year
    suffix = secrets.token_hex(4).upper()
    return f"CMP-{year}-{suffix}"


def _append_history(
    db: Session,
    *,
    complaint: Complaint,
    event_type: ComplaintHistoryEventType,
    actor_user_id: uuid.UUID | None,
    from_status: str | None = None,
    to_status: str | None = None,
    metadata: dict[str, Any] | None = None,
    occurred_at: datetime | None = None,
) -> ComplaintHistory:
    row = ComplaintHistory(
        id=uuid.uuid4(),
        complaint_id=complaint.id,
        event_type=event_type.value,
        from_status=from_status,
        to_status=to_status,
        actor_user_id=actor_user_id,
        occurred_at=occurred_at or _now(),
        event_metadata=metadata,
    )
    db.add(row)
    return row


def _record_operational_audit(
    db: Session,
    *,
    event_type: str,
    complaint: Complaint,
    actor_user_id: str,
    actor_role: str,
    payload_extra: dict[str, Any] | None = None,
) -> None:
    """Operational AuditEvent — not the L-12 procedure proof."""
    payload: dict[str, Any] = {
        "public_reference": complaint.public_reference,
        "actor_user_id": str(actor_user_id),
        "actor_role": actor_role,
        "status": complaint.status,
    }
    if payload_extra:
        payload.update(payload_extra)
    db.add(
        AuditEvent(
            event_type=event_type,
            entity_type="complaint",
            entity_id=str(complaint.id)[:64],
            payload=payload,
            occurred_at=_now(),
        )
    )


def _assert_trip_ownership(
    db: Session,
    *,
    trip_id: uuid.UUID,
    user_id: uuid.UUID,
    role: Role,
) -> Trip:
    trip = db.execute(select(Trip).where(Trip.id == trip_id)).scalar_one_or_none()
    if trip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="trip_not_found")
    uid = str(user_id)
    if role == Role.passenger:
        if str(trip.passenger_id) != uid:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="forbidden_trip_access",
            )
    elif role == Role.driver:
        if not trip.driver_id or str(trip.driver_id) != uid:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="forbidden_trip_access",
            )
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden_role")
    return trip


def resolution_for_response(complaint: Complaint) -> str | None:
    if complaint.status not in ACTIVE_RESOLUTION_STATUSES:
        return None
    return complaint.resolution


def to_user_item(complaint: Complaint) -> ComplaintUserItem:
    return ComplaintUserItem(
        public_reference=complaint.public_reference,
        category=complaint.category,
        description=complaint.description,
        status=complaint.status,
        submitted_at=complaint.submitted_at,
        trip_id=complaint.trip_id,
        resolution=resolution_for_response(complaint),
    )


def _history_items(db: Session, complaint_id: uuid.UUID) -> list[ComplaintHistoryItem]:
    rows = db.execute(
        select(ComplaintHistory)
        .where(ComplaintHistory.complaint_id == complaint_id)
        .order_by(ComplaintHistory.occurred_at.asc(), ComplaintHistory.id.asc())
    ).scalars().all()
    return [
        ComplaintHistoryItem(
            event_type=r.event_type,
            from_status=r.from_status,
            to_status=r.to_status,
            actor_user_id=r.actor_user_id,
            occurred_at=r.occurred_at,
            metadata=r.event_metadata,
        )
        for r in rows
    ]


def to_admin_item(db: Session, complaint: Complaint, *, include_history: bool = True) -> ComplaintAdminItem:
    return ComplaintAdminItem(
        id=complaint.id,
        public_reference=complaint.public_reference,
        complainant_role=complaint.complainant_role,
        complainant_user_id=complaint.complainant_user_id,
        trip_id=complaint.trip_id,
        category=complaint.category,
        description=complaint.description,
        source=complaint.source,
        submitted_at=complaint.submitted_at,
        status=complaint.status,
        assigned_to=complaint.assigned_to,
        # Admin sees stored text; active only when status resolved|closed (FE gates display).
        resolution=complaint.resolution,
        resolved_at=complaint.resolved_at,
        closed_at=complaint.closed_at,
        retention_until=complaint.retention_until,
        created_at=complaint.created_at,
        updated_at=complaint.updated_at,
        history=_history_items(db, complaint.id) if include_history else [],
    )


def to_admin_list_item(complaint: Complaint) -> ComplaintAdminListItem:
    return ComplaintAdminListItem(
        id=complaint.id,
        public_reference=complaint.public_reference,
        complainant_role=complaint.complainant_role,
        category=complaint.category,
        status=complaint.status,
        submitted_at=complaint.submitted_at,
        trip_id=complaint.trip_id,
        assigned_to=complaint.assigned_to,
    )


def create_complaint(
    db: Session,
    *,
    user_id: str,
    role: Role,
    category: ComplaintCategory,
    description: str,
    trip_id: uuid.UUID | None = None,
) -> Complaint:
    if role not in (Role.passenger, Role.driver):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden_role")

    text = (description or "").strip()
    if not text or len(text) > DESCRIPTION_MAX:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_description")

    uid = _parse_uuid(user_id, detail="user_not_found")
    if trip_id is not None:
        _assert_trip_ownership(db, trip_id=trip_id, user_id=uid, role=role)

    complainant_role = (
        ComplaintComplainantRole.passenger
        if role == Role.passenger
        else ComplaintComplainantRole.driver
    )
    submitted_at = _now()
    retention_until = compute_retention_until(submitted_at)

    complaint: Complaint | None = None
    last_error: Exception | None = None
    for _ in range(PUBLIC_REF_MAX_ATTEMPTS):
        candidate = Complaint(
            id=uuid.uuid4(),
            public_reference=generate_public_reference(when=submitted_at),
            complainant_role=complainant_role.value,
            complainant_user_id=uid,
            trip_id=trip_id,
            category=category.value,
            description=text,
            source=ComplaintSource.in_app.value,
            submitted_at=submitted_at,
            status=ComplaintStatus.received.value,
            retention_until=retention_until,
        )
        try:
            with db.begin_nested():
                db.add(candidate)
                db.flush()
            complaint = candidate
            break
        except IntegrityError as exc:
            last_error = exc
            continue

    if complaint is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="public_reference_generation_failed",
        ) from last_error

    _append_history(
        db,
        complaint=complaint,
        event_type=ComplaintHistoryEventType.received,
        actor_user_id=uid,
        from_status=None,
        to_status=ComplaintStatus.received.value,
        occurred_at=submitted_at,
    )
    _record_operational_audit(
        db,
        event_type="complaint.received",
        complaint=complaint,
        actor_user_id=str(uid),
        actor_role=role.value,
    )
    db.commit()
    db.refresh(complaint)
    return complaint


def list_own_complaints(db: Session, *, user_id: str) -> list[Complaint]:
    uid = _parse_uuid(user_id, detail="user_not_found")
    return list(
        db.execute(
            select(Complaint)
            .where(Complaint.complainant_user_id == uid)
            .order_by(Complaint.submitted_at.desc())
        ).scalars().all()
    )


def get_own_complaint(db: Session, *, user_id: str, public_reference: str) -> Complaint:
    uid = _parse_uuid(user_id, detail="user_not_found")
    ref = (public_reference or "").strip().upper()
    complaint = db.execute(
        select(Complaint).where(Complaint.public_reference == ref)
    ).scalar_one_or_none()
    if complaint is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="complaint_not_found")
    if complaint.complainant_user_id != uid:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden_complaint_access")
    return complaint


def get_complaint_by_public_reference(db: Session, public_reference: str) -> Complaint:
    ref = (public_reference or "").strip().upper()
    complaint = db.execute(
        select(Complaint).where(Complaint.public_reference == ref)
    ).scalar_one_or_none()
    if complaint is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="complaint_not_found")
    return complaint


def list_admin_complaints(
    db: Session,
    *,
    status_filter: str | None = None,
    category: str | None = None,
    public_reference: str | None = None,
    trip_id: uuid.UUID | None = None,
    submitted_from: datetime | None = None,
    submitted_to: datetime | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Complaint]:
    stmt = select(Complaint)
    if status_filter:
        stmt = stmt.where(Complaint.status == status_filter)
    if category:
        stmt = stmt.where(Complaint.category == category)
    if public_reference:
        stmt = stmt.where(Complaint.public_reference == public_reference.strip().upper())
    if trip_id is not None:
        stmt = stmt.where(Complaint.trip_id == trip_id)
    if submitted_from is not None:
        stmt = stmt.where(Complaint.submitted_at >= submitted_from)
    if submitted_to is not None:
        stmt = stmt.where(Complaint.submitted_at <= submitted_to)
    stmt = stmt.order_by(Complaint.submitted_at.desc()).limit(limit).offset(offset)
    return list(db.execute(stmt).scalars().all())


def update_admin_complaint(
    db: Session,
    *,
    admin_user_id: str,
    public_reference: str,
    new_status: ComplaintStatus | None = None,
    assigned_to: uuid.UUID | None = None,
    clear_assigned_to: bool = False,
    resolution: str | None = None,
) -> Complaint:
    admin_uid = _parse_uuid(admin_user_id, detail="user_not_found")
    complaint = get_complaint_by_public_reference(db, public_reference)
    old_status = complaint.status

    if clear_assigned_to or assigned_to is not None:
        old_assignee = complaint.assigned_to
        new_assignee = None if clear_assigned_to else assigned_to
        if old_assignee != new_assignee:
            complaint.assigned_to = new_assignee
            _append_history(
                db,
                complaint=complaint,
                event_type=ComplaintHistoryEventType.assignment_changed,
                actor_user_id=admin_uid,
                from_status=old_status,
                to_status=old_status,
                metadata={
                    "from_assigned_to": str(old_assignee) if old_assignee else None,
                    "to_assigned_to": str(new_assignee) if new_assignee else None,
                },
            )

    if new_status is not None and new_status.value != old_status:
        target = new_status.value
        allowed = ALLOWED_TRANSITIONS.get(old_status, frozenset())
        if target not in allowed:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="invalid_status_transition",
            )

        if target == ComplaintStatus.resolved.value:
            res_text = (resolution if resolution is not None else complaint.resolution) or ""
            res_text = res_text.strip()
            if not res_text or len(res_text) > RESOLUTION_MAX:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="resolution_required",
                )
            complaint.resolution = res_text
            complaint.resolved_at = _now()
            complaint.status = target
            _append_history(
                db,
                complaint=complaint,
                event_type=ComplaintHistoryEventType.status_changed,
                actor_user_id=admin_uid,
                from_status=old_status,
                to_status=target,
            )
            _append_history(
                db,
                complaint=complaint,
                event_type=ComplaintHistoryEventType.resolved,
                actor_user_id=admin_uid,
                from_status=old_status,
                to_status=target,
            )
            _record_operational_audit(
                db,
                event_type="complaint.status_changed",
                complaint=complaint,
                actor_user_id=str(admin_uid),
                actor_role=Role.admin.value,
                payload_extra={"from_status": old_status, "to_status": target},
            )
            _record_operational_audit(
                db,
                event_type="complaint.resolved",
                complaint=complaint,
                actor_user_id=str(admin_uid),
                actor_role=Role.admin.value,
                payload_extra={"from_status": old_status, "to_status": target},
            )

        elif target == ComplaintStatus.closed.value:
            complaint.status = target
            complaint.closed_at = _now()
            if resolution is not None:
                text = resolution.strip()
                if text:
                    complaint.resolution = text
            _append_history(
                db,
                complaint=complaint,
                event_type=ComplaintHistoryEventType.status_changed,
                actor_user_id=admin_uid,
                from_status=old_status,
                to_status=target,
            )
            _append_history(
                db,
                complaint=complaint,
                event_type=ComplaintHistoryEventType.closed,
                actor_user_id=admin_uid,
                from_status=old_status,
                to_status=target,
            )
            _record_operational_audit(
                db,
                event_type="complaint.status_changed",
                complaint=complaint,
                actor_user_id=str(admin_uid),
                actor_role=Role.admin.value,
                payload_extra={"from_status": old_status, "to_status": target},
            )
            _record_operational_audit(
                db,
                event_type="complaint.closed",
                complaint=complaint,
                actor_user_id=str(admin_uid),
                actor_role=Role.admin.value,
                payload_extra={"from_status": old_status, "to_status": target},
            )

        elif (
            old_status == ComplaintStatus.resolved.value
            and target == ComplaintStatus.under_review.value
        ):
            complaint.status = target
            complaint.resolved_at = None
            # keep previous resolution text; not active while not resolved/closed
            _append_history(
                db,
                complaint=complaint,
                event_type=ComplaintHistoryEventType.status_changed,
                actor_user_id=admin_uid,
                from_status=old_status,
                to_status=target,
            )
            _append_history(
                db,
                complaint=complaint,
                event_type=ComplaintHistoryEventType.reopened,
                actor_user_id=admin_uid,
                from_status=old_status,
                to_status=target,
            )
            _record_operational_audit(
                db,
                event_type="complaint.status_changed",
                complaint=complaint,
                actor_user_id=str(admin_uid),
                actor_role=Role.admin.value,
                payload_extra={"from_status": old_status, "to_status": target},
            )

        else:
            complaint.status = target
            _append_history(
                db,
                complaint=complaint,
                event_type=ComplaintHistoryEventType.status_changed,
                actor_user_id=admin_uid,
                from_status=old_status,
                to_status=target,
            )
            _record_operational_audit(
                db,
                event_type="complaint.status_changed",
                complaint=complaint,
                actor_user_id=str(admin_uid),
                actor_role=Role.admin.value,
                payload_extra={"from_status": old_status, "to_status": target},
            )

    elif resolution is not None and complaint.status == ComplaintStatus.resolved.value:
        text = resolution.strip()
        if not text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="resolution_required",
            )
        complaint.resolution = text

    db.commit()
    db.refresh(complaint)
    return complaint
