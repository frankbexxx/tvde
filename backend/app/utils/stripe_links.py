"""Links úteis para operadores (dashboard Stripe por PaymentIntent)."""

from __future__ import annotations

from app.core.config import settings


def stripe_payment_intent_dashboard_url(payment_intent_id: str | None) -> str | None:
    """URL do dashboard Stripe para um PaymentIntent, ou None se não aplicável."""
    if not payment_intent_id:
        return None
    if payment_intent_id.startswith("pi_mock_"):
        return None
    sk = (getattr(settings, "STRIPE_SECRET_KEY", None) or "").strip()
    if sk.startswith("sk_test_"):
        return f"https://dashboard.stripe.com/test/payments/{payment_intent_id}"
    if sk.startswith("sk_live_"):
        return f"https://dashboard.stripe.com/payments/{payment_intent_id}"
    return None
