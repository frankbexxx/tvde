"""Stripe API wrappers - no business logic, only Stripe calls."""

import stripe

from app.core.config import settings

stripe.api_key = settings.STRIPE_SECRET_KEY


def create_authorization_payment_intent(
    *,
    amount_cents: int,
    currency: str,
    metadata: dict,
) -> stripe.PaymentIntent:
    """
    Create PaymentIntent without confirming.
    Status: requires_confirmation (amount can be updated before confirm).
    """
    return stripe.PaymentIntent.create(
        amount=amount_cents,
        currency=currency,
        capture_method="manual",
        payment_method_types=["card"],
        confirm=False,
        metadata=metadata,
    )


def confirm_payment_intent(
    payment_intent_id: str,
    *,
    payment_method: str | None = None,
) -> stripe.PaymentIntent:
    """Confirm PaymentIntent. In dev, pass payment_method for backend-only flow."""
    kwargs = {}
    if payment_method:
        kwargs["payment_method"] = payment_method
    return stripe.PaymentIntent.confirm(payment_intent_id, **kwargs)


def update_payment_intent_amount(
    payment_intent_id: str,
    amount_cents: int,
) -> stripe.PaymentIntent:
    """
    Update PaymentIntent amount. Stripe: only when status in
    requires_payment_method, requires_confirmation, requires_action.
    NOT allowed when requires_capture (after confirmation).
    """
    return stripe.PaymentIntent.modify(
        payment_intent_id,
        amount=amount_cents,
    )


def capture_payment_intent(payment_intent_id: str) -> stripe.PaymentIntent:
    """Capture previously authorized PaymentIntent."""
    return stripe.PaymentIntent.capture(payment_intent_id)


def retrieve_payment_intent(payment_intent_id: str) -> stripe.PaymentIntent:
    """Retrieve PaymentIntent to check status (e.g. for retry logic)."""
    return stripe.PaymentIntent.retrieve(payment_intent_id)
