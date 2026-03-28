"""Stripe API wrappers - no business logic, only Stripe calls."""

import stripe

from app.core.config import settings

stripe.api_key = settings.STRIPE_SECRET_KEY


def create_authorization_payment_intent(
    *,
    amount_cents: int,
    currency: str,
    metadata: dict,
    idempotency_key: str | None = None,
) -> stripe.PaymentIntent:
    """
    Create PaymentIntent without confirming.
    Status: requires_confirmation (amount can be updated before confirm).
    """
    params: dict = {
        "amount": amount_cents,
        "currency": currency,
        "capture_method": "manual",
        "payment_method_types": ["card"],
        "confirm": False,
        "metadata": metadata,
    }
    if idempotency_key:
        params["idempotency_key"] = idempotency_key
    return stripe.PaymentIntent.create(**params)


def confirm_payment_intent(
    payment_intent_id: str,
    *,
    payment_method: str | None = None,
    idempotency_key: str | None = None,
) -> stripe.PaymentIntent:
    """Confirm PaymentIntent. In dev, pass payment_method for backend-only flow."""
    kwargs: dict = {}
    if payment_method:
        kwargs["payment_method"] = payment_method
    if idempotency_key:
        kwargs["idempotency_key"] = idempotency_key
    if kwargs:
        return stripe.PaymentIntent.confirm(payment_intent_id, **kwargs)
    return stripe.PaymentIntent.confirm(payment_intent_id)


def update_payment_intent_amount(
    payment_intent_id: str,
    amount_cents: int,
    *,
    idempotency_key: str | None = None,
) -> stripe.PaymentIntent:
    """
    Update PaymentIntent amount. Stripe: only when status in
    requires_payment_method, requires_confirmation, requires_action.
    NOT allowed when requires_capture (after confirmation).
    """
    kwargs: dict = {"amount": amount_cents}
    if idempotency_key:
        kwargs["idempotency_key"] = idempotency_key
    return stripe.PaymentIntent.modify(payment_intent_id, **kwargs)


def capture_payment_intent(
    payment_intent_id: str,
    *,
    idempotency_key: str | None = None,
) -> stripe.PaymentIntent:
    """Capture previously authorized PaymentIntent."""
    if idempotency_key:
        return stripe.PaymentIntent.capture(
            payment_intent_id,
            idempotency_key=idempotency_key,
        )
    return stripe.PaymentIntent.capture(payment_intent_id)


def retrieve_payment_intent(payment_intent_id: str) -> stripe.PaymentIntent:
    """Retrieve PaymentIntent to check status (e.g. for retry logic)."""
    return stripe.PaymentIntent.retrieve(payment_intent_id)


def cancel_payment_intent(payment_intent_id: str) -> stripe.PaymentIntent:
    """Cancel PaymentIntent (e.g. when admin cancels trip before capture)."""
    return stripe.PaymentIntent.cancel(payment_intent_id)
