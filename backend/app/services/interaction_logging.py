"""Interaction logging — telemetria comportamental mínima. Observação passiva.

L-SEC-15: writes use an independent ``SessionLocal`` so caller request Sessions
are never committed or rolled back by this helper.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.db.models.interaction_log import InteractionLog
from app.db.session import SessionLocal

logger = logging.getLogger(__name__)


def log_interaction(
    *,
    db: Session,
    user_id: str,
    role: str,
    action: str,
    trip_id: str | None = None,
    previous_state: str | None = None,
    new_state: str | None = None,
    latency_ms: int | None = None,
    payment_status: str | None = None,
) -> None:
    """Regista evento de interação. Falha silenciosa — nunca bloqueia a TX principal.

    ``db`` is kept only for call-site signature compatibility (8 callers). It is
    **not** used for add/commit/rollback — deprecated for writes; remove in a
    later cleanup PR.
    """
    _ = db  # unused — do not touch caller Session (L-SEC-15)
    try:
        with SessionLocal() as log_db:
            entry = InteractionLog(
                timestamp=datetime.now(timezone.utc),
                user_id=str(user_id),
                role=role,
                action=action,
                trip_id=str(trip_id) if trip_id else None,
                previous_state=previous_state,
                new_state=new_state,
                latency_ms=latency_ms,
                payment_status=payment_status,
            )
            log_db.add(entry)
            log_db.commit()
    except Exception as e:
        logger.warning("InteractionLog failed (non-blocking): %s", e)
        # Own session already closed / rolled back by context manager on error;
        # never call rollback on the caller's Session.
