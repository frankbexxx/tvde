"""Fail-closed amount/currency checks for Stripe capture, webhooks, and reconcile."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from app.core.pricing import money


def euros_to_cents(amount: Decimal | float | int | str) -> int:
    """Convert EUR to integer cents (ROUND_HALF_UP via money())."""
    return int(money(Decimal(str(amount))) * Decimal("100"))


def final_price_cents(final_price: Decimal | float | int | str) -> int:
    """Same floor as complete_trip PaymentIntent amount update (Stripe EUR min 50)."""
    return max(50, euros_to_cents(final_price))


def _attr_or_key(obj: Any, key: str) -> Any:
    if obj is None:
        return None
    if isinstance(obj, dict):
        return obj.get(key)
    return getattr(obj, key, None)


def stripe_amount_cents(pi_or_event_object: Any) -> int | None:
    raw = _attr_or_key(pi_or_event_object, "amount")
    if raw is None:
        return None
    try:
        return int(raw)
    except (TypeError, ValueError):
        return None


def stripe_currency(pi_or_event_object: Any) -> str | None:
    raw = _attr_or_key(pi_or_event_object, "currency")
    if raw is None:
        return None
    return str(raw).strip().lower() or None


@dataclass(frozen=True)
class AmountGuardResult:
    ok: bool
    reason: str
    stripe_amount_cents: int | None
    expected_amount_cents: int | None
    stripe_currency: str | None
    expected_currency: str


def expected_payment_cents(
    *,
    final_price: Decimal | float | int | str | None,
    payment_total_amount: Decimal | float | int | str | None,
) -> int | None:
    """Prefer trip.final_price; fall back to payment.total_amount."""
    if final_price is not None:
        return final_price_cents(final_price)
    if payment_total_amount is not None:
        return euros_to_cents(payment_total_amount)
    return None


def validate_stripe_amount_matches_expected(
    *,
    stripe_object: Any,
    expected_cents: int | None,
    expected_currency: str = "eur",
) -> AmountGuardResult:
    """
    Fail-closed: missing Stripe amount/currency or mismatch → not ok.

    Used by complete (requires_capture), webhook succeeded, and admin reconcile.
    """
    exp_cur = (expected_currency or "eur").strip().lower()
    got_cents = stripe_amount_cents(stripe_object)
    got_cur = stripe_currency(stripe_object)

    if expected_cents is None:
        return AmountGuardResult(
            ok=False,
            reason="missing_expected_amount",
            stripe_amount_cents=got_cents,
            expected_amount_cents=None,
            stripe_currency=got_cur,
            expected_currency=exp_cur,
        )
    if got_cents is None:
        return AmountGuardResult(
            ok=False,
            reason="missing_stripe_amount",
            stripe_amount_cents=None,
            expected_amount_cents=expected_cents,
            stripe_currency=got_cur,
            expected_currency=exp_cur,
        )
    if got_cur is None:
        return AmountGuardResult(
            ok=False,
            reason="missing_stripe_currency",
            stripe_amount_cents=got_cents,
            expected_amount_cents=expected_cents,
            stripe_currency=None,
            expected_currency=exp_cur,
        )
    if got_cur != exp_cur:
        return AmountGuardResult(
            ok=False,
            reason="currency_mismatch",
            stripe_amount_cents=got_cents,
            expected_amount_cents=expected_cents,
            stripe_currency=got_cur,
            expected_currency=exp_cur,
        )
    if got_cents != expected_cents:
        # Explicit placeholder trap (subset of amount mismatch).
        if got_cents == 50 and expected_cents != 50:
            reason = "placeholder_amount_mismatch"
        else:
            reason = "amount_mismatch"
        return AmountGuardResult(
            ok=False,
            reason=reason,
            stripe_amount_cents=got_cents,
            expected_amount_cents=expected_cents,
            stripe_currency=got_cur,
            expected_currency=exp_cur,
        )
    return AmountGuardResult(
        ok=True,
        reason="ok",
        stripe_amount_cents=got_cents,
        expected_amount_cents=expected_cents,
        stripe_currency=got_cur,
        expected_currency=exp_cur,
    )
