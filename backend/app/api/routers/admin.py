import csv
import io
import time
import uuid
from typing import Any, List

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request, status
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session, joinedload

from app.api.deps import UserContext, get_db, require_role
from app.db.models.audit_event import AuditEvent
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.core.config import settings
from app.db.models.driver import Driver
from app.db.models.interaction_log import InteractionLog
from app.db.models.user import User
from app.db.models.payment import Payment
from app.db.models.trip import Trip
from app.db.models.partner import Partner
from app.models.enums import DriverStatus, Role, TripStatus, UserStatus
from app.schemas.driver import DriverStatusResponse
from app.schemas.system_health import (
    AdminMetricsResponse,
    RecoverDriverResponse,
    RunOfferExpiryResponse,
    RunTimeoutsResponse,
    SystemHealthResponse,
)
from app.api.serializers import (
    trip_to_detail,
    trip_to_history_item,
    trip_to_status_response,
)
from app.schemas.trip import (
    TripActiveItem,
    TripDetailResponse,
    TripHistoryItem,
    TripStatusResponse,
)
from app.services.admin_metrics import get_admin_metrics
from app.services.system_health import get_system_health
from app.services.offer_dispatch import expire_stale_offers, redispatch_expired_trips
from app.services.trip_timeouts import run_trip_timeouts
from app.services.trips import (
    admin_apply_trip_transition,
    assign_trip,
    cancel_trip_by_admin,
    get_trip_by_id,
)
from app.services.cleanup import run_cleanup
from app.cron.system_health_check import run_system_health_check
from app.schemas.partner import (
    AdminAssignPartnerRequest,
    AdminAssignPartnerResponse,
    AdminCreatePartnerOrgAdminRequest,
    AdminCreatePartnerRequest,
    AdminPartnerCreatedResponse,
    AdminPartnerOrgAdminCreatedResponse,
)
from app.services.partners_admin import (
    assign_driver_to_partner,
    create_partner,
    create_partner_org_admin,
    unassign_driver_from_partner,
)
from app.services.admin_audit import record_admin_action
from app.utils.logging import log_event


router = APIRouter(prefix="/admin", tags=["admin"])


class AdminAuditTrailItem(BaseModel):
    """Linha de auditoria admin (`event_type` prefixado com `admin.`)."""

    id: str
    event_type: str
    entity_type: str
    entity_id: str
    occurred_at: str
    payload: dict


class AdminCronRunResponse(BaseModel):
    status: str
    duration_ms: int
    error_count: int
    errors: dict[str, str]
    timeouts: dict[str, int]
    offers: dict[str, int]
    cleanup: dict[str, Any]
    system_health_status: str
    request_id: str


class AdminPhase0Response(BaseModel):
    status: str
    request_id: str
    env: str
    environment: str | None
    cron_secret_set: bool
    stripe_webhook_secret_set: bool
    stripe_mock: bool
    beta_mode: bool


class AdminEnvValidateRequest(BaseModel):
    env_text: str


class AdminEnvValidateResponse(BaseModel):
    status: str
    request_id: str
    present_keys: list[str]
    missing_required_keys: list[str]
    ignored_lines: int


def _parse_dotenv_keys(text: str) -> tuple[set[str], int]:
    keys: set[str] = set()
    ignored = 0
    for raw in (text or "").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            ignored += 1
            continue
        k = line.split("=", 1)[0].strip()
        if not k or " " in k:
            ignored += 1
            continue
        keys.add(k)
    return keys, ignored


@router.get("/phase0", response_model=AdminPhase0Response)
async def admin_phase0(
    request: Request,
    user: UserContext = Depends(require_role(Role.admin)),
) -> AdminPhase0Response:
    """Minimal readiness checks surfaced in the Admin UI (no secrets exposed)."""
    rid = getattr(getattr(request, "state", None), "request_id", "") or ""
    out = AdminPhase0Response(
        status="ok",
        request_id=rid,
        env=settings.ENV,
        environment=settings.ENVIRONMENT,
        cron_secret_set=bool(getattr(settings, "CRON_SECRET", None)),
        stripe_webhook_secret_set=bool(
            getattr(settings, "STRIPE_WEBHOOK_SECRET", None)
        ),
        stripe_mock=bool(getattr(settings, "STRIPE_MOCK", False)),
        beta_mode=bool(getattr(settings, "BETA_MODE", False)),
    )
    log_event(
        "admin_phase0_checked",
        cron_secret_set=out.cron_secret_set,
        stripe_webhook_secret_set=out.stripe_webhook_secret_set,
        stripe_mock=out.stripe_mock,
        beta_mode=out.beta_mode,
    )
    return out


@router.post("/cron/run", response_model=AdminCronRunResponse)
async def admin_run_cron(
    request: Request,
    user: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> AdminCronRunResponse:
    """Run the same maintenance batch as /cron/jobs, but admin-only (no CRON_SECRET in UI)."""
    rid = getattr(getattr(request, "state", None), "request_id", "") or ""
    started = time.monotonic()
    log_event("cron_started", invoked_by="admin")
    errors: dict[str, str] = {}

    try:
        timeouts = run_trip_timeouts(db)
        log_event("cron_job_ok", job="trip_timeouts", **timeouts)
    except Exception as e:
        timeouts = {
            "assigned_to_requested": 0,
            "accepted_to_cancelled": 0,
            "ongoing_to_failed": 0,
        }
        errors["trip_timeouts"] = str(e)
        log_event("cron_job_error", job="trip_timeouts", error=str(e))

    try:
        expired = expire_stale_offers(db)
        log_event("cron_job_ok", job="expire_stale_offers", offers_expired=expired)
    except Exception as e:
        expired = 0
        errors["expire_stale_offers"] = str(e)
        log_event("cron_job_error", job="expire_stale_offers", error=str(e))

    try:
        new_offers = redispatch_expired_trips(db)
        log_event(
            "cron_job_ok",
            job="redispatch_expired_trips",
            redispatch_offers_created=len(new_offers),
        )
    except Exception as e:
        new_offers = []
        errors["redispatch_expired_trips"] = str(e)
        log_event("cron_job_error", job="redispatch_expired_trips", error=str(e))

    try:
        cleanup = run_cleanup(db)
        log_event(
            "cron_job_ok",
            job="cleanup",
            audit_events_deleted=cleanup.get("audit_events_deleted", 0),
        )
    except Exception as e:
        cleanup = {"audit_events_deleted": 0}
        errors["cleanup"] = str(e)
        log_event("cron_job_error", job="cleanup", error=str(e))

    try:
        system_health = run_system_health_check(db)
        sh_status = system_health.get("status", "")
        log_event(
            "cron_job_ok", job="system_health_check", system_health_status=sh_status
        )
    except Exception as e:
        system_health = {"status": "error", "warnings": [str(e)]}
        sh_status = "error"
        errors["system_health_check"] = str(e)
        log_event("cron_job_error", job="system_health_check", error=str(e))

    elapsed_ms = int(round((time.monotonic() - started) * 1000))
    log_event(
        "cron_finished",
        duration_ms=elapsed_ms,
        ok=(len(errors) == 0),
        error_count=len(errors),
        invoked_by="admin",
    )
    log_event(
        "cron_jobs_run",
        assigned_to_requested=timeouts.get("assigned_to_requested", 0),
        accepted_to_cancelled=timeouts.get("accepted_to_cancelled", 0),
        ongoing_to_failed=timeouts.get("ongoing_to_failed", 0),
        offers_expired=expired,
        redispatch_offers_created=len(new_offers),
        audit_events_deleted=cleanup.get("audit_events_deleted", 0),
        system_health_status=sh_status,
        duration_ms=elapsed_ms,
        ok=(len(errors) == 0),
        error_count=len(errors),
        invoked_by="admin",
    )

    return AdminCronRunResponse(
        status="ok" if len(errors) == 0 else "partial_error",
        duration_ms=elapsed_ms,
        error_count=len(errors),
        errors=errors,
        timeouts={
            "assigned_to_requested": timeouts.get("assigned_to_requested", 0),
            "accepted_to_cancelled": timeouts.get("accepted_to_cancelled", 0),
            "ongoing_to_failed": timeouts.get("ongoing_to_failed", 0),
        },
        offers={"expired_count": expired, "redispatch_created": len(new_offers)},
        cleanup=cleanup,
        system_health_status=sh_status,
        request_id=rid,
    )


@router.post("/env/validate", response_model=AdminEnvValidateResponse)
async def admin_validate_env(
    request: Request,
    body: AdminEnvValidateRequest,
    user: UserContext = Depends(require_role(Role.admin)),
) -> AdminEnvValidateResponse:
    """Validate a pasted .env (key=value) WITHOUT storing it. Safe-by-default."""
    rid = getattr(getattr(request, "state", None), "request_id", "") or ""
    keys, ignored = _parse_dotenv_keys(body.env_text)
    required = [
        "DATABASE_URL",
        "JWT_SECRET_KEY",
        "OTP_SECRET",
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "CRON_SECRET",
    ]
    missing = sorted([k for k in required if k not in keys])
    present = sorted(list(keys))
    log_event(
        "admin_env_validated",
        required_count=len(required),
        missing_count=len(missing),
        ignored_lines=ignored,
    )
    return AdminEnvValidateResponse(
        status="ok",
        request_id=rid,
        present_keys=present,
        missing_required_keys=missing,
        ignored_lines=ignored,
    )


class WeeklyReportRow(BaseModel):
    week_start: str
    trips_created: int
    trips_completed: int


class AdminAlertsResponse(BaseModel):
    zero_drivers_available: bool
    zero_trips_today: bool


class AdminUsageSummaryResponse(BaseModel):
    metrics: AdminMetricsResponse
    alerts: AdminAlertsResponse
    weekly: list[WeeklyReportRow]


# --- BETA: pending users & approval ---


class PendingUserItem(BaseModel):
    phone: str
    requested_role: str


class ApproveUserRequest(BaseModel):
    phone: str


@router.get("/pending-users", response_model=List[PendingUserItem])
async def get_pending_users(
    user: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> List[PendingUserItem]:
    """BETA: list users with status=pending."""
    if not getattr(settings, "BETA_MODE", False):
        return []
    users = (
        db.execute(select(User).where(User.status == UserStatus.pending))
        .scalars()
        .all()
    )
    return [
        PendingUserItem(
            phone=u.phone,
            requested_role=u.requested_role or "passenger",
        )
        for u in users
    ]


class AdminUserItem(BaseModel):
    id: str
    phone: str
    name: str
    role: str
    status: str
    requested_role: str | None
    has_driver_profile: bool


class AdminUserUpdateRequest(BaseModel):
    name: str | None = None
    phone: str | None = None


class AdminTripTransitionRequest(BaseModel):
    """Transição manual (SP-A): só pares suportados pelo serviço."""

    to_status: TripStatus
    confirmation: str
    reason: str = Field(..., min_length=10, max_length=500)


class AdminCancelTripRequest(BaseModel):
    confirmation: str
    reason: str = Field(..., min_length=10, max_length=280)


class AdminPaymentOpsNoteRequest(BaseModel):
    confirmation: str
    note: str = Field(..., min_length=3, max_length=2000)


def _admin_trip_transition_confirmation_token(to: TripStatus) -> str:
    return f"FORCAR_{to.value.upper()}"


class AdminPartnerListItem(BaseModel):
    id: str
    name: str
    created_at: str


class AdminDriverListItem(BaseModel):
    user_id: str
    partner_id: str
    status: str


@router.get("/users", response_model=List[AdminUserItem])
async def list_users(
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    user: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> List[AdminUserItem]:
    """BETA: list all users for admin management."""
    if not getattr(settings, "BETA_MODE", False):
        raise HTTPException(status_code=404, detail="Not available")
    users = (
        db.execute(
            select(User).order_by(User.created_at.desc()).limit(limit).offset(offset)
        )
        .scalars()
        .all()
    )
    result = []
    for u in users:
        driver = db.execute(
            select(Driver).where(Driver.user_id == u.id)
        ).scalar_one_or_none()
        result.append(
            AdminUserItem(
                id=str(u.id),
                phone=u.phone,
                name=u.name or u.phone,
                role=u.role.value,
                status=u.status.value,
                requested_role=u.requested_role,
                has_driver_profile=driver is not None,
            )
        )
    return result


@router.get("/partners", response_model=List[AdminPartnerListItem])
async def admin_list_partners(
    user: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> List[AdminPartnerListItem]:
    """List all partner orgs for visibility/operations."""
    rows = (
        db.execute(select(Partner).order_by(Partner.created_at.desc())).scalars().all()
    )
    return [
        AdminPartnerListItem(
            id=str(p.id), name=p.name, created_at=p.created_at.isoformat()
        )
        for p in rows
    ]


@router.get("/drivers", response_model=List[AdminDriverListItem])
async def admin_list_drivers(
    user: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> List[AdminDriverListItem]:
    """List drivers (user_id, partner_id, status) for visibility/operations."""
    rows = db.execute(select(Driver).order_by(Driver.created_at.desc())).scalars().all()
    return [
        AdminDriverListItem(
            user_id=str(d.user_id),
            partner_id=str(d.partner_id),
            status=d.status.value,
        )
        for d in rows
    ]


def _is_admin_phone(phone: str) -> bool:
    admin_phone = getattr(settings, "ADMIN_PHONE", None)
    if not admin_phone:
        return False
    return admin_phone.strip() == phone.strip()


@router.post("/users/{user_id}/promote-driver")
async def promote_user_to_driver(
    user_id: str,
    admin_ctx: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> dict:
    """BETA: promote user to driver (create driver_profile, set role=driver)."""
    if not getattr(settings, "BETA_MODE", False):
        raise HTTPException(status_code=404, detail="Not available")
    try:
        uid = uuid.UUID(user_id.strip())
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid_user_id")
    u = db.execute(select(User).where(User.id == uid)).scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="user_not_found")
    if _is_admin_phone(u.phone):
        raise HTTPException(status_code=400, detail="cannot_modify_admin")
    existing = db.execute(
        select(Driver).where(Driver.user_id == u.id)
    ).scalar_one_or_none()
    if existing:
        u.role = Role.driver
        existing.is_available = True
        record_admin_action(
            db,
            actor_user_id=admin_ctx.user_id,
            action="user_promote_driver",
            entity_type="user",
            entity_id=str(u.id),
            payload={"note": "driver_profile_existed"},
        )
        db.commit()
        return {"status": "ok", "message": "Driver already exists, role updated"}
    u.role = Role.driver
    driver = Driver(
        user_id=u.id,
        partner_id=DEFAULT_PARTNER_UUID,
        status=DriverStatus.approved,
        commission_percent=15,
    )
    db.add(driver)
    record_admin_action(
        db,
        actor_user_id=admin_ctx.user_id,
        action="user_promote_driver",
        entity_type="user",
        entity_id=str(u.id),
        payload={"created_driver_profile": True},
    )
    db.commit()
    return {"status": "ok", "message": "User promoted to driver"}


@router.post("/users/{user_id}/demote-driver")
async def demote_user_from_driver(
    user_id: str,
    admin_ctx: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> dict:
    """BETA: remove driver role (delete driver_profile, set role=passenger)."""
    if not getattr(settings, "BETA_MODE", False):
        raise HTTPException(status_code=404, detail="Not available")
    try:
        uid = uuid.UUID(user_id.strip())
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid_user_id")
    u = db.execute(select(User).where(User.id == uid)).scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="user_not_found")
    if _is_admin_phone(u.phone):
        raise HTTPException(status_code=400, detail="cannot_modify_admin")
    driver = db.execute(
        select(Driver).where(Driver.user_id == u.id)
    ).scalar_one_or_none()
    if not driver:
        u.role = Role.passenger
        record_admin_action(
            db,
            actor_user_id=admin_ctx.user_id,
            action="user_demote_driver",
            entity_type="user",
            entity_id=str(u.id),
            payload={"note": "no_driver_profile"},
        )
        db.commit()
        return {"status": "ok", "message": "Already passenger"}
    from app.models.enums import TripStatus

    has_active = (
        db.execute(
            select(Trip).where(
                Trip.driver_id == u.id,
                Trip.status.in_(
                    [TripStatus.accepted, TripStatus.arriving, TripStatus.ongoing]
                ),
            )
        ).first()
        is not None
    )
    if has_active:
        raise HTTPException(status_code=409, detail="driver_has_active_trip")
    db.delete(driver)
    u.role = Role.passenger
    record_admin_action(
        db,
        actor_user_id=admin_ctx.user_id,
        action="user_demote_driver",
        entity_type="user",
        entity_id=str(u.id),
        payload={"removed_driver_profile": True},
    )
    db.commit()
    return {"status": "ok", "message": "User demoted to passenger"}


@router.patch("/users/{user_id}")
async def update_user(
    user_id: str,
    payload: AdminUserUpdateRequest,
    admin_user: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> dict:
    """BETA: update user name (nickname) and/or phone."""
    if not getattr(settings, "BETA_MODE", False):
        raise HTTPException(status_code=404, detail="Not available")
    try:
        uid = uuid.UUID(user_id.strip())
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid_user_id")
    u = db.execute(select(User).where(User.id == uid)).scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="user_not_found")
    if _is_admin_phone(u.phone):
        raise HTTPException(status_code=400, detail="cannot_modify_admin")
    before = {
        "name": u.name,
        "phone": u.phone,
        "status": u.status.value if u.status else None,
    }
    if payload.name is not None:
        name = str(payload.name).strip()
        if len(name) < 1:
            name = u.phone
        u.name = name[:120]
    if payload.phone is not None:
        import re

        phone = str(payload.phone).strip()
        if not re.match(r"^\+351\d{9}$", phone):
            raise HTTPException(status_code=400, detail="invalid_phone_format")
        existing = db.execute(
            select(User).where(User.phone == phone, User.id != u.id)
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=409, detail="phone_already_used")
        u.phone = phone
    after = {
        "name": u.name,
        "phone": u.phone,
        "status": u.status.value if u.status else None,
    }
    record_admin_action(
        db,
        actor_user_id=admin_user.user_id,
        action="user_patch",
        entity_type="user",
        entity_id=str(u.id),
        payload={"before": before, "after": after},
    )
    db.commit()
    db.refresh(u)
    return {"status": "ok", "user_id": str(u.id)}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    admin_user: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> dict:
    """BETA: delete user. Fails if user has trips as passenger."""
    if not getattr(settings, "BETA_MODE", False):
        raise HTTPException(status_code=404, detail="Not available")
    try:
        uid = uuid.UUID(user_id.strip())
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid_user_id")
    u = db.execute(select(User).where(User.id == uid)).scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="user_not_found")
    if _is_admin_phone(u.phone):
        raise HTTPException(status_code=400, detail="cannot_delete_admin")
    has_trips = (
        db.execute(select(Trip).where(Trip.passenger_id == u.id).limit(1)).first()
        is not None
    )
    if has_trips:
        raise HTTPException(
            status_code=409,
            detail="cannot_delete_user_with_trips",
        )
    driver = db.execute(
        select(Driver).where(Driver.user_id == u.id)
    ).scalar_one_or_none()
    if driver:
        db.delete(driver)
    record_admin_action(
        db,
        actor_user_id=admin_user.user_id,
        action="user_delete",
        entity_type="user",
        entity_id=str(uid),
        payload={"phone": u.phone, "role": u.role.value},
    )
    db.delete(u)
    db.commit()
    return {"status": "ok", "message": "User deleted"}


@router.post("/users/{user_id}/block")
async def block_user(
    user_id: str,
    admin_ctx: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> dict:
    """BETA: set user status to blocked (reversible; not a hard delete)."""
    if not getattr(settings, "BETA_MODE", False):
        raise HTTPException(status_code=404, detail="Not available")
    try:
        uid = uuid.UUID(user_id.strip())
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid_user_id")
    u = db.execute(select(User).where(User.id == uid)).scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="user_not_found")
    if _is_admin_phone(u.phone):
        raise HTTPException(status_code=400, detail="cannot_modify_admin")
    if u.role == Role.admin:
        raise HTTPException(status_code=400, detail="cannot_block_admin_role")
    before_status = u.status.value if u.status else None
    u.status = UserStatus.blocked
    record_admin_action(
        db,
        actor_user_id=admin_ctx.user_id,
        action="user_block",
        entity_type="user",
        entity_id=str(u.id),
        payload={
            "before_status": before_status,
            "after_status": UserStatus.blocked.value,
            "previous_status": before_status,
        },
    )
    db.commit()
    return {"status": "ok", "message": "User blocked"}


@router.post("/users/{user_id}/unblock")
async def unblock_user(
    user_id: str,
    admin_ctx: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> dict:
    """BETA: reativar utilizador bloqueado (status → active)."""
    if not getattr(settings, "BETA_MODE", False):
        raise HTTPException(status_code=404, detail="Not available")
    try:
        uid = uuid.UUID(user_id.strip())
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid_user_id")
    u = db.execute(select(User).where(User.id == uid)).scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="user_not_found")
    if _is_admin_phone(u.phone):
        raise HTTPException(status_code=400, detail="cannot_modify_admin")
    if u.role == Role.admin:
        raise HTTPException(status_code=400, detail="cannot_unblock_admin_role")
    if u.status != UserStatus.blocked:
        raise HTTPException(status_code=400, detail="user_not_blocked")
    before_status = u.status.value if u.status else None
    u.status = UserStatus.active
    record_admin_action(
        db,
        actor_user_id=admin_ctx.user_id,
        action="user_unblock",
        entity_type="user",
        entity_id=str(u.id),
        payload={
            "before_status": before_status,
            "after_status": UserStatus.active.value,
            "previous_status": before_status,
        },
    )
    db.commit()
    return {"status": "ok", "message": "User unblocked"}


class BulkBlockUsersRequest(BaseModel):
    user_ids: list[str]
    confirmation: str


@router.post("/users/bulk-block")
async def bulk_block_users(
    payload: BulkBlockUsersRequest,
    admin_ctx: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> dict:
    """BETA: block many users. Requires confirmation matching BLOQUEAR_<count>."""
    if not getattr(settings, "BETA_MODE", False):
        raise HTTPException(status_code=404, detail="Not available")
    ids = [x.strip() for x in payload.user_ids if str(x).strip()]
    if not ids:
        raise HTTPException(status_code=400, detail="empty_user_ids")
    if len(ids) > 200:
        raise HTTPException(status_code=400, detail="too_many_user_ids")
    expected = f"BLOQUEAR_{len(ids)}"
    if payload.confirmation.strip() != expected:
        raise HTTPException(status_code=400, detail="invalid_confirmation")

    blocked = 0
    skipped = 0
    blocked_ids: list[str] = []
    for raw in ids:
        try:
            uid = uuid.UUID(raw)
        except ValueError:
            skipped += 1
            continue
        u = db.execute(select(User).where(User.id == uid)).scalar_one_or_none()
        if not u:
            skipped += 1
            continue
        if _is_admin_phone(u.phone) or u.role == Role.admin:
            skipped += 1
            continue
        u.status = UserStatus.blocked
        blocked_ids.append(str(u.id))
        blocked += 1
    record_admin_action(
        db,
        actor_user_id=admin_ctx.user_id,
        action="user_bulk_block",
        entity_type="bulk",
        entity_id="user-block",
        payload={
            "blocked_count": blocked,
            "skipped_count": skipped,
            "blocked_user_ids": blocked_ids[:200],
        },
    )
    db.commit()
    return {"status": "ok", "blocked_count": blocked, "skipped_count": skipped}


class AdminClearPasswordRequest(BaseModel):
    confirmation: str


@router.post("/users/{user_id}/password/clear")
async def admin_clear_user_password(
    user_id: str,
    payload: AdminClearPasswordRequest,
    admin_ctx: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> dict:
    """BETA: remove password_hash so the user can log in again with DEFAULT_PASSWORD (support / reset)."""
    if not getattr(settings, "BETA_MODE", False):
        raise HTTPException(status_code=404, detail="Not available")
    if payload.confirmation.strip() != "LIMPAR_SENHA":
        raise HTTPException(status_code=400, detail="invalid_confirmation")
    try:
        uid = uuid.UUID(user_id.strip())
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid_user_id")
    u = db.execute(select(User).where(User.id == uid)).scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="user_not_found")
    if _is_admin_phone(u.phone) or u.role == Role.admin:
        raise HTTPException(status_code=400, detail="cannot_modify_admin")
    had_password = u.password_hash is not None
    u.password_hash = None
    record_admin_action(
        db,
        actor_user_id=admin_ctx.user_id,
        action="user_password_clear",
        entity_type="user",
        entity_id=str(u.id),
        payload={"had_password": had_password},
    )
    db.commit()
    return {"status": "ok", "message": "password_cleared"}


@router.post("/approve-user")
async def approve_user(
    payload: ApproveUserRequest,
    user: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> dict:
    """BETA: set user status=active; if requested_role=driver, create driver_profile."""
    if not getattr(settings, "BETA_MODE", False):
        raise HTTPException(status_code=404, detail="Not available")
    phone = payload.phone.strip()
    u = db.execute(select(User).where(User.phone == phone)).scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="user_not_found")
    if u.status != UserStatus.pending:
        raise HTTPException(status_code=400, detail="user_not_pending")
    u.status = UserStatus.active
    req_role = (u.requested_role or "passenger").lower()
    if req_role == "driver":
        u.role = Role.driver
        existing = db.execute(
            select(Driver).where(Driver.user_id == u.id)
        ).scalar_one_or_none()
        if not existing:
            driver = Driver(
                user_id=u.id,
                partner_id=DEFAULT_PARTNER_UUID,
                status=DriverStatus.approved,
                commission_percent=15,
            )
            db.add(driver)
    record_admin_action(
        db,
        actor_user_id=user.user_id,
        action="user_approve",
        entity_type="user",
        entity_id=str(u.id),
        payload={
            "phone": phone,
            "requested_role": req_role,
            "role": u.role.value,
        },
    )
    db.commit()
    return {"status": "ok", "phone": phone}


@router.get("/audit-trail", response_model=list[AdminAuditTrailItem])
async def admin_audit_trail(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    entity_type: str | None = Query(None, description="Filtrar por entity_type"),
    entity_id: str | None = Query(None, description="Filtrar por entity_id"),
    _admin: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> list[AdminAuditTrailItem]:
    """Lista eventos `admin.*` persistidos em `audit_events` (SP-B)."""
    stmt = select(AuditEvent).where(AuditEvent.event_type.like("admin.%"))
    if entity_type:
        stmt = stmt.where(AuditEvent.entity_type == entity_type.strip()[:32])
    if entity_id:
        stmt = stmt.where(AuditEvent.entity_id == entity_id.strip()[:64])
    stmt = stmt.order_by(AuditEvent.occurred_at.desc()).limit(limit).offset(offset)
    rows = db.execute(stmt).scalars().all()
    return [
        AdminAuditTrailItem(
            id=str(r.id),
            event_type=r.event_type,
            entity_type=r.entity_type,
            entity_id=r.entity_id,
            occurred_at=r.occurred_at.isoformat(),
            payload=dict(r.payload) if isinstance(r.payload, dict) else {},
        )
        for r in rows
    ]


@router.get("/system-health", response_model=SystemHealthResponse)
async def system_health(
    user: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> SystemHealthResponse:
    """Detect stuck states and inconsistencies. Read-only, no side effects."""
    data = get_system_health(db)
    return SystemHealthResponse(**data)


@router.post("/drivers/{driver_id}/approve", response_model=DriverStatusResponse)
async def approve_driver(
    driver_id: str,
    user: UserContext = Depends(require_role(Role.admin)),
) -> DriverStatusResponse:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Not implemented",
    )


@router.post("/drivers/{driver_id}/reject", response_model=DriverStatusResponse)
async def reject_driver(
    driver_id: str,
    user: UserContext = Depends(require_role(Role.admin)),
) -> DriverStatusResponse:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Not implemented",
    )


@router.get("/trips/active", response_model=List[TripActiveItem])
async def list_active_trips(
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    user: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> List[TripActiveItem]:
    """List trips in requested, assigned, accepted, arriving, ongoing."""
    active_statuses = (
        TripStatus.requested,
        TripStatus.assigned,
        TripStatus.accepted,
        TripStatus.arriving,
        TripStatus.ongoing,
    )
    trips = list(
        db.execute(
            select(Trip)
            .where(Trip.status.in_(active_statuses))
            .order_by(Trip.updated_at.desc())
            .limit(limit)
            .offset(offset)
        )
        .scalars()
        .all()
    )
    return [
        TripActiveItem(
            trip_id=str(t.id),
            status=t.status,
            passenger_id=str(t.passenger_id),
            driver_id=str(t.driver_id) if t.driver_id else None,
            origin_lat=float(t.origin_lat),
            origin_lng=float(t.origin_lng),
            destination_lat=float(t.destination_lat),
            destination_lng=float(t.destination_lng),
        )
        for t in trips
    ]


@router.get("/trip-history", response_model=List[TripHistoryItem])
async def list_trip_history_admin(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> List[TripHistoryItem]:
    """Viagens em estado terminal (concluída, cancelada, falha), mais recentes primeiro.

    Path é `/admin/trip-history` (não sob `/trips/...`) para nunca colidir com `GET /admin/trips/{trip_id}`
    em versões antigas onde «history» era interpretado como UUID de viagem.
    """
    terminal_statuses = (
        TripStatus.completed,
        TripStatus.cancelled,
        TripStatus.failed,
    )
    trips = (
        db.execute(
            select(Trip)
            .options(joinedload(Trip.payment))
            .where(Trip.status.in_(terminal_statuses))
            .order_by(Trip.updated_at.desc())
            .limit(limit)
            .offset(offset)
        )
        .unique()
        .scalars()
        .all()
    )
    return [trip_to_history_item(t, include_stripe_pi=True) for t in trips]


@router.get("/trips/{trip_id}", response_model=TripDetailResponse)
async def get_trip_detail_admin(
    trip_id: str,
    user: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> TripDetailResponse:
    """Full trip detail for admin (includes stripe_payment_intent_id). Read-only."""
    trip = get_trip_by_id(db=db, trip_id=trip_id.strip())
    return trip_to_detail(trip, include_stripe_pi=True)


@router.post("/trips/{trip_id}/transition", response_model=TripStatusResponse)
async def admin_trip_transition(
    trip_id: str,
    payload: AdminTripTransitionRequest,
    admin_ctx: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> TripStatusResponse:
    """SP-A: corrigir estado com transição válida (accepted→arriving, arriving→ongoing)."""
    expected = _admin_trip_transition_confirmation_token(payload.to_status)
    if payload.confirmation.strip() != expected:
        raise HTTPException(status_code=400, detail="invalid_confirmation")
    trip = admin_apply_trip_transition(
        db=db,
        trip_id=trip_id.strip(),
        to_status=payload.to_status,
    )
    record_admin_action(
        db,
        actor_user_id=admin_ctx.user_id,
        action="trip_transition_admin",
        entity_type="trip",
        entity_id=str(trip.id),
        payload={
            "to_status": payload.to_status.value,
            "reason": payload.reason.strip()[:500],
        },
    )
    db.commit()
    return trip_to_status_response(trip, include_stripe_pi=True)


@router.post("/trips/{trip_id}/payment-ops-note")
async def admin_trip_payment_ops_note(
    trip_id: str,
    payload: AdminPaymentOpsNoteRequest,
    admin_ctx: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """SP-A: nota operacional sobre pagamento (audit); reembolso continua manual no Stripe."""
    if payload.confirmation.strip() != "REGISTAR_NOTA_PAGAMENTO":
        raise HTTPException(status_code=400, detail="invalid_confirmation")
    tid = trip_id.strip()
    trip = db.execute(select(Trip).where(Trip.id == tid)).scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="not_found")
    pay = db.execute(select(Payment).where(Payment.trip_id == trip.id)).scalar_one_or_none()
    if not pay:
        raise HTTPException(status_code=404, detail="no_payment_for_trip")
    record_admin_action(
        db,
        actor_user_id=admin_ctx.user_id,
        action="payment_ops_note",
        entity_type="payment",
        entity_id=str(pay.id),
        payload={
            "trip_id": str(trip.id),
            "note": payload.note.strip()[:2000],
            "payment_status": pay.status.value,
            "stripe_payment_intent_id": pay.stripe_payment_intent_id,
        },
    )
    db.commit()
    return {"status": "ok", "payment_id": str(pay.id)}


@router.get("/trip-debug/{trip_id}")
async def get_trip_debug(
    trip_id: str,
    user: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Debug endpoint: trip, payment, driver, passenger, interaction_logs."""
    trip = (
        db.execute(
            select(Trip)
            .options(
                joinedload(Trip.payment),
                joinedload(Trip.driver),  # type: ignore
                joinedload(Trip.passenger),  # type: ignore
            )
            .where(Trip.id == trip_id.strip())
        )
        .unique()
        .scalar_one_or_none()
    )
    if not trip:
        raise HTTPException(status_code=404, detail="not_found")

    logs = (
        db.execute(
            select(InteractionLog)
            .where(InteractionLog.trip_id == str(trip.id))
            .order_by(InteractionLog.timestamp.desc())
            .limit(20)
        )
        .scalars()
        .all()
    )

    return {
        "trip": trip_to_detail(trip, include_stripe_pi=True).model_dump(),
        "payment": (
            {
                "id": str(trip.payment.id),
                "status": trip.payment.status.value,
                "stripe_payment_intent_id": trip.payment.stripe_payment_intent_id,
                "total_amount": float(trip.payment.total_amount),
            }
            if trip.payment
            else None
        ),
        "driver": (
            {
                "driver_id": str(trip.driver.user_id),
                "is_available": trip.driver.is_available,
            }
            if trip.driver
            else None
        ),
        "passenger": (
            {
                "passenger_id": str(trip.passenger.id),
            }
            if trip.passenger
            else None
        ),
        "interaction_logs": [
            {
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                "user_id": log.user_id,
                "role": log.role,
                "action": log.action,
                "previous_state": log.previous_state,
                "new_state": log.new_state,
                "latency_ms": log.latency_ms,
                "payment_status": log.payment_status,
            }
            for log in logs
        ],
    }


@router.post("/recover-driver/{driver_id}", response_model=RecoverDriverResponse)
async def recover_driver(
    driver_id: str,
    user: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> RecoverDriverResponse:
    """Force is_available=True for stuck driver (no active trip)."""
    try:
        driver_uuid = uuid.UUID(driver_id.strip())
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid_driver_id")
    driver = db.execute(
        select(Driver).where(Driver.user_id == driver_uuid)
    ).scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="driver_not_found")
    if driver.is_available:
        return RecoverDriverResponse(driver_id=str(driver.user_id), is_available=True)

    from app.models.enums import TripStatus

    has_active = (
        db.execute(
            select(Trip).where(
                Trip.driver_id == driver.user_id,
                Trip.status.in_(
                    [TripStatus.accepted, TripStatus.arriving, TripStatus.ongoing]
                ),
            )
        ).first()
        is not None
    )
    if has_active:
        raise HTTPException(status_code=409, detail="driver_has_active_trip")

    driver.is_available = True
    record_admin_action(
        db,
        actor_user_id=user.user_id,
        action="driver_recover",
        entity_type="driver",
        entity_id=str(driver.user_id),
        payload={},
    )
    db.commit()
    db.refresh(driver)
    return RecoverDriverResponse(driver_id=str(driver.user_id), is_available=True)


@router.post("/cancel-trip/{trip_id}", response_model=TripStatusResponse)
async def cancel_trip_admin(
    trip_id: str,
    user: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
    payload: AdminCancelTripRequest | None = Body(default=None),
) -> TripStatusResponse:
    """Admin force cancel. Only for requested, assigned, accepted.

    Corpo opcional: ``confirmation`` = ``CANCELAR_VIAGEM`` e ``reason`` (≥10 chars)
    para gravar motivo em ``cancellation_reason`` (SP-A).
    """
    reason: str | None = None
    if payload is not None:
        if payload.confirmation.strip() != "CANCELAR_VIAGEM":
            raise HTTPException(status_code=400, detail="invalid_confirmation")
        reason = payload.reason.strip()
    trip = cancel_trip_by_admin(
        db=db, trip_id=trip_id.strip(), cancellation_reason=reason
    )
    record_admin_action(
        db,
        actor_user_id=user.user_id,
        action="trip_cancel_admin",
        entity_type="trip",
        entity_id=str(trip.id),
        payload={
            "status": trip.status.value if trip.status else None,
            "reason_provided": bool(reason),
        },
    )
    db.commit()
    return trip_to_status_response(trip, include_stripe_pi=True)


@router.get("/metrics", response_model=AdminMetricsResponse)
async def get_metrics(
    user: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> AdminMetricsResponse:
    """Basic operational metrics for admin dashboard."""
    data = get_admin_metrics(db)
    return AdminMetricsResponse(**data)


@router.get("/reports/weekly", response_model=list[WeeklyReportRow])
async def admin_weekly_report(
    weeks: int = Query(8, ge=1, le=26),
    user: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> list[WeeklyReportRow]:
    """H009: Weekly report (simple aggregation)."""
    # date_trunc('week') returns timestamp; we stringify for UI.
    week_col = func.date_trunc("week", Trip.created_at).label("week_start")
    created_count = func.count(Trip.id).label("trips_created")
    completed_count = func.sum(
        case((Trip.status == TripStatus.completed, 1), else_=0)
    ).label("trips_completed")
    rows = db.execute(
        select(week_col, created_count, completed_count)
        .select_from(Trip)
        .group_by(week_col)
        .order_by(week_col.desc())
        .limit(weeks)
    ).all()
    out: list[WeeklyReportRow] = []
    for w, c, done in rows:
        out.append(
            WeeklyReportRow(
                week_start=w.isoformat() if hasattr(w, "isoformat") else str(w),
                trips_created=int(c or 0),
                trips_completed=int(done or 0),
            )
        )
    return out


@router.get("/alerts", response_model=AdminAlertsResponse)
async def admin_alerts(
    user: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> AdminAlertsResponse:
    """H010: Minimum alerts for operations."""
    now = func.now()
    # today in UTC using DB now() truncated to date; acceptable for ops (simple).
    trips_today = (
        db.execute(
            select(func.count())
            .select_from(Trip)
            .where(Trip.created_at >= func.date_trunc("day", now))
        ).scalar()
        or 0
    )
    drivers_available = (
        db.execute(
            select(func.count())
            .select_from(Driver)
            .where(Driver.is_available.is_(True))
        ).scalar()
        or 0
    )
    return AdminAlertsResponse(
        zero_drivers_available=drivers_available == 0,
        zero_trips_today=trips_today == 0,
    )


@router.get("/usage-summary", response_model=AdminUsageSummaryResponse)
async def admin_usage_summary(
    user: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> AdminUsageSummaryResponse:
    """K008: Minimal business usage summary (ops-friendly)."""
    metrics = AdminMetricsResponse(**get_admin_metrics(db))
    alerts = await admin_alerts(user=user, db=db)  # reuse
    weekly = await admin_weekly_report(weeks=8, user=user, db=db)
    return AdminUsageSummaryResponse(metrics=metrics, alerts=alerts, weekly=weekly)


@router.post("/run-timeouts", response_model=RunTimeoutsResponse)
async def run_timeouts_admin(
    user: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> RunTimeoutsResponse:
    """Run trip timeout rules (assigned→requested, accepted→cancelled, ongoing→failed)."""
    counts = run_trip_timeouts(db)
    return RunTimeoutsResponse(**counts)


@router.post("/run-offer-expiry", response_model=RunOfferExpiryResponse)
async def run_offer_expiry_admin(
    user: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> RunOfferExpiryResponse:
    """Expire stale offers and redispatch trips with all offers expired."""
    expired = expire_stale_offers(db)
    new_offers = redispatch_expired_trips(db)
    return RunOfferExpiryResponse(
        expired_count=expired, redispatch_offers_created=len(new_offers)
    )


@router.get("/export-logs", response_model=None)
async def export_interaction_logs(
    user: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
    format: str | None = Query(None, alias="format"),
) -> dict | PlainTextResponse:
    """Export interaction logs. JSON por defeito; ?format=csv para CSV."""
    logs = (
        db.execute(select(InteractionLog).order_by(InteractionLog.timestamp.asc()))
        .scalars()
        .all()
    )

    if format == "csv":
        out = io.StringIO()
        w = csv.writer(out)
        w.writerow(
            [
                "timestamp",
                "user_id",
                "role",
                "action",
                "trip_id",
                "previous_state",
                "new_state",
                "latency_ms",
                "payment_status",
            ]
        )
        for log in logs:
            w.writerow(
                [
                    log.timestamp.isoformat() if log.timestamp else "",
                    log.user_id or "",
                    log.role or "",
                    log.action or "",
                    log.trip_id or "",
                    log.previous_state or "",
                    log.new_state or "",
                    log.latency_ms if log.latency_ms is not None else "",
                    log.payment_status or "",
                ]
            )
        return PlainTextResponse(
            content=out.getvalue(),
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=interaction_logs.csv"
            },
        )

    return {
        "logs": [
            {
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                "user_id": log.user_id,
                "role": log.role,
                "action": log.action,
                "trip_id": log.trip_id,
                "previous_state": log.previous_state,
                "new_state": log.new_state,
                "latency_ms": log.latency_ms,
                "payment_status": log.payment_status,
            }
            for log in logs
        ],
    }


@router.post("/trips/{trip_id}/assign", response_model=TripStatusResponse)
async def assign_trip_admin(
    trip_id: str,
    user: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> TripStatusResponse:
    tid = trip_id.strip()
    trip = assign_trip(
        db=db,
        trip_id=tid,
    )
    record_admin_action(
        db,
        actor_user_id=user.user_id,
        action="trip_assign_admin",
        entity_type="trip",
        entity_id=tid,
        payload={"status": trip.status.value if trip.status else None},
    )
    db.commit()
    return trip_to_status_response(trip, include_stripe_pi=True)


# --- Partner orgs & fleet assignment (admin-only, not public) ---


@router.post("/partners", response_model=AdminPartnerCreatedResponse)
async def admin_create_partner(
    body: AdminCreatePartnerRequest,
    user: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> AdminPartnerCreatedResponse:
    """Create a fleet org. UUID generated by DB default."""
    p = create_partner(db, body.name)
    record_admin_action(
        db,
        actor_user_id=user.user_id,
        action="partner_create",
        entity_type="partner",
        entity_id=str(p.id),
        payload={"name": p.name},
    )
    db.commit()
    return AdminPartnerCreatedResponse(
        id=str(p.id),
        name=p.name,
        created_at=p.created_at,
    )


@router.post(
    "/partners/{partner_id}/create-admin",
    response_model=AdminPartnerOrgAdminCreatedResponse,
)
async def admin_create_partner_org_admin(
    partner_id: str,
    body: AdminCreatePartnerOrgAdminRequest,
    user: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> AdminPartnerOrgAdminCreatedResponse:
    """Provision a fleet manager (role=partner). Not available via public auth signup."""
    try:
        pid = uuid.UUID(partner_id.strip())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_uuid",
        )
    u = create_partner_org_admin(
        db,
        partner_id=pid,
        name=body.name,
        phone=body.phone,
    )
    record_admin_action(
        db,
        actor_user_id=user.user_id,
        action="partner_org_admin_create",
        entity_type="user",
        entity_id=str(u.id),
        payload={"partner_id": str(pid), "phone": u.phone},
    )
    db.commit()
    return AdminPartnerOrgAdminCreatedResponse(
        user_id=str(u.id),
        role=u.role.value,
        partner_id=str(pid),
        phone=u.phone,
        name=u.name,
    )


@router.post(
    "/drivers/{driver_user_id}/assign-partner",
    response_model=AdminAssignPartnerResponse,
)
async def admin_assign_driver_partner(
    driver_user_id: str,
    body: AdminAssignPartnerRequest,
    user: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> AdminAssignPartnerResponse:
    """Set driver.partner_id. Blocked if driver has an active trip (assigned→ongoing)."""
    try:
        did = uuid.UUID(driver_user_id.strip())
        pid = uuid.UUID(body.partner_id.strip())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_uuid",
        )
    d = assign_driver_to_partner(db, driver_user_id=did, partner_id=pid)
    record_admin_action(
        db,
        actor_user_id=user.user_id,
        action="driver_assign_partner",
        entity_type="driver",
        entity_id=str(d.user_id),
        payload={"partner_id": str(d.partner_id)},
    )
    db.commit()
    return AdminAssignPartnerResponse(
        user_id=str(d.user_id),
        partner_id=str(d.partner_id),
    )


@router.delete(
    "/drivers/{driver_user_id}/assign-partner",
    response_model=AdminAssignPartnerResponse,
)
async def admin_unassign_driver_partner(
    driver_user_id: str,
    user: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> AdminAssignPartnerResponse:
    """Return driver to default fleet (DEFAULT_PARTNER_UUID). Idempotent; 409 if active trip."""
    try:
        did = uuid.UUID(driver_user_id.strip())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_uuid",
        )
    d = unassign_driver_from_partner(db, driver_user_id=did)
    record_admin_action(
        db,
        actor_user_id=user.user_id,
        action="driver_unassign_partner",
        entity_type="driver",
        entity_id=str(d.user_id),
        payload={"partner_id": str(d.partner_id)},
    )
    db.commit()
    return AdminAssignPartnerResponse(
        user_id=str(d.user_id),
        partner_id=str(d.partner_id),
    )
