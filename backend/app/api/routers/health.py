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


@router.api_route("/", methods=["GET", "HEAD"])
async def root() -> dict:
    """Root — usado por load balancers (ex: Render) para health check.

    Aceita HEAD para compatibilidade com monitores (UptimeRobot free tier só envia HEAD).
    """
    return {"status": "ok"}


@router.api_route("/health", methods=["GET", "HEAD"])
async def health_check(diagnostic: bool = False) -> dict[str, str | bool]:
    """Health check. diagnostic=1 adds config hints for simulator/tools.

    Aceita GET e HEAD. Monitores externos (UptimeRobot free tier) enviam HEAD
    por defeito; o FastAPI executa o mesmo handler e responde sem body.
    """
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
    beta = bool(getattr(settings, "BETA_MODE", False))
    g_id = (getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", None) or "").strip()
    g_sec = (getattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", None) or "").strip()
    google_ready = bool(g_id and g_sec)
    out: dict[str, str | bool] = {"beta_mode": beta}
    if beta and google_ready:
        out["google_oauth_enabled"] = True
        out["google_oauth_client_id"] = g_id
    else:
        out["google_oauth_enabled"] = False
    return out
