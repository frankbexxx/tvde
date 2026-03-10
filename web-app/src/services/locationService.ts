import { apiFetch } from '../api/client'

interface SendDriverLocationPayload {
  lat: number
  lng: number
  timestamp: number
}

/**
 * Sends the driver's current location to the backend.
 *
 * Backend endpoint (to be implemented server-side):
 *   POST /drivers/location
 *
 * Payload:
 *   { lat, lng, timestamp }
 */
export async function sendDriverLocation(lat: number, lng: number): Promise<void> {
  const payload: SendDriverLocationPayload = {
    lat,
    lng,
    timestamp: Date.now(),
  }

  // TODO: ensure backend route /drivers/location exists and accepts this payload.
  await apiFetch<void>('/drivers/location', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

