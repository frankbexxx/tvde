import type { TripDetailResponse } from '../../api/trips'

/** Resultado do poll GET /trips/:id (passageiro). */
export type PassengerTripPollResult = {
  trip: TripDetailResponse | null
  notFound: boolean
}

function sameNum(a: number, b: number, eps = 1e-5): boolean {
  return Math.abs(a - b) < eps
}

function optSameNum(
  a: number | null | undefined,
  b: number | null | undefined
): boolean {
  if (a == null && b == null) return true
  if (a == null || b == null) return false
  return sameNum(a, b)
}

/**
 * Comparação de dois `TripDetailResponse` para polls (motorista e passageiro).
 * Omite `driver_location` (posição vem de polls dedicados)
 * e `updated_at` / `created_at` (mudam sem efeito visual útil no painel).
 */
export function tripDetailPollSemanticallyEqual(
  a: TripDetailResponse,
  b: TripDetailResponse
): boolean {
  return (
    a.trip_id === b.trip_id &&
    a.status === b.status &&
    a.passenger_id === b.passenger_id &&
    (a.driver_id ?? '') === (b.driver_id ?? '') &&
    sameNum(a.origin_lat, b.origin_lat) &&
    sameNum(a.origin_lng, b.origin_lng) &&
    sameNum(a.destination_lat, b.destination_lat) &&
    sameNum(a.destination_lng, b.destination_lng) &&
    sameNum(a.estimated_price, b.estimated_price) &&
    optSameNum(a.final_price, b.final_price) &&
    optSameNum(a.distance_km, b.distance_km) &&
    optSameNum(a.duration_min, b.duration_min) &&
    (a.started_at ?? '') === (b.started_at ?? '') &&
    (a.completed_at ?? '') === (b.completed_at ?? '') &&
    (a.payment_status ?? undefined) === (b.payment_status ?? undefined) &&
    optSameNum(a.commission_amount, b.commission_amount) &&
    optSameNum(a.driver_payout, b.driver_payout) &&
    (a.driver_rating ?? null) === (b.driver_rating ?? null) &&
    (a.passenger_rating ?? null) === (b.passenger_rating ?? null) &&
    (a.payment_intent_client_secret ?? '') === (b.payment_intent_client_secret ?? '')
  )
}

export function passengerTripPollEquals(
  prev: PassengerTripPollResult,
  next: PassengerTripPollResult
): boolean {
  if (prev.notFound !== next.notFound) return false
  if (prev.trip == null && next.trip == null) return true
  if (prev.trip == null || next.trip == null) return false
  return tripDetailPollSemanticallyEqual(prev.trip, next.trip)
}
