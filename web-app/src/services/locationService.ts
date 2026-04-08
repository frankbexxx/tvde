import { apiFetch } from '../api/client'
import { warn as logWarn } from '../utils/logger'

interface SendDriverLocationPayload {
  lat: number
  lng: number
  timestamp: number
}

/**
 * Sends the driver's current location to the backend.
 *
 * Endpoint:
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

  try {
    await apiFetch<void>('/drivers/location', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  } catch (err) {
    logWarn('sendDriverLocation failed, retrying once...', err)
    try {
      await apiFetch<void>('/drivers/location', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    } catch (err2) {
      logWarn('sendDriverLocation retry failed, giving up.', err2)
      throw err2
    }
  }
}


