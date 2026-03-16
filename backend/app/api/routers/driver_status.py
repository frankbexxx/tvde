"""Driver availability status: online/offline."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_db, require_role
from app.db.models.driver import Driver
from app.models.enums import Role


router = APIRouter(prefix="/driver/status", tags=["driver"])


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
    driver.is_available = True
    db.commit()
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
