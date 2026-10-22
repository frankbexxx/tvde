"""Best-effort persistence of payment anomalies (PR1 — flag-gated)."""

from __future__ import annotations

import logging
import uuid
from typing import Any

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.payment_anomaly import PaymentAnomaly

logger = logging.getLogger(__name__)

ANOMALY_WEBHOOK_PAYMENT_NOT_FOUND = "webhook_payment_not_found"
ANOMALY_WEBHOOK_SUCCEEDED_AMOUNT_MISMATCH = "webhook_succeeded_amount_mismatch"
ANOMALY_WEBHOOK_DB_ERROR = "webhook_db_error"

SEVERITY_CRITICAL = "critical"
SEVERITY_WARNING = "warning"
SEVERITY_INFO = "info"


def resolve_environment_label() -> str:
    if settings.is_test_environment():
        return "test"
    if settings.is_production_environment():
        return "production"
    if settings.is_staging_environment():
        return "staging"
    if settings.is_development_environment():
        return "local"
    return "unknown"


def resolve_stripe_mode() -> str:
    if bool(settings.STRIPE_MOCK):
        return "mock"
    key = (settings.STRIPE_SECRET_KEY or "").strip()
    if key.startswith("sk_live"):
        return "live"
    if key.startswith("sk_test"):
        return "test"
    return "unknown"


def record_payment_anomaly(
    db: Session,
    *,
    anomaly_type: str,
    severity: str,
    stripe_event_id: str | None = None,
    payment_intent_id: str | None = None,
    payment_id: uuid.UUID | None = None,
    trip_id: uuid.UUID | None = None,
    event_type: str | None = None,
    payload_json: dict[str, Any] | None = None,
) -> bool:
    """
    Insert anomaly row when ENABLE_PAYMENT_ANOMALY_PERSIST is true.

    Idempotent on (anomaly_type, stripe_event_id) when stripe_event_id is set.
    Never raises — failures are logged so webhook financial path can still commit.
    """
    if not bool(getattr(settings, "ENABLE_PAYMENT_ANOMALY_PERSIST", False)):
        return False

    evt = (stripe_event_id or "").strip() or None
    payload = dict(payload_json or {})
    # Defensive: never persist webhook signing material or card data keys.
    for forbidden in ("client_secret", "secret", "pan", "cvc", "whsec_"):
        payload.pop(forbidden, None)

    try:
        values: dict[str, Any] = {
            "id": uuid.uuid4(),
            "anomaly_type": anomaly_type,
            "severity": severity,
            "stripe_event_id": evt,
            "payment_intent_id": (payment_intent_id or "").strip() or None,
            "payment_id": payment_id,
            "trip_id": trip_id,
            "event_type": (event_type or "").strip() or None,
            "payload_json": payload,
            "environment": resolve_environment_label(),
            "stripe_mode": resolve_stripe_mode(),
        }
        stmt = insert(PaymentAnomaly).values(**values)
        if evt:
            stmt = stmt.on_conflict_do_nothing(
                constraint="uq_payment_anomalies_type_stripe_event_id",
            )
        # SAVEPOINT: a failed INSERT must not abort the outer txn (evt_* marker + commit).
        with db.begin_nested():
            db.execute(stmt)
        return True
    except SQLAlchemyError:
        logger.exception(
            "payment_anomaly persist failed type=%s evt=%s pi=%s",
            anomaly_type,
            evt or "-",
            payment_intent_id or "-",
        )
        return False
    except Exception:
        logger.exception(
            "payment_anomaly persist unexpected error type=%s evt=%s",
            anomaly_type,
            evt or "-",
        )
        return False
