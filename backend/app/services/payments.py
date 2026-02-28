from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import cast

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.driver import Driver
from app.db.models.payment import Payment
from app.db.models.trip import Trip
from app.models.enums import PaymentStatus, TripStatus


def _to_decimal(value: float | Decimal) -> Decimal:
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def _money(amount: Decimal) -> Decimal:
    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def create_payment_for_trip(
    *,
    db: Session,
    trip: Trip,
    currency: str = "EUR",
) -> Payment:
    """
    Cria um Payment para uma trip já completada, sem Stripe.

    Propósito: Reservado para cenários alternativos ao fluxo principal:
    - Modelo B: pagamentos manuais (ex.: dinheiro, MB Way fora do Stripe)
    - Split automático futuro (quando o Payment não for criado no accept_trip)
    - Migração ou reconciliação de dados

    Fluxo principal (accept_trip): Payment é criado com Stripe PaymentIntent.
    Esta função NÃO é usada no fluxo atual; mantida para evolução futura.

    Raises:
        ValueError: Se trip não estiver completed, ou payment já existir, ou driver ausente.
    """
    # Trip must be completed and must not already have a payment.
    if trip.status != TripStatus.completed:
        raise ValueError("Payment can only be created for completed trips.")
    if trip.payment is not None:
        raise ValueError("Payment already exists for this trip.")

    # Determine total amount from final_price or fallback to estimated_price.
    base_price: float | Decimal
    if trip.final_price is not None:
        base_price = cast(float | Decimal, trip.final_price)
    else:
        base_price = cast(float | Decimal, trip.estimated_price)

    total = _money(_to_decimal(base_price))

    # Load driver and commission rate.
    if trip.driver_id is None:
        raise ValueError("Completed trip must have an assigned driver.")

    driver = db.execute(
        select(Driver).where(Driver.user_id == trip.driver_id)
    ).scalar_one_or_none()
    if not driver:
        raise ValueError("Driver not found for completed trip.")

    commission_rate = _to_decimal(driver.commission_percent) / Decimal("100")
    commission_amount = _money(total * commission_rate)
    driver_amount = _money(total - commission_amount)

    payment = Payment(
        trip_id=trip.id,
        total_amount=float(total),
        commission_amount=float(commission_amount),
        driver_amount=float(driver_amount),
        currency=currency,
        status=PaymentStatus.pending,
        stripe_payment_intent_id=None,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


