"""Best-effort persistence of payment anomalies (PR1 — flag-gated)."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import ProgrammingError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.payment_anomaly import PaymentAnomaly
from app.utils.logging import log_event

logger = logging.getLogger(__name__)

_PG_UNDEFINED_TABLE = "42P01"

ANOMALY_WEBHOOK_PAYMENT_NOT_FOUND = "webhook_payment_not_found"
ANOMALY_WEBHOOK_SUCCEEDED_AMOUNT_MISMATCH = "webhook_succeeded_amount_mismatch"
ANOMALY_WEBHOOK_DB_ERROR = "webhook_db_error"

SEVERITY_CRITICAL = "critical"
SEVERITY_WARNING = "warning"
SEVERITY_INFO = "info"

PAYMENT_WEBHOOK_ANOMALY_WINDOW_HOURS = 24
PAYMENT_WEBHOOK_ANOMALY_RECENT_LIMIT = 20

_SAFE_PAYLOAD_KEYS = frozenset(
    {
        "ack",
        "note",
        "reason",
        "stripe_amount_cents",
        "expected_amount_cents",
        "stripe_currency",
        "expected_currency",
        "payment_status",
    }
)


def _payment_anomalies_table_missing(exc: BaseException) -> bool:
    """True only when PostgreSQL reports the payment_anomalies relation is absent."""
    orig = getattr(exc, "orig", None)
    if orig is not None:
        pgcode = getattr(orig, "pgcode", None) or getattr(orig, "sqlstate", None)
        if pgcode == _PG_UNDEFINED_TABLE:
            return True
    msg = str(exc).lower()
    return "payment_anomalies" in msg and (
        "does not exist" in msg or "undefined table" in msg
    )


def _empty_webhook_anomalies_summary(
    persist_enabled: bool, *, data_available: bool
) -> dict[str, Any]:
    return {
        "persist_enabled": persist_enabled,
        "data_available": data_available,
        "window_hours": PAYMENT_WEBHOOK_ANOMALY_WINDOW_HOURS,
        "total_in_window": 0,
        "counts_by_type": [],
        "counts_by_severity": {},
        "recent": [],
    }


def _safe_payload_for_api(payload: object) -> dict[str, Any]:
    if not isinstance(payload, dict):
        return {}
    out: dict[str, Any] = {}
    for key in _SAFE_PAYLOAD_KEYS:
        if key in payload:
            out[key] = payload[key]
    return out


def _serialize_recent_anomaly(row: PaymentAnomaly) -> dict[str, Any]:
    return {
        "id": str(row.id),
        "anomaly_type": row.anomaly_type,
        "severity": row.severity,
        "created_at": row.created_at.isoformat() if row.created_at else "",
        "payment_intent_id": row.payment_intent_id,
        "trip_id": str(row.trip_id) if row.trip_id else None,
        "payment_id": str(row.payment_id) if row.payment_id else None,
        "event_type": row.event_type,
        "stripe_event_id": row.stripe_event_id,
        "environment": row.environment,
        "stripe_mode": row.stripe_mode,
        "payload": _safe_payload_for_api(row.payload_json),
    }


def get_payment_webhook_anomalies_health_summary(db: Session) -> dict[str, Any]:
    """
    Read-only aggregation for Admin system-health (PR2).
    Does not mutate state; safe to call on every health poll.
    """
    persist_enabled = bool(getattr(settings, "ENABLE_PAYMENT_ANOMALY_PERSIST", False))
    cutoff = datetime.now(timezone.utc) - timedelta(
        hours=PAYMENT_WEBHOOK_ANOMALY_WINDOW_HOURS
    )
    try:
        type_rows = db.execute(
            select(PaymentAnomaly.anomaly_type, func.count())
            .where(PaymentAnomaly.created_at >= cutoff)
            .group_by(PaymentAnomaly.anomaly_type)
            .order_by(PaymentAnomaly.anomaly_type.asc())
        ).all()
        severity_rows = db.execute(
            select(PaymentAnomaly.severity, func.count())
            .where(PaymentAnomaly.created_at >= cutoff)
            .group_by(PaymentAnomaly.severity)
        ).all()
        recent_rows = (
            db.execute(
                select(PaymentAnomaly)
                .where(PaymentAnomaly.created_at >= cutoff)
                .order_by(PaymentAnomaly.created_at.desc())
                .limit(PAYMENT_WEBHOOK_ANOMALY_RECENT_LIMIT)
            )
            .scalars()
            .all()
        )
    except ProgrammingError as exc:
        if not _payment_anomalies_table_missing(exc):
            raise
        log_event(
            "payment_webhook_anomalies_health_read_failed",
            reason="payment_anomalies_table_missing",
            hint="partial_deployment_run_alembic_upgrade",
        )
        logger.warning(
            "payment_webhook_anomalies health: payment_anomalies table missing",
            exc_info=True,
        )
        db.rollback()
        return _empty_webhook_anomalies_summary(persist_enabled, data_available=False)

    counts_by_type = [
        {"anomaly_type": str(t), "count": int(c)} for t, c in type_rows
    ]
    counts_by_severity = {str(s): int(c) for s, c in severity_rows}
    total = sum(int(c) for _, c in type_rows)
    return {
        "persist_enabled": persist_enabled,
        "data_available": True,
        "window_hours": PAYMENT_WEBHOOK_ANOMALY_WINDOW_HOURS,
        "total_in_window": total,
        "counts_by_type": counts_by_type,
        "counts_by_severity": counts_by_severity,
        "recent": [_serialize_recent_anomaly(r) for r in recent_rows],
    }


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
