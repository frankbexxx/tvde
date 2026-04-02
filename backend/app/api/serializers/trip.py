"""Shared trip-to-response serializers. Used by passenger, driver, admin routers."""

from app.db.models.trip import Trip
from app.schemas.driver import DriverLocationResponse
from app.schemas.trip import TripDetailResponse, TripHistoryItem, TripStatusResponse


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
    )


def trip_to_detail(
    trip: Trip,
    include_stripe_pi: bool = False,
    driver_location: DriverLocationResponse | None = None,
) -> TripDetailResponse:
    payment = trip.payment
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
        driver_location=driver_location,
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
