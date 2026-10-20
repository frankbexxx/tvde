"""STRIPE-LIVE-02 F1: refunded_amount + derived refund_status."""

from __future__ import annotations

import uuid

from app.db.models.payment import Payment
from app.models.enums import PaymentStatus
from app.services.payment_refund import (
    apply_stripe_charge_refunded_to_payment,
    derive_refund_status,
    payment_refund_api_fields,
    stripe_amount_refunded_cents_to_eur,
)


def test_stripe_cents_to_eur_deterministic() -> None:
    assert stripe_amount_refunded_cents_to_eur(450) == 4.50
    assert stripe_amount_refunded_cents_to_eur(200) == 2.00


def test_derive_refund_status_none_partial_full() -> None:
    assert derive_refund_status(0, 4.5) == "none"
    assert derive_refund_status(2.0, 4.5) == "partial"
    assert derive_refund_status(4.5, 4.5) == "full"
    assert derive_refund_status(5.0, 4.5) == "full"


def test_apply_max_monotonic_and_currency() -> None:
    pay = Payment(
        trip_id=uuid.uuid4(),
        total_amount=4.5,
        commission_amount=0.5,
        driver_amount=4.0,
        currency="EUR",
        status=PaymentStatus.succeeded,
        refunded_amount=0.0,
    )
    prev, new, changed, skip = apply_stripe_charge_refunded_to_payment(
        pay, amount_refunded_cents=200, currency="eur"
    )
    assert skip is None
    assert changed is True
    assert float(new) == 2.0
    assert float(pay.refunded_amount) == 2.0

    prev2, new2, changed2, _ = apply_stripe_charge_refunded_to_payment(
        pay, amount_refunded_cents=450, currency="eur"
    )
    assert changed2 is True
    assert float(new2) == 4.5

    prev3, new3, changed3, _ = apply_stripe_charge_refunded_to_payment(
        pay, amount_refunded_cents=200, currency="eur"
    )
    assert changed3 is False
    assert float(new3) == 4.5
    assert float(prev3) == 4.5

    pay2 = Payment(
        trip_id=uuid.uuid4(),
        total_amount=4.5,
        commission_amount=0.5,
        driver_amount=4.0,
        currency="EUR",
        status=PaymentStatus.succeeded,
        refunded_amount=0.0,
    )
    _, _, changed_bad, skip_bad = apply_stripe_charge_refunded_to_payment(
        pay2, amount_refunded_cents=100, currency="usd"
    )
    assert changed_bad is False
    assert skip_bad == "currency_mismatch"


def test_payment_refund_api_fields() -> None:
    pay = Payment(
        trip_id=uuid.uuid4(),
        total_amount=10.0,
        commission_amount=1.0,
        driver_amount=9.0,
        currency="EUR",
        status=PaymentStatus.succeeded,
        refunded_amount=3.0,
    )
    amount, status = payment_refund_api_fields(pay)
    assert amount == 3.0
    assert status == "partial"
    assert payment_refund_api_fields(None) == (None, None)
