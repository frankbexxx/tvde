import { apiFetch } from '../api/client'

export interface DriverLocationResponse {
  lat: number
  lng: number
  timestamp: number
}

/** B001: valid states, not errors — 404 = aguardando motorista, 409 = viagem terminada */
export type DriverLocationResult =
  | { ok: true; lat: number; lng: number }
  | { ok: false; reason: 'driver_not_assigned' }
  | { ok: false; reason: 'trip_completed' }

/**
 * Fetches the latest driver location for a given trip.
 * B001: 404 and 409 are valid states, not errors — no retry, no error logs.
 */
export async function getDriverLocation(tripId: string): Promise<DriverLocationResult> {
  try {
    const res = await apiFetch<DriverLocationResponse>(`/trips/${tripId}/driver-location`)
    return { ok: true, lat: res.lat, lng: res.lng }
  } catch (err) {
    const status = (err as { status?: number })?.status
    const detail = (err as { detail?: string })?.detail

    if (status === 404 || detail === 'driver_not_assigned') {
      return { ok: false, reason: 'driver_not_assigned' }
    }
    if (status === 409 || (typeof detail === 'string' && detail.includes('trip_not_active'))) {
      return { ok: false, reason: 'trip_completed' }
    }
    // Real error: 5xx, network failure
    if (status != null && status >= 500) {
      console.warn('getDriverLocation server error', status, detail)
    } else if (status === 0) {
      console.warn('getDriverLocation network failure', detail)
    }
    throw err
  }
}

