"""Stripe webhook endpoint - single source of truth for payment status."""

import logging
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

import stripe

from app.api.deps import get_db
from app.core.config import settings
from app.db.models.payment import Payment
from app.models.enums import PaymentStatus
from app.utils.logging import log_event

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(..., alias="stripe-signature"),
    db: Session = Depends(get_db),
) -> dict:
    """Handle Stripe webhook events - only source of truth for payment status."""
    payload = await request.body()

    # Verify webhook secret is configured.
    if not settings.STRIPE_WEBHOOK_SECRET:
        logger.error("STRIPE_WEBHOOK_SECRET not configured")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Webhook secret not configured.",
        )

    # Verify webhook signature.
    try:
        event = stripe.Webhook.construct_event(
            payload,
            stripe_signature,
            settings.STRIPE_WEBHOOK_SECRET,
        )
    except ValueError as e:
        logger.error(f"Invalid payload: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payload",
        ) from e
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Invalid signature: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid signature",
        ) from e

    # Handle payment events (idempotent).
    event_type = event["type"]
    obj = event["data"]["object"]
    # payment_intent.* events: object is PaymentIntent, id is pi_xxx
    # charge.* events: object is Charge, id is ch_xxx; use charge.payment_intent for lookup
    if obj.get("object") == "charge":
        payment_intent_id = obj.get("payment_intent")
        if isinstance(payment_intent_id, dict):
            payment_intent_id = payment_intent_id.get("id")
    else:
        payment_intent_id = obj.get("id")

    if not payment_intent_id or not str(payment_intent_id).startswith("pi_"):
        logger.warning(
            f"webhook: No valid payment_intent_id in event_type={event_type}, skipping"
        )
        return {"status": "ok"}

    stripe_event_id = event.get("id")

    try:
        # One PI should map to one row; duplicates (tests / bad data) must not 500.
        pi_key = str(payment_intent_id)
        payment = db.execute(
            select(Payment)
            .where(Payment.stripe_payment_intent_id == pi_key)
            .order_by(Payment.id.desc())
            .limit(1)
        ).scalar_one_or_none()

        if not payment:
            logger.warning(
                f"webhook: Payment not found event_type={event_type}, "
                f"payment_intent_id={payment_intent_id}"
            )
            return {"status": "ok"}

        # Manual capture: only payment_intent.succeeded fires after capture.
        if event_type == "payment_intent.succeeded":
            if payment.status != PaymentStatus.succeeded:
                payment.status = PaymentStatus.succeeded
                db.commit()
                log_event(
                    "stripe_webhook_payment_succeeded",
                    trip_id=str(payment.trip_id),
                    payment_id=str(payment.id),
                    payment_intent_id=str(payment_intent_id),
                    stripe_event_id=str(stripe_event_id) if stripe_event_id else "",
                )
                logger.info(
                    f"webhook: Payment marked as succeeded event_type={event_type}, "
                    f"payment_intent_id={payment_intent_id}, payment_id={payment.id}, "
                    f"payment_status_final=succeeded"
                )
            else:
                log_event(
                    "stripe_webhook_duplicate_event",
                    trip_id=str(payment.trip_id),
                    payment_id=str(payment.id),
                    payment_intent_id=str(payment_intent_id),
                    stripe_event_id=str(stripe_event_id) if stripe_event_id else "",
                    event_type=event_type,
                    note="already_succeeded",
                )
                logger.info(
                    f"webhook: Payment already succeeded (idempotent) event_type={event_type}, "
                    f"payment_intent_id={payment_intent_id}, payment_id={payment.id}, "
                    f"stripe_event_id={stripe_event_id}"
                )

        elif event_type in ("payment_intent.payment_failed", "charge.payment_failed"):
            if payment.status != PaymentStatus.failed:
                payment.status = PaymentStatus.failed
                db.commit()
                log_event(
                    "stripe_webhook_payment_failed",
                    trip_id=str(payment.trip_id),
                    payment_id=str(payment.id),
                    payment_intent_id=str(payment_intent_id),
                    event_type=event_type,
                    stripe_event_id=str(stripe_event_id) if stripe_event_id else "",
                )
                logger.info(
                    f"webhook: Payment marked as failed event_type={event_type}, "
                    f"payment_intent_id={payment_intent_id}, payment_id={payment.id}, "
                    f"payment_status_final=failed"
                )
            else:
                log_event(
                    "stripe_webhook_duplicate_event",
                    trip_id=str(payment.trip_id),
                    payment_id=str(payment.id),
                    payment_intent_id=str(payment_intent_id),
                    stripe_event_id=str(stripe_event_id) if stripe_event_id else "",
                    event_type=event_type,
                    note="already_failed",
                )
                logger.info(
                    f"webhook: Payment already failed (idempotent) event_type={event_type}, "
                    f"payment_intent_id={payment_intent_id}, payment_id={payment.id}, "
                    f"stripe_event_id={stripe_event_id}"
                )

    except SQLAlchemyError:
        logger.exception(
            "webhook: DB error (ack 200 to avoid poison retries) event_type=%s "
            "payment_intent_id=%s stripe_event_id=%s",
            event_type,
            payment_intent_id,
            stripe_event_id,
        )
        log_event(
            "stripe_webhook_db_error_ack",
            event_type=event_type,
            payment_intent_id=str(payment_intent_id),
            stripe_event_id=str(stripe_event_id) if stripe_event_id else "",
        )
        try:
            db.rollback()
        except Exception:
            logger.exception("webhook: rollback after DB error failed")

    return {"status": "ok"}

