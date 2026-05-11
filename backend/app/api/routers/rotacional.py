"""Mensagens públicas para a linha rotativa do cabeçalho (v2: feed configurável em env)."""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter
from pydantic import BaseModel, Field, ValidationError

from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rotacional", tags=["public"])

_MAX_ITEMS = 24
_MAX_TEXT = 280
_MAX_SOURCE = 48


class RotacionalItem(BaseModel):
    text: str = Field(..., max_length=_MAX_TEXT)
    source: str = Field(default="interno", max_length=_MAX_SOURCE)


class RotacionalMessagesResponse(BaseModel):
    items: list[RotacionalItem]


def _coerce_rotacional_item(entry: object) -> RotacionalItem | None:
    if isinstance(entry, str):
        try:
            return RotacionalItem(text=entry[:_MAX_TEXT], source="interno")
        except ValidationError:
            return None
    if isinstance(entry, dict) and entry.get("text") is not None:
        try:
            text = str(entry["text"]).strip()[:_MAX_TEXT]
            if not text:
                return None
            src = str(entry.get("source", "interno")).strip()[:_MAX_SOURCE] or "interno"
            return RotacionalItem(text=text, source=src)
        except ValidationError:
            return None
    return None


def _parse_rotacional_feed() -> list[RotacionalItem]:
    raw = (getattr(settings, "ROTACIONAL_FEED_JSON", None) or "").strip()
    if not raw:
        return []
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("ROTACIONAL_FEED_JSON inválido — ignorado")
        return []
    if not isinstance(data, list):
        return []
    out: list[RotacionalItem] = []
    for x in data[:_MAX_ITEMS]:
        item = _coerce_rotacional_item(x)
        if item is not None:
            out.append(item)
    return out


@router.get("/messages", response_model=RotacionalMessagesResponse)
async def get_rotacional_messages() -> RotacionalMessagesResponse:
    """Lista de mensagens em tempo real (curadoria ou futura agregação server-side).

    Sem auth — apenas copy operacional; não expor dados pessoais.
    """
    return RotacionalMessagesResponse(items=_parse_rotacional_feed())
