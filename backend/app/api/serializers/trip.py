"""Shared trip-to-response serializers. Used by passenger, driver, admin routers."""

import logging

from app.core.config import settings
from app.db.models.trip import Trip
from app.models.enums import PaymentStatus
from app.services.stripe_service import retrieve_payment_intent
from app.utils.stripe_links import stripe_payment_intent_dashboard_url
from app.schemas.driver import DriverLocationResponse
from app.schemas.trip import TripDetailResponse, TripHistoryItem, TripStatusResponse


logger = logging.getLogger(__name__)


def _payment_intent_client_secret_for_passenger_poll(trip: Trip) -> str | None:
    """Expose client_secret for Stripe.js when passenger must confirm authorized PI."""
    if not settings.ENABLE_CONFIRM_ON_ACCEPT:
        return None
    payment = trip.payment
    if not payment or not payment.stripe_payment_intent_id:
        return None
    if payment.status != PaymentStatus.processing:
        return None
    pi_id = payment.stripe_payment_intent_id
    if getattr(settings, "STRIPE_MOCK", False):
        return f"{pi_id}_secret_mock"
    try:
        pi = retrieve_payment_intent(pi_id)
        return pi.client_secret
    except Exception as e:
        logger.warning(
            "retrieve_payment_intent failed for passenger poll trip_id=%s: %s",
            trip.id,
            e,
        )
        return None


def trip_to_history_item(
    trip: Trip, include_stripe_pi: bool = False
) -> TripHistoryItem:
    payment = trip.payment
    return TripHistoryItem(
        trip_id=str(trip.id),
        status=trip.status,
        origin_lat=float(trip.origin_lat),
        origin_lng=float(trip.origin_lng),
        destination_lat=float(trip.destination_lat),
        destination_lng=float(trip.destination_lng),
        estimated_price=float(trip.estimated_price),
        final_price=float(trip.final_price) if trip.final_price is not None else None,
        completed_at=trip.completed_at,
        payment_status=payment.status if payment else None,
        commission_amount=float(payment.commission_amount) if payment else None,
        driver_payout=float(payment.driver_payout)
        if payment and payment.driver_payout
        else None,
        stripe_payment_intent_id=payment.stripe_payment_intent_id
        if payment and include_stripe_pi
        else None,
        cancellation_reason=trip.cancellation_reason,
    )


def trip_to_detail(
    trip: Trip,
    include_stripe_pi: bool = False,
    driver_location: DriverLocationResponse | None = None,
    include_passenger_payment_client_secret: bool = False,
) -> TripDetailResponse:
    payment = trip.payment
    client_secret = (
        _payment_intent_client_secret_for_passenger_poll(trip)
        if include_passenger_payment_client_secret
        else None
    )
    return TripDetailResponse(
        trip_id=str(trip.id),
        status=trip.status,
        passenger_id=str(trip.passenger_id),
        driver_id=str(trip.driver_id) if trip.driver_id else None,
        origin_lat=float(trip.origin_lat),
        origin_lng=float(trip.origin_lng),
        destination_lat=float(trip.destination_lat),
        destination_lng=float(trip.destination_lng),
        estimated_price=float(trip.estimated_price),
        final_price=float(trip.final_price) if trip.final_price is not None else None,
        distance_km=float(trip.distance_km) if trip.distance_km is not None else None,
        duration_min=float(trip.duration_min)
        if trip.duration_min is not None
        else None,
        started_at=trip.started_at,
        completed_at=trip.completed_at,
        created_at=trip.created_at,
        updated_at=trip.updated_at,
        payment_status=payment.status if payment else None,
        commission_amount=float(payment.commission_amount) if payment else None,
        driver_payout=float(payment.driver_payout)
        if payment and payment.driver_payout
        else None,
        stripe_payment_intent_id=payment.stripe_payment_intent_id
        if payment and include_stripe_pi
        else None,
        stripe_dashboard_url=(
            stripe_payment_intent_dashboard_url(payment.stripe_payment_intent_id)
            if payment and include_stripe_pi
            else None
        ),
        driver_location=driver_location,
        driver_rating=trip.driver_rating,
        passenger_rating=trip.passenger_rating,
        cancellation_reason=trip.cancellation_reason,
        payment_intent_client_secret=client_secret,
    )


def trip_to_status_response(
    trip: Trip,
    include_stripe_pi: bool = False,
    payment_intent_client_secret: str | None = None,
) -> TripStatusResponse:
    payment = trip.payment
    return TripStatusResponse(
        trip_id=str(trip.id),
        status=trip.status,
        payment_status=payment.status if payment else None,
        final_price=float(trip.final_price) if trip.final_price is not None else None,
        commission_amount=float(payment.commission_amount) if payment else None,
        driver_payout=float(payment.driver_payout)
        if payment and payment.driver_payout
        else None,
        stripe_payment_intent_id=payment.stripe_payment_intent_id
        if payment and include_stripe_pi
        else None,
        payment_intent_client_secret=payment_intent_client_secret,
    )
