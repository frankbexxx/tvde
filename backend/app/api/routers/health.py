from fastapi import APIRouter

from app.core.config import settings


router = APIRouter(tags=["health"])


@router.get("/")
async def root() -> dict:
    """Root — usado por load balancers (ex: Render) para health check."""
    return {"status": "ok"}


@router.get("/health")
async def health_check(diagnostic: bool = False) -> dict:
    """Health check. diagnostic=1 adds config hints for simulator/tools."""
    out = {"status": "ok"}
    if diagnostic:
        from app.core.config import settings
        out["dev_tools"] = getattr(settings, "ENABLE_DEV_TOOLS", False) or getattr(settings, "ENV", "") == "dev"
        out["beta_mode"] = getattr(settings, "BETA_MODE", False)
    return out


@router.get("/config")
async def config() -> dict:
    """Public config for frontend (e.g. BETA mode)."""
    return {"beta_mode": getattr(settings, "BETA_MODE", False)}

