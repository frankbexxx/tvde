from fastapi import APIRouter

from app.core.config import settings


router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check() -> dict:
    return {"status": "ok"}


@router.get("/config")
async def config() -> dict:
    """Public config for frontend (e.g. BETA mode)."""
    return {"beta_mode": getattr(settings, "BETA_MODE", False)}

