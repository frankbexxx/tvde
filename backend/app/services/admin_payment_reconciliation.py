"""
Reconciliação operacional: viagens `completed` com pagamento `processing` (legado / testes / webhook falhado).

SP-F: só invocado a partir de rotas `super_admin` + `governance_reason` + auditoria.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.payment import Payment
from app.db.models.trip import Trip
from app.models.enums import PaymentStatus, TripStatus
from app.services.admin_audit import record_admin_action
from app.services.stripe_service import retrieve_payment_intent

logger = logging.getLogger(__name__)


def sql_select_completed_processing(limit: int = 200) -> str:
    """SQL read-only para operadores copiarem (PostgreSQL)."""
    lim = max(1, min(int(limit), 500))
    return (
        "SELECT t.id AS trip_id, p.id AS payment_id, p.stripe_payment_intent_id, "
        "p.status AS payment_status, t.status AS trip_status, "
        "t.completed_at, p.updated_at AS payment_updated_at\n"
        "FROM trips t\n"
        "INNER JOIN payments p ON p.trip_id = t.id\n"
        f"WHERE t.status = 'completed' AND p.status = 'processing'\n"
        f"ORDER BY p.updated_at ASC\n"
        f"LIMIT {lim};"
    )


def list_completed_processing_pairs(db: Session, *, limit: int) -> list[tuple[Trip, Payment]]:
    lim = max(1, min(int(limit), 500))
    rows = db.execute(
        select(Trip, Payment)
        .join(Payment, Payment.trip_id == Trip.id)
        .where(
            Trip.status == TripStatus.completed,
            Payment.status == PaymentStatus.processing,
        )
        .order_by(Payment.updated_at.asc())
        .limit(lim)
    ).all()
    return [(t, p) for t, p in rows]


@dataclass
class StripeSyncItemResult:
    trip_id: str
    payment_id: str
    stripe_payment_intent_id: str | None
    action: str
    detail: str
    stripe_status: str | None = None


def reconcile_stripe_for_completed_processing(
    db: Session,
    *,
    actor_user_id: str,
    governance_reason: str,
    dry_run: bool,
    limit: int,
) -> dict[str, Any]:
    """
    Para cada par completed+processing com `stripe_payment_intent_id`, consulta Stripe e alinha BD.

    - PI `succeeded` -> `payments.status = succeeded`
    - PI terminal falho (`canceled`, …) -> `payments.failed` e `trips.failed` (fecha inconsistência)
    - Outros estados Stripe -> sem alteração (reportado em `detail`)
    """
    if settings.STRIPE_MOCK:
        return {
            "skipped": True,
            "reason": "stripe_mock",
            "message": "STRIPE_MOCK=true: não se consulta Stripe; usa «Fechar sem PI» ou desliga o mock.",
            "items": [],
        }

    pairs = list_completed_processing_pairs(db, limit=limit)
    items: list[StripeSyncItemResult] = []

    for trip, pay in pairs:
        pi_id = (pay.stripe_payment_intent_id or "").strip()
        if not pi_id:
            items.append(
                StripeSyncItemResult(
                    trip_id=str(trip.id),
                    payment_id=str(pay.id),
                    stripe_payment_intent_id=None,
                    action="skip",
                    detail="sem_stripe_payment_intent_id",
                )
            )
            continue

        try:
            intent = retrieve_payment_intent(pi_id)
            st = getattr(intent, "status", None) or (
                intent.get("status") if isinstance(intent, dict) else None
            )
            st_s = str(st) if st is not None else ""
        except Exception as e:
            logger.warning("reconcile_stripe retrieve failed pi=%s err=%s", pi_id, e)
            items.append(
                StripeSyncItemResult(
                    trip_id=str(trip.id),
                    payment_id=str(pay.id),
                    stripe_payment_intent_id=pi_id,
                    action="error",
                    detail=f"stripe_retrieve_error:{e!s}",
                    stripe_status=None,
                )
            )
            continue

        if st_s == "succeeded":
            if pay.status == PaymentStatus.succeeded:
                items.append(
                    StripeSyncItemResult(
                        trip_id=str(trip.id),
                        payment_id=str(pay.id),
                        stripe_payment_intent_id=pi_id,
                        action="skip",
                        detail="already_succeeded",
                        stripe_status=st_s,
                    )
                )
            else:
                if not dry_run:
                    pay.status = PaymentStatus.succeeded
                    record_admin_action(
                        db,
                        actor_user_id=actor_user_id,
                        action="reconcile_payment_stripe_succeeded",
                        entity_type="payment",
                        entity_id=str(pay.id),
                        payload={
                            "governance_reason": governance_reason.strip()[:500],
                            "trip_id": str(trip.id),
                            "stripe_payment_intent_id": pi_id,
                            "stripe_status": st_s,
                        },
                    )
                items.append(
                    StripeSyncItemResult(
                        trip_id=str(trip.id),
                        payment_id=str(pay.id),
                        stripe_payment_intent_id=pi_id,
                        action="dry_run_succeeded" if dry_run else "updated_succeeded",
                        detail="payment_marked_succeeded",
                        stripe_status=st_s,
                    )
                )
        elif st_s in ("canceled", "requires_payment_method"):
            if not dry_run:
                pay.status = PaymentStatus.failed
                trip.status = TripStatus.failed
                record_admin_action(
                    db,
                    actor_user_id=actor_user_id,
                    action="reconcile_payment_stripe_terminal_failed",
                    entity_type="trip",
                    entity_id=str(trip.id),
                    payload={
                        "governance_reason": governance_reason.strip()[:500],
                        "payment_id": str(pay.id),
                        "stripe_payment_intent_id": pi_id,
                        "stripe_status": st_s,
                        "trip_status_after": TripStatus.failed.value,
                        "payment_status_after": PaymentStatus.failed.value,
                    },
                )
            items.append(
                StripeSyncItemResult(
                    trip_id=str(trip.id),
                    payment_id=str(pay.id),
                    stripe_payment_intent_id=pi_id,
                    action="dry_run_failed" if dry_run else "updated_failed",
                    detail="payment_failed_trip_failed",
                    stripe_status=st_s,
                )
            )
        else:
            items.append(
                StripeSyncItemResult(
                    trip_id=str(trip.id),
                    payment_id=str(pay.id),
                    stripe_payment_intent_id=pi_id,
                    action="skip",
                    detail=f"stripe_status_no_change:{st_s}",
                    stripe_status=st_s,
                )
            )

    if not dry_run:
        db.commit()

    return {
        "dry_run": dry_run,
        "count": len(items),
        "items": [vars(x) for x in items],
    }


@dataclass
class CloseNoPiItemResult:
    trip_id: str
    payment_id: str
    action: str
    detail: str


def close_completed_processing_without_pi(
    db: Session,
    *,
    actor_user_id: str,
    governance_reason: str,
    dry_run: bool,
    limit: int,
) -> dict[str, Any]:
    """Viagem completed + payment processing sem `stripe_payment_intent_id` -> failed + failed."""
    lim = max(1, min(int(limit), 500))
    rows = (
        db.execute(
            select(Trip, Payment)
            .join(Payment, Payment.trip_id == Trip.id)
            .where(
                Trip.status == TripStatus.completed,
                Payment.status == PaymentStatus.processing,
                Payment.stripe_payment_intent_id.is_(None),
            )
            .order_by(Payment.updated_at.asc())
            .limit(lim)
        )
        .all()
    )
    items: list[CloseNoPiItemResult] = []
    for trip, pay in rows:
        if not dry_run:
            pay.status = PaymentStatus.failed
            trip.status = TripStatus.failed
            record_admin_action(
                db,
                actor_user_id=actor_user_id,
                action="reconcile_close_no_stripe_pi",
                entity_type="trip",
                entity_id=str(trip.id),
                payload={
                    "governance_reason": governance_reason.strip()[:500],
                    "payment_id": str(pay.id),
                    "note": "completed_processing_sem_pi",
                },
            )
        items.append(
            CloseNoPiItemResult(
                trip_id=str(trip.id),
                payment_id=str(pay.id),
                action="dry_run" if dry_run else "closed_failed",
                detail="trip_and_payment_marked_failed",
            )
        )
    if not dry_run:
        db.commit()
    return {"dry_run": dry_run, "count": len(items), "items": [vars(x) for x in items]}


def preview_reconciliation(
    db: Session, *, limit: int
) -> dict[str, Any]:
    pairs = list_completed_processing_pairs(db, limit=limit)
    candidates = []
    for trip, pay in pairs:
        candidates.append(
            {
                "trip_id": str(trip.id),
                "payment_id": str(pay.id),
                "stripe_payment_intent_id": pay.stripe_payment_intent_id,
                "trip_completed_at": trip.completed_at.isoformat()
                if trip.completed_at
                else None,
                "payment_updated_at": pay.updated_at.isoformat(),
            }
        )
    return {
        "count": len(candidates),
        "candidates": candidates,
        "select_sql": sql_select_completed_processing(limit),
    }
