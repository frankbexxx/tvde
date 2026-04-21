"""
Reconciliação operacional: viagens `completed` com pagamento `processing` (legado / testes / webhook falhado).

SP-F: só invocado a partir de rotas `super_admin` + `governance_reason` + auditoria.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

import stripe
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.db.models.payment import Payment
from app.db.models.trip import Trip
from app.models.enums import PaymentStatus, TripStatus
from app.services.admin_audit import record_admin_action
from app.services.stripe_service import retrieve_payment_intent

logger = logging.getLogger(__name__)

_SINGLE_RECONCILE_TRIP_STATUSES = frozenset(
    {TripStatus.completed, TripStatus.cancelled, TripStatus.failed}
)


def _is_pi_not_found_error(exc: BaseException) -> bool:
    """
    Detecta o caso «PI inexistente no Stripe» (ex.: `pi_mock_…`, `pi_test_…`).

    Stripe devolve `InvalidRequestError` com `code='resource_missing'` e mensagem
    do tipo «No such payment_intent: '…'». Tratamos como estado terminal falhado.
    """
    try:
        if isinstance(exc, stripe.error.InvalidRequestError):
            code = getattr(exc, "code", None) or ""
            if code == "resource_missing":
                return True
    except Exception:  # pragma: no cover - defensive against stripe SDK variations
        pass
    return "No such payment_intent" in str(exc)


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


def list_completed_processing_pairs(
    db: Session, *, limit: int
) -> list[tuple[Trip, Payment]]:
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
    - PI **não encontrado** no Stripe (`resource_missing`: `pi_mock_…`, `pi_test_…` antigos,
      PI fora do account actual) -> `payments.failed` + `trips.failed` + audit
      `reconcile_payment_stripe_no_such_pi`. Fecha inconsistência sem deixar erro silencioso.
    - Outros estados Stripe / erros inesperados -> sem alteração (reportado em `detail`)
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
            if _is_pi_not_found_error(e):
                logger.info(
                    "reconcile_stripe pi_not_found -> marking payment+trip failed pi=%s",
                    pi_id,
                )
                if not dry_run:
                    pay.status = PaymentStatus.failed
                    trip.status = TripStatus.failed
                    record_admin_action(
                        db,
                        actor_user_id=actor_user_id,
                        action="reconcile_payment_stripe_no_such_pi",
                        entity_type="trip",
                        entity_id=str(trip.id),
                        payload={
                            "governance_reason": governance_reason.strip()[:500],
                            "payment_id": str(pay.id),
                            "stripe_payment_intent_id": pi_id,
                            "reason": "pi_not_found_in_stripe",
                            "trip_status_after": TripStatus.failed.value,
                            "payment_status_after": PaymentStatus.failed.value,
                        },
                    )
                items.append(
                    StripeSyncItemResult(
                        trip_id=str(trip.id),
                        payment_id=str(pay.id),
                        stripe_payment_intent_id=pi_id,
                        action="dry_run_no_such_pi"
                        if dry_run
                        else "updated_no_such_pi",
                        detail="pi_not_found_in_stripe_marked_failed",
                        stripe_status=None,
                    )
                )
                continue
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
    rows = db.execute(
        select(Trip, Payment)
        .join(Payment, Payment.trip_id == Trip.id)
        .where(
            Trip.status == TripStatus.completed,
            Payment.status == PaymentStatus.processing,
            Payment.stripe_payment_intent_id.is_(None),
        )
        .order_by(Payment.updated_at.asc())
        .limit(lim)
    ).all()
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


def preview_reconciliation(db: Session, *, limit: int) -> dict[str, Any]:
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


def reconcile_single_trip_payment_with_stripe(
    db: Session,
    *,
    trip_id: str,
    actor_user_id: str,
    governance_reason: str,
    dry_run: bool,
) -> dict[str, Any]:
    """
    Alinha um único pagamento `processing` ao PaymentIntent no Stripe.

    Só para viagens terminais (`completed`, `cancelled`, `failed`) — ex.: viagem
    `cancelled` com `payment.processing` e PI real (webhook / cancelamento Stripe
    não reflectos na BD).

    - PI `succeeded` -> `payment.succeeded` (não altera o estado da viagem).
    - PI terminal falho (`canceled`, `requires_payment_method`) -> `payment.failed`;
      se a viagem estava `completed`, passa a `failed` (igual ao lote); se já era
      `cancelled` ou `failed`, mantém o estado da viagem.
    """
    trip = (
        db.execute(
            select(Trip)
            .where(Trip.id == trip_id.strip())
            .options(joinedload(Trip.payment))
        )
        .unique()
        .scalar_one_or_none()
    )
    if not trip:
        return {"error": "not_found", "detail": "trip_not_found"}
    pay = trip.payment
    if not pay:
        return {"error": "not_found", "detail": "no_payment_for_trip"}

    base: dict[str, Any] = {
        "dry_run": dry_run,
        "trip_id": str(trip.id),
        "payment_id": str(pay.id),
        "trip_status_before": trip.status.value,
        "stripe_payment_intent_id": pay.stripe_payment_intent_id,
    }

    if trip.status not in _SINGLE_RECONCILE_TRIP_STATUSES:
        return {
            **base,
            "skipped": True,
            "reason": "trip_status_not_eligible",
            "detail": "only_completed_cancelled_failed",
        }
    if pay.status != PaymentStatus.processing:
        return {
            **base,
            "skipped": True,
            "reason": "payment_not_processing",
            "payment_status": pay.status.value,
        }

    pi_id = (pay.stripe_payment_intent_id or "").strip()
    if not pi_id:
        return {**base, "skipped": True, "reason": "sem_stripe_payment_intent_id"}

    if settings.STRIPE_MOCK:
        return {
            **base,
            "skipped": True,
            "reason": "stripe_mock",
            "message": "STRIPE_MOCK=true: não se consulta Stripe neste endpoint.",
        }

    try:
        intent = retrieve_payment_intent(pi_id)
        st = getattr(intent, "status", None) or (
            intent.get("status") if isinstance(intent, dict) else None
        )
        st_s = str(st) if st is not None else ""
    except Exception as e:
        logger.warning(
            "reconcile_single retrieve failed trip=%s pi=%s err=%s", trip_id, pi_id, e
        )
        return {
            **base,
            "action": "error",
            "detail": f"stripe_retrieve_error:{e!s}",
            "stripe_status": None,
        }

    if st_s == "succeeded":
        if not dry_run:
            pay.status = PaymentStatus.succeeded
            record_admin_action(
                db,
                actor_user_id=actor_user_id,
                action="reconcile_single_payment_stripe_succeeded",
                entity_type="payment",
                entity_id=str(pay.id),
                payload={
                    "governance_reason": governance_reason.strip()[:500],
                    "trip_id": str(trip.id),
                    "stripe_payment_intent_id": pi_id,
                    "stripe_status": st_s,
                },
            )
            db.commit()
        out = {
            **base,
            "action": "dry_run_succeeded" if dry_run else "updated_succeeded",
            "detail": "payment_marked_succeeded",
            "stripe_status": st_s,
        }
        return {**out, "trip_status_after": trip.status.value}

    if st_s in ("canceled", "requires_payment_method"):
        trip_was_completed = trip.status == TripStatus.completed
        if not dry_run:
            pay.status = PaymentStatus.failed
            if trip_was_completed:
                trip.status = TripStatus.failed
            record_admin_action(
                db,
                actor_user_id=actor_user_id,
                action="reconcile_single_payment_stripe_terminal_failed",
                entity_type="payment",
                entity_id=str(pay.id),
                payload={
                    "governance_reason": governance_reason.strip()[:500],
                    "trip_id": str(trip.id),
                    "stripe_payment_intent_id": pi_id,
                    "stripe_status": st_s,
                    "trip_status_before": base["trip_status_before"],
                    "trip_status_after": trip.status.value,
                    "trip_set_failed": trip_was_completed,
                },
            )
            db.commit()
        if dry_run and trip_was_completed:
            trip_after = TripStatus.failed.value
        else:
            trip_after = trip.status.value
        return {
            **base,
            "action": "dry_run_failed" if dry_run else "updated_failed",
            "detail": "payment_failed_trip_failed_if_completed",
            "stripe_status": st_s,
            "trip_status_after": trip_after,
        }

    return {
        **base,
        "action": "skip",
        "detail": f"stripe_status_no_change:{st_s}",
        "stripe_status": st_s,
        "trip_status_after": trip.status.value,
    }
