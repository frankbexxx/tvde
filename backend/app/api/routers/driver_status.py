"""Driver availability status: online/offline."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_db, require_role
from app.db.models.driver import Driver
from app.models.enums import Role
from app.services.driver_documents import driver_documents_gate_allows
from app.schemas.driving_compliance import DrivingHoursComplianceResponse
from app.services.driving_compliance import (
    driver_compliance_snapshot,
)
from app.services.trips import driver_has_active_assigned_trip


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
    driver = db.execute(
        select(Driver).where(Driver.user_id == user.user_id)
    ).scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="driver_not_found")
    if driver_has_active_assigned_trip(db=db, driver_user_id=str(user.user_id)):
        db.refresh(driver)
        return {"status": "online", "is_available": driver.is_available}
    if not driver_documents_gate_allows(driver.documents):
        driver.is_available = False
        db.commit()
        db.refresh(driver)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="driver_documents_not_ready",
        )
    snap = driver_compliance_snapshot(db, user.user_id)
    if snap["enabled"] and snap["blocked_accept"]:
        driver.is_available = False
        db.commit()
        db.refresh(driver)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="driving_hours_blocked",
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
