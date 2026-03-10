import { apiFetch } from '../api/client'

export interface DriverLocationResponse {
  lat: number
  lng: number
  timestamp: number
}

/**
 * Fetches the latest driver location for a given trip.
 *
 * Endpoint:
 *   GET /trips/{tripId}/driver-location
 */
export async function getDriverLocation(tripId: string): Promise<DriverLocationResponse> {
  try {
    return await apiFetch<DriverLocationResponse>(`/trips/${tripId}/driver-location`)
  } catch (err) {
    console.warn('getDriverLocation failed, retrying once...', err)
    return apiFetch<DriverLocationResponse>(`/trips/${tripId}/driver-location`)
  }
}

