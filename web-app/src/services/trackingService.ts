import { apiFetch } from '../api/client'

export interface DriverLocationResponse {
  lat: number
  lng: number
  timestamp: number
}

/**
 * Fetches the latest driver location for a given trip.
 *
 * Backend endpoint (to be implemented server-side):
 *   GET /trips/{tripId}/driver-location
 */
export async function getDriverLocation(tripId: string): Promise<DriverLocationResponse> {
  // TODO: ensure backend implements this route and response shape.
  return apiFetch<DriverLocationResponse>(`/trips/${tripId}/driver-location`)
}

