import type { TripDetailResponse } from '../../api/trips'
import { tripDetailPollSemanticallyEqual } from '../passenger/passengerTripPollEquals'

/** Resultado do poll GET /driver/trips/:id (motorista). */
export type DriverTripPollResult = {
  trip: TripDetailResponse | null
  notFound: boolean
}

export function driverTripPollEquals(prev: DriverTripPollResult, next: DriverTripPollResult): boolean {
  if (prev.notFound !== next.notFound) return false
  if (prev.trip == null && next.trip == null) return true
  if (prev.trip == null || next.trip == null) return false
  return tripDetailPollSemanticallyEqual(prev.trip, next.trip)
}
