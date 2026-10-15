"""accept_offer must not persist accepted offer when Stripe authorization fails."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import patch

import pytest
import stripe
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.db.models.driver import Driver
from app.db.models.passenger_payment_method import PassengerPaymentMethod
from app.db.models.payment import Payment
from app.db.models.trip import Trip
from app.db.models.trip_offer import TripOffer
from app.db.models.user import User
from app.models.enums import DriverStatus, OfferStatus, Role, TripStatus, UserStatus
from app.services import passenger_payments
from app.services import trips as trips_service
from app.services import stripe_service
from tests.support.unique_phone import unique_test_phone


def _seed_accept_offer_stripe_failure(
    db: Session,
) -> tuple[str, str, str, str, uuid.UUID]:
    """Returns driver_id, offer_id, trip_id, passenger_id, other_offer_id."""
    stripe_cus = f"cus_test_atomicity_{uuid.uuid4().hex[:12]}"
    pm_stripe_id = f"pm_test_atomicity_{uuid.uuid4().hex[:12]}"
    passenger = User(
        role=Role.passenger,
        name="Pax Stripe Fail",
        phone=unique_test_phone(),
        status=UserStatus.active,
        stripe_customer_id=stripe_cus,
    )
    driver_user = User(
        role=Role.driver,
        name="Driver Stripe Fail",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    other_driver = User(
        role=Role.driver,
        name="Other Driver",
        phone=unique_test_phone(),
        status=UserStatus.active,
    )
    db.add_all([passenger, driver_user, other_driver])
    db.flush()
    db.add_all(
        [
            Driver(
                user_id=driver_user.id,
                partner_id=DEFAULT_PARTNER_UUID,
                status=DriverStatus.approved,
                commission_percent=15.0,
                is_available=True,
                vehicle_categories="x",
            ),
            Driver(
                user_id=other_driver.id,
                partner_id=DEFAULT_PARTNER_UUID,
                status=DriverStatus.approved,
                commission_percent=15.0,
                is_available=True,
                vehicle_categories="x",
            ),
        ]
    )
    db.add(
        PassengerPaymentMethod(
            user_id=passenger.id,
            stripe_payment_method_id=pm_stripe_id,
            brand="visa",
            last4="4242",
            exp_month=12,
            exp_year=2030,
            is_default=False,
        )
    )
    trip = Trip(
        passenger_id=passenger.id,
        status=TripStatus.requested,
        origin_lat=38.72,
        origin_lng=-9.14,
        destination_lat=38.73,
        destination_lng=-9.13,
        estimated_price=10.0,
        vehicle_category="x",
    )
    db.add(trip)
    db.flush()
    offer = TripOffer(
        trip_id=trip.id,
        driver_id=driver_user.id,
        status=OfferStatus.pending,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
    )
    other_offer = TripOffer(
        trip_id=trip.id,
        driver_id=other_driver.id,
        status=OfferStatus.pending,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
    )
    db.add_all([offer, other_offer])
    db.commit()
    return (
        str(driver_user.id),
        str(offer.id),
        str(trip.id),
        str(passenger.id),
        other_offer.id,
        pm_stripe_id,
    )


def test_accept_offer_stripe_failure_keeps_offer_pending_and_no_payment(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "STRIPE_MOCK", False, raising=False)
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "sk_test_unit_fake", raising=False)

    (
        driver_id,
        offer_id,
        trip_id,
        _passenger_id,
        other_offer_id,
        pm_stripe_id,
    ) = _seed_accept_offer_stripe_failure(db)

    fake_customer = SimpleNamespace(
        invoice_settings=SimpleNamespace(default_payment_method=pm_stripe_id)
    )

    def _stripe_pi_boom(**_kwargs: object) -> None:
        raise stripe.error.InvalidRequestError(
            message="payment_method_types no longer supported",
            param="payment_method_types",
        )

    with patch.object(
        passenger_payments, "retrieve_customer", return_value=fake_customer
    ):
        with patch.object(
            trips_service,
            "create_authorization_payment_intent",
            side_effect=_stripe_pi_boom,
        ):
            with pytest.raises(HTTPException) as exc_info:
                trips_service.accept_offer(
                    db=db, driver_id=driver_id, offer_id=offer_id
                )

    assert exc_info.value.status_code == 402
    assert exc_info.value.detail == "Payment authorization failed."

    trip = db.get(Trip, uuid.UUID(trip_id))
    assert trip is not None
    assert trip.status == TripStatus.requested
    assert trip.driver_id is None

    offer = db.get(TripOffer, uuid.UUID(offer_id))
    assert offer is not None
    assert offer.status == OfferStatus.pending

    other = db.get(TripOffer, other_offer_id)
    assert other is not None
    assert other.status == OfferStatus.pending

    pay = db.execute(
        select(Payment).where(Payment.trip_id == uuid.UUID(trip_id))
    ).scalar_one_or_none()
    assert pay is None
