from __future__ import annotations

import logging
import random
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload
import stripe

from app.db.models.driver import Driver, DriverLocation
from app.db.models.payment import Payment
from app.db.models.trip import Trip
from app.db.models.trip_offer import TripOffer
from app.events.dispatcher import emit
from app.models.enums import DriverStatus, OfferStatus, PaymentStatus, TripStatus
from app.schemas.realtime import TripStatusChangedEvent
from app.schemas.trip import TripCreateRequest
from app.services.payments import _money, _to_decimal
from app.core.config import settings
from app.core.pricing import calculate_price
from app.utils.geo import haversine_km
from app.services.offer_dispatch import create_offers_for_trip
from app.utils.logging import log_event
from app.utils.state_machine import validate_trip_transition
from app.services.stripe_service import (
    cancel_payment_intent,
    capture_payment_intent,
    confirm_payment_intent,
    create_authorization_payment_intent,
    retrieve_payment_intent,
    update_payment_intent_amount,
)

logger = logging.getLogger(__name__)


ACTIVE_PASSENGER_CANCEL = {
    TripStatus.requested,
    TripStatus.assigned,
    TripStatus.accepted,
    TripStatus.arriving,
    TripStatus.ongoing,  # Allow cancel when stuck (e.g. complete failed)
}

ACTIVE_DRIVER_CANCEL = {
    TripStatus.accepted,
    TripStatus.arriving,
    TripStatus.ongoing,
}


def _get_trip_for_driver(
    *,
    db: Session,
    driver_id: str,
    trip_id: str,
) -> Trip:
    trip = db.execute(select(Trip).where(Trip.id == trip_id)).scalar_one_or_none()
    if not trip or str(trip.driver_id) != str(driver_id):
        _raise_not_found()
    return trip


def _get_trip_for_driver_locked(
    *,
    db: Session,
    driver_id: str,
    trip_id: str,
) -> Trip:
    """Same as _get_trip_for_driver but locks row (FOR UPDATE) to prevent race conditions."""
    trip = db.execute(
        select(Trip).where(Trip.id == trip_id).with_for_update()
    ).scalar_one_or_none()
    if not trip or str(trip.driver_id) != str(driver_id):
        _raise_not_found()
    return trip


def _raise_invalid_state() -> None:
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="invalid_state",
    )


def _raise_not_found() -> None:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="not_found",
    )


def _estimate_trip(_: TripCreateRequest) -> tuple[float, int]:
    # Placeholder until distance/ETA calculation. Amount set at complete.
    return 0.0, 0


def create_trip(
    *,
    db: Session,
    passenger_id: str,
    payload: TripCreateRequest,
) -> tuple[Trip, int]:
    estimated_price, eta = _estimate_trip(payload)
    trip = Trip(
        passenger_id=passenger_id,
        status=TripStatus.requested,
        origin_lat=payload.origin_lat,
        origin_lng=payload.origin_lng,
        destination_lat=payload.destination_lat,
        destination_lng=payload.destination_lng,
        estimated_price=estimated_price,
        final_price=None,
    )
    db.add(trip)
    db.flush()

    # Multi-offer dispatch: create offers for top N drivers within radius
    offers = create_offers_for_trip(db=db, trip=trip)
    logger.info(
        "create_trip: offers created",
        extra={
            "trip_id": str(trip.id),
            "passenger_id": str(passenger_id),
            "offer_count": len(offers),
        },
    )

    db.commit()
    db.refresh(trip)
    log_event("trip_created", trip_id=trip.id, passenger_id=passenger_id)
    emit(
        TripStatusChangedEvent(
            trip_id=str(trip.id),
            status=trip.status,
            timestamp=datetime.now(timezone.utc),
        )
    )
    return trip, eta


def cancel_trip_by_passenger(
    *,
    db: Session,
    passenger_id: str,
    trip_id: str,
) -> Trip:
    trip = db.execute(
        select(Trip)
        .where(Trip.id == trip_id, Trip.passenger_id == passenger_id)
        .options(joinedload(Trip.payment))
        .with_for_update()
    ).scalar_one_or_none()
    if not trip:
        _raise_not_found()
    if trip.status not in ACTIVE_PASSENGER_CANCEL:
        _raise_invalid_state()

    old_status = trip.status
    validate_trip_transition(old_status, TripStatus.cancelled, trip_id=str(trip.id))

    # Cancel PaymentIntent if trip has payment (accepted/arriving/ongoing)
    payment = trip.payment
    pi_id = (payment.stripe_payment_intent_id or "") if payment else ""
    if payment and pi_id and not pi_id.startswith("pi_mock_"):
        try:
            intent = retrieve_payment_intent(pi_id)
            pi_status = getattr(intent, "status", None) or intent.get("status", "")
            if pi_status in ("requires_payment_method", "requires_confirmation", "requires_action", "requires_capture"):
                cancel_payment_intent(pi_id)
                logger.info(f"cancel_trip_by_passenger: cancelled PI {pi_id}")
        except Exception as e:
            logger.warning(f"cancel_trip_by_passenger: could not cancel PI: {e}")

    trip.status = TripStatus.cancelled
    _set_driver_available(db, trip.driver_id)
    db.commit()
    db.refresh(trip)
    log_event(
        "trip_state_change",
        trip_id=trip.id,
        from_state=old_status,
        to_state=trip.status,
    )
    emit(
        TripStatusChangedEvent(
            trip_id=str(trip.id),
            status=trip.status,
            timestamp=datetime.now(timezone.utc),
        )
    )
    return trip


def _set_driver_available(db: Session, driver_id: str | None) -> None:
    """Set driver is_available=True when trip ends."""
    if not driver_id:
        return
    driver = db.execute(select(Driver).where(Driver.user_id == driver_id)).scalar_one_or_none()
    if driver and hasattr(driver, "is_available"):
        driver.is_available = True


def cancel_trip_by_driver(
    *,
    db: Session,
    driver_id: str,
    trip_id: str,
) -> Trip:
    trip = db.execute(
        select(Trip)
        .where(Trip.id == trip_id)
        .options(joinedload(Trip.payment))
        .with_for_update()
    ).scalar_one_or_none()
    if not trip or str(trip.driver_id) != str(driver_id):
        _raise_not_found()
    if trip.status not in ACTIVE_DRIVER_CANCEL:
        _raise_invalid_state()

    old_status = trip.status
    validate_trip_transition(old_status, TripStatus.cancelled, trip_id=str(trip.id))

    payment = trip.payment
    pi_id = (payment.stripe_payment_intent_id or "") if payment else ""
    if payment and pi_id and not pi_id.startswith("pi_mock_"):
        try:
            intent = retrieve_payment_intent(pi_id)
            pi_status = getattr(intent, "status", None) or intent.get("status", "")
            if pi_status in ("requires_payment_method", "requires_confirmation", "requires_action", "requires_capture"):
                cancel_payment_intent(pi_id)
                logger.info(f"cancel_trip_by_driver: cancelled PI {pi_id}")
        except Exception as e:
            logger.warning(f"cancel_trip_by_driver: could not cancel PI: {e}")

    trip.status = TripStatus.cancelled
    _set_driver_available(db, trip.driver_id)
    db.commit()
    db.refresh(trip)
    log_event(
        "trip_state_change",
        trip_id=trip.id,
        from_state=old_status,
        to_state=trip.status,
    )
    emit(
        TripStatusChangedEvent(
            trip_id=str(trip.id),
            status=trip.status,
            timestamp=datetime.now(timezone.utc),
        )
    )
    return trip


ADMIN_CANCEL_ALLOWED = {
    TripStatus.requested,
    TripStatus.assigned,
    TripStatus.accepted,
}


def cancel_trip_by_admin(
    *,
    db: Session,
    trip_id: str,
) -> Trip:
    """Admin force cancel. Only for requested, assigned, accepted."""
    trip = db.execute(
        select(Trip).where(Trip.id == trip_id).options(joinedload(Trip.payment))
    ).scalar_one_or_none()
    if not trip:
        _raise_not_found()
    if trip.status not in ADMIN_CANCEL_ALLOWED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"cannot_cancel_trip_in_status_{trip.status.value}",
        )

    old_status = trip.status
    validate_trip_transition(old_status, TripStatus.cancelled, trip_id=str(trip.id))

    payment = trip.payment
    if payment and payment.stripe_payment_intent_id:
        try:
            intent = retrieve_payment_intent(payment.stripe_payment_intent_id)
            pi_status = getattr(intent, "status", None) or intent.get("status", "")
            if pi_status in ("requires_payment_method", "requires_confirmation", "requires_action"):
                cancel_payment_intent(payment.stripe_payment_intent_id)
                logger.info(f"cancel_trip_by_admin: cancelled PI {payment.stripe_payment_intent_id}")
        except Exception as e:
            logger.warning(f"cancel_trip_by_admin: could not cancel PI: {e}")

    trip.status = TripStatus.cancelled
    _set_driver_available(db, trip.driver_id)
    db.commit()
    db.refresh(trip)
    log_event(
        "trip_state_change",
        trip_id=trip.id,
        from_state=old_status,
        to_state=trip.status,
    )
    emit(
        TripStatusChangedEvent(
            trip_id=str(trip.id),
            status=trip.status,
            timestamp=datetime.now(timezone.utc),
        )
    )
    return trip


def accept_trip(
    *,
    db: Session,
    driver_id: str,
    trip_id: str,
) -> tuple[Trip, str | None]:
    """Accept trip with atomic payment authorization.
    
    Order of operations (atomic):
    1. Lock trip row (FOR UPDATE) to prevent race condition
    2. Validate trip state == assigned
    3. Check idempotency (no existing payment)
    4. Validate driver is_available
    5. Create Stripe PaymentIntent (authorization only)
    6. Create internal Payment record
    7. Update trip state to accepted, driver is_available=False
    8. Single commit
    9. Emit event
    
    If Stripe fails at step 5, nothing is changed (trip remains assigned).
    """
    trip = db.execute(
        select(Trip).where(Trip.id == trip_id).with_for_update()
    ).scalar_one_or_none()
    if not trip:
        _raise_not_found()
    if trip.status != TripStatus.assigned:
        _raise_invalid_state()
    if trip.driver_id is not None:
        _raise_invalid_state()

    validate_trip_transition(trip.status, TripStatus.accepted, trip_id=str(trip.id))

    # Idempotency: check if payment already exists (protect against double accept).
    existing_payment = db.execute(
        select(Payment).where(Payment.trip_id == trip.id)
    ).scalar_one_or_none()
    if existing_payment:
        logger.warning(
            f"accept_trip: Payment already exists for trip_id={trip_id}, driver_id={driver_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Payment already exists for this trip.",
        )

    driver = db.execute(select(Driver).where(Driver.user_id == driver_id)).scalar_one_or_none()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="forbidden",
        )
    if not getattr(driver, "is_available", True):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Driver is not available to accept new trips.",
        )

    # Placeholder amounts; real amount set at complete_trip before confirm.
    # Stripe requires amount >= 50 cents for EUR.
    amount_cents = 50
    total_amount = _money(Decimal("0.50"))
    commission_rate = _to_decimal(driver.commission_percent) / Decimal("100")
    commission_amount = _money(total_amount * commission_rate)
    driver_amount = _money(total_amount - commission_amount)

    # STEP 1: Create Stripe PaymentIntent (or mock when STRIPE_MOCK).
    stripe_pi_id: str
    if getattr(settings, "STRIPE_MOCK", False):
        import uuid
        stripe_pi_id = f"pi_mock_{uuid.uuid4().hex[:24]}"
        logger.info(f"accept_trip: STRIPE_MOCK — fake PI trip_id={trip_id}")
    else:
        try:
            intent = create_authorization_payment_intent(
                amount_cents=amount_cents,
                currency="EUR",
                metadata={"trip_id": str(trip.id)},
            )
            stripe_pi_id = intent.id
            logger.info(
                f"accept_trip: PaymentIntent created (requires_confirmation) trip_id={trip_id}, "
                f"payment_intent_id={stripe_pi_id}"
            )
        except stripe.error.StripeError as e:
            logger.error(
                f"accept_trip: Stripe authorization failed trip_id={trip_id}, driver_id={driver_id}, "
                f"error={str(e)}"
            )
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Payment authorization failed.",
            ) from e

    # STEP 2: Extract authorization expiration if available.
    # Note: This may not be available immediately after PaymentIntent creation.
    # It's typically available in webhook events or when retrieving the PaymentIntent later.
    authorization_expires_at = None
    # Future: Can be populated from webhook events or scheduled job that checks PaymentIntent status.

    # STEP 3: Create internal Payment record.
    payment = Payment(
        trip_id=trip.id,
        total_amount=float(total_amount),
        commission_amount=float(commission_amount),
        driver_amount=float(driver_amount),
        currency="EUR",
        status=PaymentStatus.processing,
        stripe_payment_intent_id=stripe_pi_id,
        authorization_expires_at=authorization_expires_at,
    )
    db.add(payment)

    # STEP 4: Update trip state and driver availability.
    old_status = trip.status
    trip.driver_id = driver_id
    trip.status = TripStatus.accepted
    driver.is_available = False

    # STEP 5: Single atomic commit.
    db.commit()
    db.refresh(trip)

    log_event("trip_accepted", trip_id=trip.id, driver_id=driver_id)
    log_event(
        "trip_state_change",
        trip_id=trip.id,
        from_state=old_status,
        to_state=trip.status,
    )

    # STEP 6: Emit event.
    emit(
        TripStatusChangedEvent(
            trip_id=str(trip.id),
            status=trip.status,
            timestamp=datetime.now(timezone.utc),
        )
    )

    # Future: when ENABLE_CONFIRM_ON_ACCEPT, return client_secret for frontend confirmation.
    client_secret = None
    return trip, client_secret


def accept_offer(
    *,
    db: Session,
    driver_id: str,
    offer_id: str,
) -> tuple[Trip, str | None]:
    """Accept an offer. First accept wins; others get 409 offer_already_taken."""
    offer = db.execute(
        select(TripOffer).where(TripOffer.id == offer_id).with_for_update()
    ).scalar_one_or_none()
    if not offer:
        _raise_not_found()
    if str(offer.driver_id) != str(driver_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")
    if offer.status != OfferStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="offer_already_taken",
        )

    trip = db.execute(
        select(Trip).where(Trip.id == offer.trip_id).with_for_update()
    ).scalar_one_or_none()
    if not trip:
        _raise_not_found()
    if trip.status != TripStatus.requested:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="offer_already_taken",
        )
    if trip.driver_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="offer_already_taken",
        )

    driver = db.execute(select(Driver).where(Driver.user_id == driver_id)).scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")
    if not getattr(driver, "is_available", True):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Driver is not available to accept new trips.",
        )

    # Expire other offers for this trip
    for o in db.execute(
        select(TripOffer).where(TripOffer.trip_id == trip.id, TripOffer.id != offer.id)
    ).scalars().all():
        o.status = OfferStatus.expired
    offer.status = OfferStatus.accepted

    # Same payment + trip update logic as accept_trip
    amount_cents = 50
    total_amount = _money(Decimal("0.50"))
    commission_rate = _to_decimal(driver.commission_percent) / Decimal("100")
    commission_amount = _money(total_amount * commission_rate)
    driver_amount = _money(total_amount - commission_amount)

    stripe_pi_id: str
    if getattr(settings, "STRIPE_MOCK", False):
        import uuid
        stripe_pi_id = f"pi_mock_{uuid.uuid4().hex[:24]}"
    else:
        try:
            intent = create_authorization_payment_intent(
                amount_cents=amount_cents,
                currency="EUR",
                metadata={"trip_id": str(trip.id)},
            )
            stripe_pi_id = intent.id
        except stripe.error.StripeError as e:
            logger.error(f"accept_offer: Stripe failed trip_id={trip.id}, error={e}")
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Payment authorization failed.",
            ) from e

    payment = Payment(
        trip_id=trip.id,
        total_amount=float(total_amount),
        commission_amount=float(commission_amount),
        driver_amount=float(driver_amount),
        currency="EUR",
        status=PaymentStatus.processing,
        stripe_payment_intent_id=stripe_pi_id,
        authorization_expires_at=None,
    )
    db.add(payment)

    trip.driver_id = driver_id
    trip.status = TripStatus.accepted
    driver.is_available = False

    db.commit()
    db.refresh(trip)

    log_event("trip_accepted", trip_id=trip.id, driver_id=driver_id)
    emit(
        TripStatusChangedEvent(
            trip_id=str(trip.id),
            status=trip.status,
            timestamp=datetime.now(timezone.utc),
        )
    )
    return trip, None


def reject_offer(
    *,
    db: Session,
    driver_id: str,
    offer_id: str,
) -> TripOffer:
    """Reject an offer."""
    offer = db.execute(
        select(TripOffer).where(TripOffer.id == offer_id)
    ).scalar_one_or_none()
    if not offer:
        _raise_not_found()
    if str(offer.driver_id) != str(driver_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")
    if offer.status != OfferStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="offer_already_taken",
        )
    offer.status = OfferStatus.rejected
    db.commit()
    db.refresh(offer)
    return offer


def list_offers_for_driver(
    *,
    db: Session,
    driver_id: str,
) -> list[tuple[TripOffer, Trip]]:
    """List pending offers for a driver (not expired)."""
    now = datetime.now(timezone.utc)
    rows = db.execute(
        select(TripOffer, Trip)
        .join(Trip, TripOffer.trip_id == Trip.id)
        .where(TripOffer.driver_id == driver_id)
        .where(TripOffer.status == OfferStatus.pending)
        .where(TripOffer.expires_at > now)
        .where(Trip.status == TripStatus.requested)
    ).all()
    return list(rows)


def assign_trip(
    *,
    db: Session,
    trip_id: str,
) -> Trip:
    trip = db.execute(select(Trip).where(Trip.id == trip_id)).scalar_one_or_none()
    if not trip:
        _raise_not_found()
    if trip.status == TripStatus.assigned:
        return trip
    if trip.status != TripStatus.requested:
        _raise_invalid_state()
    if trip.driver_id is not None:
        _raise_invalid_state()

    validate_trip_transition(trip.status, TripStatus.assigned, trip_id=str(trip.id))
    old_status = trip.status
    trip.status = TripStatus.assigned
    db.commit()
    db.refresh(trip)
    log_event(
        "trip_state_change",
        trip_id=trip.id,
        from_state=old_status,
        to_state=trip.status,
    )
    emit(
        TripStatusChangedEvent(
            trip_id=str(trip.id),
            status=trip.status,
            timestamp=datetime.now(timezone.utc),
        )
    )
    return trip


def list_available_trips(
    *,
    db: Session,
    driver_id: str,
) -> list[tuple[Trip, TripOffer | None]]:
    """
    Return trips available for driver: from pending offers (multi-offer) and legacy assigned pool.
    Returns (trip, offer) - offer is None for legacy assigned trips.
    """
    driver = db.execute(select(Driver).where(Driver.user_id == driver_id)).scalar_one_or_none()
    if not driver or driver.status != DriverStatus.approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="forbidden",
        )
    if not getattr(driver, "is_available", True):
        logger.info(
            "list_available_trips: driver not available",
            extra={
                "driver_id": str(driver_id),
                "driver_status": driver.status.value,
                "is_available": getattr(driver, "is_available", None),
            },
        )
        return []

    result: list[tuple[Trip, TripOffer | None]] = []

    # Multi-offer: pending offers for this driver
    for offer, trip in list_offers_for_driver(db=db, driver_id=driver_id):
        result.append((trip, offer))

    # Legacy: assigned trips (from admin assign or driver_location auto-dispatch)
    assigned_trips = list(
        db.execute(
            select(Trip).where(Trip.status == TripStatus.assigned)
        ).scalars()
    )
    driver_loc = db.execute(
        select(DriverLocation).where(DriverLocation.driver_id == driver_id)
    ).scalar_one_or_none()
    if driver_loc is not None:
        candidates: list[tuple[Trip, float]] = []
        for trip in assigned_trips:
            dist_km = haversine_km(
                float(driver_loc.lat), float(driver_loc.lng),
                float(trip.origin_lat), float(trip.origin_lng),
            )
            if dist_km <= settings.GEO_RADIUS_KM:
                candidates.append((trip, dist_km))
        candidates.sort(key=lambda x: x[1])
        for trip, _ in candidates:
            result.append((trip, None))
    else:
        for trip in assigned_trips:
            result.append((trip, None))

    logger.info(
        "list_available_trips: fetched for driver",
        extra={
            "driver_id": str(driver_id),
            "trip_count": len(result),
        },
    )
    return result


def mark_trip_arriving(
    *,
    db: Session,
    driver_id: str,
    trip_id: str,
) -> Trip:
    trip = _get_trip_for_driver(db=db, driver_id=driver_id, trip_id=trip_id)
    if trip.status != TripStatus.accepted:
        _raise_invalid_state()

    validate_trip_transition(trip.status, TripStatus.arriving, trip_id=str(trip.id))
    old_status = trip.status
    trip.status = TripStatus.arriving
    db.commit()
    db.refresh(trip)
    log_event(
        "trip_state_change",
        trip_id=trip.id,
        from_state=old_status,
        to_state=trip.status,
    )
    emit(
        TripStatusChangedEvent(
            trip_id=str(trip.id),
            status=trip.status,
            timestamp=datetime.now(timezone.utc),
        )
    )
    return trip


def start_trip(
    *,
    db: Session,
    driver_id: str,
    trip_id: str,
) -> Trip:
    trip = _get_trip_for_driver(db=db, driver_id=driver_id, trip_id=trip_id)
    if trip.status != TripStatus.arriving:
        _raise_invalid_state()

    validate_trip_transition(trip.status, TripStatus.ongoing, trip_id=str(trip.id))
    old_status = trip.status
    trip.status = TripStatus.ongoing
    trip.started_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(trip)
    log_event(
        "trip_state_change",
        trip_id=trip.id,
        from_state=old_status,
        to_state=trip.status,
    )
    emit(
        TripStatusChangedEvent(
            trip_id=str(trip.id),
            status=trip.status,
            timestamp=datetime.now(timezone.utc),
        )
    )
    return trip


def complete_trip(
    *,
    db: Session,
    driver_id: str,
    trip_id: str,
) -> Trip:
    """Complete trip and capture payment authorization.
    
    Rules:
    - trip.status must be ongoing
    - payment.status must be processing
    - payment.stripe_payment_intent_id must exist
    - Prevents double capture via row lock (FOR UPDATE) and status check
    """
    trip = _get_trip_for_driver_locked(db=db, driver_id=driver_id, trip_id=trip_id)
    
    # Validate trip state.
    validate_trip_transition(trip.status, TripStatus.completed, trip_id=str(trip.id))

    # Payment must exist (created in accept_trip).
    payment = db.execute(
        select(Payment).where(Payment.trip_id == trip.id)
    ).scalar_one_or_none()
    if not payment:
        logger.error(
            f"complete_trip: Payment not found trip_id={trip_id}, driver_id={driver_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Payment not found for completed trip.",
        )

    # Block double capture: payment must be in processing state.
    if payment.status != PaymentStatus.processing:
        logger.warning(
            f"complete_trip: Payment not in processing state trip_id={trip_id}, "
            f"payment_status={payment.status}"
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Payment status is {payment.status}, expected processing.",
        )

    # Verify PaymentIntent ID exists.
    if not payment.stripe_payment_intent_id:
        logger.error(
            f"complete_trip: Missing PaymentIntent ID trip_id={trip_id}, payment_id={payment.id}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="PaymentIntent ID not found.",
        )

    # Load driver for commission_percent (single source of truth).
    driver = db.execute(
        select(Driver).where(Driver.user_id == trip.driver_id)
    ).scalar_one_or_none()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Driver not found for trip.",
        )

    # --- Distance / duration (mock if None) ---
    distance_km = trip.distance_km
    duration_min = trip.duration_min
    if distance_km is None or duration_min is None:
        distance_km = round(random.uniform(2.0, 5.0), 2)
        duration_min = round(random.uniform(5.0, 15.0), 2)
        trip.distance_km = distance_km
        trip.duration_min = duration_min

    # --- Final price from pricing engine ---
    final_price = calculate_price(distance_km, duration_min)
    # Commission from driver (single source of truth; consistent with accept_trip).
    commission_rate = _to_decimal(driver.commission_percent) / Decimal("100")
    commission_amount = _money(Decimal(str(final_price)) * commission_rate)
    driver_payout = _money(Decimal(str(final_price)) - commission_amount)

    # --- Stripe: update, confirm, capture. Skip when STRIPE_MOCK (simulator/testing). ---
    stripe_mock = (
        getattr(settings, "STRIPE_MOCK", False)
        or (payment.stripe_payment_intent_id or "").startswith("pi_mock_")
    )
    if stripe_mock:
        logger.info(f"complete_trip: STRIPE_MOCK — skipping Stripe API trip_id={trip_id}")
    else:
        intent = retrieve_payment_intent(payment.stripe_payment_intent_id)
        pi_status = intent.status if hasattr(intent, "status") else intent.get("status")

        if pi_status != "requires_capture":
            amount_cents = max(50, int(round(final_price * 100)))
            try:
                update_payment_intent_amount(
                    payment.stripe_payment_intent_id,
                    amount_cents=amount_cents,
                )
                logger.info(
                    f"complete_trip: PaymentIntent amount updated trip_id={trip_id}, "
                    f"final_price={final_price}"
                )
            except stripe.error.StripeError as e:
                logger.error(
                    f"complete_trip: Stripe update amount failed trip_id={trip_id}, error={str(e)}"
                )
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Payment amount update failed.",
                ) from e

            try:
                if settings.ENV == "dev" or settings.ENABLE_DEV_TOOLS:
                    confirm_payment_intent(
                        payment.stripe_payment_intent_id,
                        payment_method="pm_card_visa",
                    )
                else:
                    confirm_payment_intent(payment.stripe_payment_intent_id)
                logger.info(
                    f"complete_trip: PaymentIntent confirmed trip_id={trip_id}, "
                    f"payment_intent_id={payment.stripe_payment_intent_id}"
                )
            except stripe.error.StripeError as e:
                logger.error(
                    f"complete_trip: Stripe confirm failed trip_id={trip_id}, error={str(e)}"
                )
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Payment confirmation failed.",
                ) from e
        else:
            amount_cents = intent.amount if hasattr(intent, "amount") else intent.get("amount", 0)
            final_price = round(amount_cents / 100.0, 2)
            commission_amount = _money(Decimal(str(final_price)) * commission_rate)
            driver_payout = _money(Decimal(str(final_price)) - commission_amount)
            logger.info(
                f"complete_trip: Retry — PI already requires_capture, skipping update/confirm "
                f"trip_id={trip_id}"
            )

        try:
            capture_payment_intent(payment.stripe_payment_intent_id)
            logger.info(
                f"complete_trip: PaymentIntent captured trip_id={trip_id}, "
                f"payment_intent_id={payment.stripe_payment_intent_id}"
            )
        except stripe.error.StripeError as e:
            logger.error(
                f"complete_trip: Stripe capture failed trip_id={trip_id}, "
                f"payment_intent_id={payment.stripe_payment_intent_id}, error={str(e)}"
            )
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Payment capture failed.",
            ) from e

    # --- Only after capture succeeds (or STRIPE_MOCK): update DB and commit ---
    old_status = trip.status
    trip.final_price = final_price
    trip.status = TripStatus.completed
    trip.completed_at = datetime.now(timezone.utc)
    _set_driver_available(db, trip.driver_id)
    payment.total_amount = round(final_price, 2)
    payment.commission_amount = float(commission_amount)
    payment.driver_amount = float(driver_payout)
    payment.driver_payout = float(driver_payout)
    # payment.status stays processing until webhook confirms succeeded.
    db.commit()
    db.refresh(trip)
    log_event(
        "trip_state_change",
        trip_id=trip.id,
        from_state=old_status,
        to_state=trip.status,
    )
    emit(
        TripStatusChangedEvent(
            trip_id=str(trip.id),
            status=trip.status,
            timestamp=datetime.now(timezone.utc),
        )
    )
    return trip


# --- Read-only endpoints for frontend (no financial flow changes) ---


def list_completed_trips_for_passenger(
    *,
    db: Session,
    passenger_id: str,
) -> list[Trip]:
    """Completed trips for passenger history. Read-only."""
    trips = db.execute(
        select(Trip)
        .options(joinedload(Trip.payment))
        .where(Trip.passenger_id == passenger_id)
        .where(Trip.status == TripStatus.completed)
        .order_by(Trip.completed_at.desc().nullslast())
    ).unique().scalars().all()
    return list(trips)


def list_completed_trips_for_driver(
    *,
    db: Session,
    driver_id: str,
) -> list[Trip]:
    """Completed trips for driver history. Read-only."""
    trips = db.execute(
        select(Trip)
        .options(joinedload(Trip.payment))
        .where(Trip.driver_id == driver_id)
        .where(Trip.status == TripStatus.completed)
        .order_by(Trip.completed_at.desc().nullslast())
    ).unique().scalars().all()
    return list(trips)


def get_trip_for_passenger(
    *,
    db: Session,
    passenger_id: str,
    trip_id: str,
) -> Trip:
    """Get trip for passenger (must own). Read-only."""
    trip = db.execute(
        select(Trip)
        .options(joinedload(Trip.payment))
        .where(Trip.id == trip_id)
    ).unique().scalar_one_or_none()
    if not trip or str(trip.passenger_id) != str(passenger_id):
        _raise_not_found()
    return trip


def get_trip_for_driver(
    *,
    db: Session,
    driver_id: str,
    trip_id: str,
) -> Trip:
    """Get trip for driver (must be assigned). Read-only."""
    trip = db.execute(
        select(Trip)
        .options(joinedload(Trip.payment))
        .where(Trip.id == trip_id)
    ).unique().scalar_one_or_none()
    if not trip or str(trip.driver_id) != str(driver_id):
        _raise_not_found()
    return trip


def get_trip_by_id(
    *,
    db: Session,
    trip_id: str,
) -> Trip:
    """Get trip by id (admin). Read-only."""
    trip = db.execute(
        select(Trip)
        .options(joinedload(Trip.payment))
        .where(Trip.id == trip_id)
    ).unique().scalar_one_or_none()
    if not trip:
        _raise_not_found()
    return trip

