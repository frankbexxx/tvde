"""Mensagens públicas para o linha rotativa do cabeçalho (v2: env + v3: cache HTTP)."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.services.rotacional_external import load_cached_rotacional_item_list
from app.services.rotacional_feed import (
    RotacionalItem,
    merge_rotacional_items,
    parse_rotacional_feed_json,
)

router = APIRouter(prefix="/rotacional", tags=["public"])


class RotacionalMessagesResponse(BaseModel):
    items: list[RotacionalItem]


@router.get("/messages", response_model=RotacionalMessagesResponse)
async def get_rotacional_messages(db: Session = Depends(get_db)) -> RotacionalMessagesResponse:
    """Lista para o marquee — env estático + itens em cache (v3, opcional)."""
    env_items = parse_rotacional_feed_json(getattr(settings, "ROTACIONAL_FEED_JSON", None))
    cached = load_cached_rotacional_item_list(db)
    merged = merge_rotacional_items(env_items, cached)
    return RotacionalMessagesResponse(items=merged)
