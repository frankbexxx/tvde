"""Stripe refund sync (V1): derived refund_status, charge.refunded application."""

from __future__ import annotations

from decimal import Decimal
from typing import Literal

from app.core.pricing import money
from app.db.models.payment import Payment

RefundStatus = Literal["none", "partial", "full"]


def stripe_amount_refunded_cents_to_eur(amount_refunded_cents: int) -> Decimal:
    """Deterministic EUR from Stripe integer cents."""
    return money(Decimal(int(amount_refunded_cents)) / Decimal("100"))


def derive_refund_status(
    refunded_amount: Decimal | float | int | str,
    total_amount: Decimal | float | int | str,
) -> RefundStatus:
    refunded = money(Decimal(str(refunded_amount)))
    total = money(Decimal(str(total_amount)))
    if refunded <= 0:
        return "none"
    if refunded >= total:
        return "full"
    return "partial"


def payment_refund_api_fields(
    payment: Payment | None,
) -> tuple[float | None, RefundStatus | None]:
    if payment is None:
        return None, None
    refunded = money(Decimal(str(payment.refunded_amount)))
    total = money(Decimal(str(payment.total_amount)))
    return float(refunded), derive_refund_status(refunded, total)


def apply_stripe_charge_refunded_to_payment(
    payment: Payment,
    *,
    amount_refunded_cents: int,
    currency: str | None,
) -> tuple[Decimal, Decimal, bool, str | None]:
    """
    Set refunded_amount = max(current, Stripe amount_refunded). Never decrement.

    Returns (previous_eur, new_eur, changed, skip_reason).
    """
    previous = money(Decimal(str(payment.refunded_amount)))
    if currency and (payment.currency or "").strip():
        pay_ccy = (payment.currency or "EUR").strip().lower()
        stripe_ccy = currency.strip().lower()
        if stripe_ccy != pay_ccy:
            return previous, previous, False, "currency_mismatch"

    stripe_eur = stripe_amount_refunded_cents_to_eur(amount_refunded_cents)
    new = max(previous, stripe_eur)
    changed = new > previous
    if changed:
        payment.refunded_amount = float(new)
    return previous, new, changed, None
