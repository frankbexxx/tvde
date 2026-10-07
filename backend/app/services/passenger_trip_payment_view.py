"""Passenger-safe payment labels for trip history/detail (no Stripe calls)."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.passenger_payment_method import PassengerPaymentMethod
from app.db.models.payment import Payment


def format_payment_method_display(brand: str, last4: str) -> str:
    b = (brand or "cartão").strip()
    if b:
        b = b[0].upper() + b[1:].lower()
    digits = (last4 or "")[:4]
    return f"{b} •••• {digits}"


def resolve_passenger_payment_method_display(
    db: Session,
    passenger_id: uuid.UUID,
    payment: Payment | None,
) -> tuple[str | None, bool]:
    """Return (display label, unavailable).

    unavailable=True when a PM id was stored on Payment but not found in wallet cache.
    """
    if payment is None:
        return None, False
    pm_id = (payment.stripe_payment_method_id or "").strip()
    if not pm_id:
        return None, False
    row = db.execute(
        select(PassengerPaymentMethod)
        .where(
            PassengerPaymentMethod.user_id == passenger_id,
            PassengerPaymentMethod.stripe_payment_method_id == pm_id,
        )
        .limit(1)
    ).scalar_one_or_none()
    if row is None:
        return None, True
    return format_payment_method_display(row.brand, row.last4), False


def passenger_payment_total(payment: Payment | None) -> float | None:
    if payment is None:
        return None
    return float(payment.total_amount)
