"""Driver availability status: online/offline."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_db, require_role
from app.db.models.driver import Driver
from app.models.enums import Role
from app.schemas.driving_compliance import DrivingHoursComplianceResponse
from app.services.driving_compliance import (
    driver_compliance_snapshot,
)
from app.services.trips import driver_has_active_assigned_trip
from app.services.vehicle_compliance_gate import (
    evaluate_driver_vehicle_compliance_gate,
)


router = APIRouter(prefix="/driver/status", tags=["driver"])


@router.get("")
async def get_availability_status(
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> dict:
    """Current driver availability flag (for FE sync with local offline state)."""
    driver = db.execute(
        select(Driver).where(Driver.user_id == user.user_id)
    ).scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="driver_not_found")
    return {"is_available": driver.is_available}


@router.get("/compliance/driving-hours", response_model=DrivingHoursComplianceResponse)
async def get_driving_hours_compliance(
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> DrivingHoursComplianceResponse:
    """Tempo de condução activa hoje (Europe/Lisbon) e estado de bloqueio/aviso."""
    snap = driver_compliance_snapshot(db, user.user_id)
    return DrivingHoursComplianceResponse(
        enabled=snap["enabled"],
        active_seconds_today=snap["active_seconds_today"],
        max_seconds=snap["max_seconds"],
        warning_threshold_seconds=snap["warning_threshold_seconds"],
        warning=snap["warning"],
        blocked=snap["blocked_accept"],
        rest_until=snap["rest_until"],
    )


@router.post("/online", status_code=status.HTTP_200_OK)
async def go_online(
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> dict:
    """Set driver available to receive trip offers."""
    # Lock Driver before active-trip check/write so a concurrent accept cannot
    # commit is_available=False + live trip and then lose to a stale go_online
    # UPDATE that restores availability (multi-tab/double-submit TOCTOU).
    driver = db.execute(
        select(Driver)
        .where(Driver.user_id == user.user_id)
        .with_for_update(of=Driver)
    ).scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="driver_not_found")
    if driver_has_active_assigned_trip(db=db, driver_user_id=str(user.user_id)):
        return {"status": "online", "is_available": driver.is_available}
    snap = driver_compliance_snapshot(db, user.user_id)
    if snap["enabled"] and snap["blocked_accept"]:
        driver.is_available = False
        db.commit()
        db.refresh(driver)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="driving_hours_blocked",
        )
    gate = evaluate_driver_vehicle_compliance_gate(db, driver)
    if not gate.allowed:
        driver.is_available = False
        db.commit()
        db.refresh(driver)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=gate.code,
        )
    driver.is_available = True
    db.commit()
    db.refresh(driver)
    return {"status": "online", "is_available": True}


@router.post("/offline", status_code=status.HTTP_200_OK)
async def go_offline(
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> dict:
    """Set driver unavailable (cannot receive trip offers)."""
    driver = db.execute(
        select(Driver).where(Driver.user_id == user.user_id)
    ).scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="driver_not_found")
    driver.is_available = False
    db.commit()
    return {"status": "offline", "is_available": False}
