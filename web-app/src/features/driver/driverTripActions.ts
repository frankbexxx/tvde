/**
 * Orquestração das chamadas API do fluxo motorista (espelha ActiveTripActions).
 * Módulo separado para testes sem DOM nem backend.
 */
import {
  acceptTrip,
  cancelTripByDriver,
  completeTrip,
  markArriving,
  startTrip,
} from '../../api/trips'
import type { TripStatusResponse } from '../../api/trips'

export async function driverPerformAccept(
  tripId: string,
  token: string
): Promise<TripStatusResponse> {
  return acceptTrip(tripId, token)
}

/** accepted → arriving → ongoing (um clique na UI). */
export async function driverPerformStartFromAccepted(
  tripId: string,
  token: string
): Promise<TripStatusResponse> {
  await markArriving(tripId, token)
  return startTrip(tripId, token)
}

export async function driverPerformStartFromArriving(
  tripId: string,
  token: string
): Promise<TripStatusResponse> {
  return startTrip(tripId, token)
}

export async function driverPerformComplete(
  tripId: string,
  token: string
): Promise<TripStatusResponse> {
  return completeTrip(tripId, token)
}

export async function driverPerformCancel(
  tripId: string,
  token: string
): Promise<TripStatusResponse> {
  return cancelTripByDriver(tripId, token)
}
