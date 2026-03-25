"""Interaction logging — telemetria comportamental mínima. Observação passiva."""

import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.db.models.interaction_log import InteractionLog

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
    """Regista evento de interação. Falha silenciosa — nunca bloqueia a transação principal."""
    try:
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
        db.add(entry)
        db.commit()
    except Exception as e:
        logger.warning("InteractionLog failed (non-blocking): %s", e)
        try:
            db.rollback()
        except Exception as rb_err:
            logger.debug("InteractionLog rollback failed: %s", rb_err)
