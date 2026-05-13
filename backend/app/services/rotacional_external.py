"""Fetch external JSON feed and persist into rotacional_external_cache."""

from __future__ import annotations

import json
import logging

import httpx
from sqlalchemy.orm import Session

from app.db.models.rotacional_external_cache import CACHE_ROW_ID, RotacionalExternalCache
from app.services.rotacional_feed import (
    RotacionalItem,
    items_to_public_dicts,
    parse_items_from_json_body,
)

logger = logging.getLogger(__name__)


def refresh_rotacional_external_cache(db: Session, *, url: str, timeout_sec: float) -> int:
    """GET url (JSON array of items), validate, store. Returns number of items stored (0 on skip/error)."""
    u = (url or "").strip()
    if not u:
        return 0
    try:
        with httpx.Client(timeout=timeout_sec) as client:
            r = client.get(u)
            r.raise_for_status()
            body = r.text
    except Exception as e:
        logger.warning("rotacional v3 fetch failed: %s", e)
        return 0

    items = parse_items_from_json_body(body)
    if not items:
        return 0

    payload = json.dumps(items_to_public_dicts(items), ensure_ascii=False)
    row = db.get(RotacionalExternalCache, CACHE_ROW_ID)
    if row is None:
        row = RotacionalExternalCache(id=CACHE_ROW_ID, items_json=payload)
        db.add(row)
    else:
        row.items_json = payload
    db.commit()
    return len(items)


def load_cached_rotacional_item_list(db: Session) -> list[RotacionalItem]:
    row = db.get(RotacionalExternalCache, CACHE_ROW_ID)
    if row is None or not (row.items_json or "").strip():
        return []
    return parse_items_from_json_body(row.items_json)
