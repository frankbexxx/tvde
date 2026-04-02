import csv
import io
import uuid
from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.api.deps import UserContext, get_db, require_role
from app.core.config import settings
from app.db.models.driver import Driver
from app.db.models.interaction_log import InteractionLog
from app.db.models.user import User
from app.db.models.trip import Trip
from app.models.enums import DriverStatus, Role, TripStatus, UserStatus
from app.schemas.driver import DriverStatusResponse
from app.schemas.system_health import (
    AdminMetricsResponse,
    RecoverDriverResponse,
    RunOfferExpiryResponse,
    RunTimeoutsResponse,
    SystemHealthResponse,
)
from app.api.serializers import trip_to_detail, trip_to_status_response
from app.schemas.trip import TripActiveItem, TripDetailResponse, TripStatusResponse
from app.services.admin_metrics import get_admin_metrics
from app.services.system_health import get_system_health
from app.services.offer_dispatch import expire_stale_offers, redispatch_expired_trips
from app.services.trip_timeouts import run_trip_timeouts
from app.services.trips import assign_trip, cancel_trip_by_admin, get_trip_by_id


router = APIRouter(prefix="/admin", tags=["admin"])


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


def _is_admin_phone(phone: str) -> bool:
    admin_phone = getattr(settings, "ADMIN_PHONE", None)
    if not admin_phone:
        return False
    return admin_phone.strip() == phone.strip()


@router.post("/users/{user_id}/promote-driver")
async def promote_user_to_driver(
    user_id: str,
    user: UserContext = Depends(require_role(Role.admin)),
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
        db.commit()
        return {"status": "ok", "message": "Driver already exists, role updated"}
    u.role = Role.driver
    driver = Driver(
        user_id=u.id,
        status=DriverStatus.approved,
        commission_percent=15,
    )
    db.add(driver)
    db.commit()
    return {"status": "ok", "message": "User promoted to driver"}


@router.post("/users/{user_id}/demote-driver")
async def demote_user_from_driver(
    user_id: str,
    user: UserContext = Depends(require_role(Role.admin)),
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
    db.delete(u)
    db.commit()
    return {"status": "ok", "message": "User deleted"}


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
                status=DriverStatus.approved,
                commission_percent=15,
            )
            db.add(driver)
    db.commit()
    return {"status": "ok", "phone": phone}


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


@router.get("/trips/{trip_id}", response_model=TripDetailResponse)
async def get_trip_detail_admin(
    trip_id: str,
    user: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> TripDetailResponse:
    """Full trip detail for admin (includes stripe_payment_intent_id). Read-only."""
    trip = get_trip_by_id(db=db, trip_id=trip_id.strip())
    return trip_to_detail(trip, include_stripe_pi=True)


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
        "payment": {
            "id": str(trip.payment.id),
            "status": trip.payment.status.value,
            "stripe_payment_intent_id": trip.payment.stripe_payment_intent_id,
            "total_amount": float(trip.payment.total_amount),
        }
        if trip.payment
        else None,
        "driver": {
            "driver_id": str(trip.driver.user_id),
            "is_available": trip.driver.is_available,
        }
        if trip.driver
        else None,
        "passenger": {
            "passenger_id": str(trip.passenger.id),
        }
        if trip.passenger
        else None,
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
    db.commit()
    db.refresh(driver)
    return RecoverDriverResponse(driver_id=str(driver.user_id), is_available=True)


@router.post("/cancel-trip/{trip_id}", response_model=TripStatusResponse)
async def cancel_trip_admin(
    trip_id: str,
    user: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> TripStatusResponse:
    """Admin force cancel. Only for requested, assigned, accepted."""
    trip = cancel_trip_by_admin(db=db, trip_id=trip_id.strip())
    return trip_to_status_response(trip, include_stripe_pi=True)


@router.get("/metrics", response_model=AdminMetricsResponse)
async def get_metrics(
    user: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> AdminMetricsResponse:
    """Basic operational metrics for admin dashboard."""
    data = get_admin_metrics(db)
    return AdminMetricsResponse(**data)


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
    trip = assign_trip(
        db=db,
        trip_id=trip_id.strip(),
    )
    return trip_to_status_response(trip, include_stripe_pi=True)
