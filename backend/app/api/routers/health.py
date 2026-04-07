import logging

import anyio
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import text

from app.core.config import settings
from app.db.session import engine


router = APIRouter(tags=["health"])
logger = logging.getLogger(__name__)


def _db_ping() -> None:
    # Keep it extremely lightweight: connect + SELECT 1.
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))


@router.get("/")
async def root() -> dict:
    """Root — usado por load balancers (ex: Render) para health check."""
    return {"status": "ok"}


@router.get("/health")
async def health_check(diagnostic: bool = False) -> dict[str, str | bool]:
    """Health check. diagnostic=1 adds config hints for simulator/tools."""
    try:
        await anyio.to_thread.run_sync(_db_ping)
    except Exception:
        logger.warning("health_check db_ping failed", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"status": "error"},
        )
    out: dict[str, str | bool] = {"status": "ok"}
    if diagnostic:
        from app.core.config import settings

        out["dev_tools"] = settings.dev_tools_router_enabled()
        out["beta_mode"] = bool(getattr(settings, "BETA_MODE", False))
    return out


@router.get("/config")
async def config() -> dict[str, str | bool]:
    """Public config for frontend (e.g. BETA mode)."""
    return {"beta_mode": bool(getattr(settings, "BETA_MODE", False))}
