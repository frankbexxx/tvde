"""Parse and merge rotacional header items (env JSON + external cache)."""

from __future__ import annotations

import json
import logging
from typing import Any

from pydantic import BaseModel, Field, ValidationError

logger = logging.getLogger(__name__)

_MAX_ITEMS = 24
_MAX_TEXT = 280
_MAX_SOURCE = 48


class RotacionalItem(BaseModel):
    text: str = Field(..., max_length=_MAX_TEXT)
    source: str = Field(default="interno", max_length=_MAX_SOURCE)


def coerce_rotacional_item(entry: object) -> RotacionalItem | None:
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


def parse_rotacional_feed_json(raw: str | None) -> list[RotacionalItem]:
    r = (raw or "").strip()
    if not r:
        return []
    try:
        data = json.loads(r)
    except json.JSONDecodeError:
        logger.warning("ROTACIONAL_FEED_JSON inválido — ignorado")
        return []
    if not isinstance(data, list):
        return []
    out: list[RotacionalItem] = []
    for x in data[:_MAX_ITEMS]:
        item = coerce_rotacional_item(x)
        if item is not None:
            out.append(item)
    return out


def parse_items_from_json_body(raw: str) -> list[RotacionalItem]:
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return []
    if not isinstance(data, list):
        return []
    out: list[RotacionalItem] = []
    for x in data[:_MAX_ITEMS]:
        item = coerce_rotacional_item(x)
        if item is not None:
            out.append(item)
    return out


def merge_rotacional_items(
    env_items: list[RotacionalItem], cache_items: list[RotacionalItem]
) -> list[RotacionalItem]:
    """Env first; then cache lines whose text is not already present (case-fold)."""
    seen: set[str] = set()
    merged: list[RotacionalItem] = []
    for it in env_items:
        key = it.text.casefold()
        if key in seen:
            continue
        seen.add(key)
        merged.append(it)
        if len(merged) >= _MAX_ITEMS:
            return merged
    for it in cache_items:
        key = it.text.casefold()
        if key in seen:
            continue
        seen.add(key)
        merged.append(it)
        if len(merged) >= _MAX_ITEMS:
            break
    return merged


def items_to_public_dicts(items: list[RotacionalItem]) -> list[dict[str, Any]]:
    return [{"text": i.text, "source": i.source} for i in items]
