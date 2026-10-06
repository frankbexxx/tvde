"""Stripe API wrappers - no business logic, only Stripe calls."""

from __future__ import annotations

from typing import Any

import stripe

from app.core.config import settings


def _ensure_stripe_ready() -> None:
    # In STRIPE_MOCK mode we must not require any Stripe credentials.
    if getattr(settings, "STRIPE_MOCK", False):
        return
    sk = (getattr(settings, "STRIPE_SECRET_KEY", None) or "").strip()
    if not sk:
        raise RuntimeError("STRIPE_SECRET_KEY is required when STRIPE_MOCK=false")
    stripe.api_key = sk


def create_customer(
    *,
    email: str | None = None,
    name: str | None = None,
    metadata: dict | None = None,
    idempotency_key: str | None = None,
) -> stripe.Customer:
    params: dict[str, Any] = {"metadata": metadata or {}}
    if email:
        params["email"] = email
    if name:
        params["name"] = name
    if idempotency_key:
        params["idempotency_key"] = idempotency_key
    _ensure_stripe_ready()
    return stripe.Customer.create(**params)


def create_setup_intent(
    *,
    customer_id: str,
    metadata: dict | None = None,
    idempotency_key: str | None = None,
) -> stripe.SetupIntent:
    params: dict[str, Any] = {
        "customer": customer_id,
        "usage": "off_session",
        "payment_method_types": ["card"],
        "metadata": metadata or {},
    }
    if idempotency_key:
        params["idempotency_key"] = idempotency_key
    _ensure_stripe_ready()
    return stripe.SetupIntent.create(**params)


def retrieve_setup_intent(setup_intent_id: str) -> stripe.SetupIntent:
    _ensure_stripe_ready()
    return stripe.SetupIntent.retrieve(setup_intent_id)


def retrieve_payment_method(payment_method_id: str) -> stripe.PaymentMethod:
    _ensure_stripe_ready()
    return stripe.PaymentMethod.retrieve(payment_method_id)


def set_customer_default_payment_method(
    customer_id: str,
    payment_method_id: str,
) -> stripe.Customer:
    _ensure_stripe_ready()
    return stripe.Customer.modify(
        customer_id,
        invoice_settings={"default_payment_method": payment_method_id},
    )


def detach_payment_method(payment_method_id: str) -> stripe.PaymentMethod:
    _ensure_stripe_ready()
    return stripe.PaymentMethod.detach(payment_method_id)


def create_authorization_payment_intent(
    *,
    amount_cents: int,
    currency: str,
    metadata: dict,
    idempotency_key: str | None = None,
    customer: str | None = None,
    payment_method: str | None = None,
) -> stripe.PaymentIntent:
    """
    Create PaymentIntent without confirming.
    Status: requires_confirmation (amount can be updated before confirm).
    Optionally bind Customer + PaymentMethod (prepared wallet) without confirming.
    """
    params: dict = {
        "amount": amount_cents,
        "currency": currency,
        "capture_method": "manual",
        "payment_method_types": ["card"],
        "confirm": False,
        "metadata": metadata,
    }
    if customer:
        params["customer"] = customer
    if payment_method:
        params["payment_method"] = payment_method
    if idempotency_key:
        params["idempotency_key"] = idempotency_key
    _ensure_stripe_ready()
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
        _ensure_stripe_ready()
        return stripe.PaymentIntent.confirm(payment_intent_id, **kwargs)
    _ensure_stripe_ready()
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
    _ensure_stripe_ready()
    return stripe.PaymentIntent.modify(payment_intent_id, **kwargs)


def capture_payment_intent(
    payment_intent_id: str,
    *,
    idempotency_key: str | None = None,
) -> stripe.PaymentIntent:
    """Capture previously authorized PaymentIntent."""
    if idempotency_key:
        _ensure_stripe_ready()
        return stripe.PaymentIntent.capture(
            payment_intent_id,
            idempotency_key=idempotency_key,
        )
    _ensure_stripe_ready()
    return stripe.PaymentIntent.capture(payment_intent_id)


def retrieve_payment_intent(payment_intent_id: str) -> stripe.PaymentIntent:
    """Retrieve PaymentIntent to check status (e.g. for retry logic)."""
    _ensure_stripe_ready()
    return stripe.PaymentIntent.retrieve(payment_intent_id)


def attach_payment_method_to_intent(
    payment_intent_id: str,
    payment_method_id: str,
    *,
    idempotency_key: str | None = None,
) -> stripe.PaymentIntent:
    """
    Attach a PaymentMethod to an unconfirmed PaymentIntent (no confirm).

    Allows amount update at complete before confirm+capture, and SCA at confirm time.
    """
    kwargs: dict = {"payment_method": payment_method_id}
    if idempotency_key:
        kwargs["idempotency_key"] = idempotency_key
    _ensure_stripe_ready()
    return stripe.PaymentIntent.modify(payment_intent_id, **kwargs)


def cancel_payment_intent(payment_intent_id: str) -> stripe.PaymentIntent:
    """Cancel PaymentIntent (e.g. when admin cancels trip before capture)."""
    _ensure_stripe_ready()
    return stripe.PaymentIntent.cancel(payment_intent_id)
