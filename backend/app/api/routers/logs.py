"""Lifecycle logging — app_start, dormancy_enter, dormancy_exit for timing analysis."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_db, get_optional_user
from app.services.interaction_logging import log_interaction

router = APIRouter(prefix="/logs", tags=["logs"])


class LogLifecycleRequest(BaseModel):
    action: str  # app_start | dormancy_enter | dormancy_exit


@router.post("/lifecycle")
async def log_lifecycle(
    body: LogLifecycleRequest,
    user: UserContext | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> dict:
    """Regista eventos de ciclo de vida da app (arranque, dormência, acordar). Auth opcional."""
    if body.action not in ("app_start", "dormancy_enter", "dormancy_exit"):
        return {"status": "ignored", "reason": "unknown_action"}

    user_id = user.user_id if user else "anonymous"
    role = user.role.value if user else "passenger"

    log_interaction(
        db=db,
        user_id=user_id,
        role=role,
        action=body.action,
        trip_id=None,
        previous_state=None,
        new_state=None,
        latency_ms=None,
        payment_status=None,
    )
    return {"status": "ok"}
