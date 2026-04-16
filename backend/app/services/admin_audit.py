"""Auditoria de acções administrativas (SP-B).

Reutiliza a tabela `audit_events`: eventos de domínio (ex. mudança de estado de viagem)
usam `event_type` livre; acções admin usam prefixo `admin.` no `event_type`.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.db.models.audit_event import AuditEvent


def _json_safe(value: Any) -> Any:
    """Garante serialização JSONB (datetimes, enums, UUIDs)."""
    try:
        return json.loads(json.dumps(value, default=str))
    except (TypeError, ValueError):
        return {"_repr": str(value)}


def record_admin_action(
    db: Session,
    *,
    actor_user_id: str,
    action: str,
    entity_type: str,
    entity_id: str,
    payload: dict[str, Any] | None = None,
) -> None:
    """Regista uma acção admin (append-only). Não faz commit."""
    key = (action or "").strip().lower().replace(" ", "_")
    if not key:
        key = "unknown"
    pl = _json_safe(dict(payload or {}))
    pl["actor_user_id"] = str(actor_user_id)
    et = entity_type.strip()[:32] or "unknown"
    eid = str(entity_id).strip()[:64] or "unknown"
    row = AuditEvent(
        event_type=f"admin.{key}",
        entity_type=et,
        entity_id=eid,
        payload=pl,
        occurred_at=datetime.now(timezone.utc),
    )
    db.add(row)
