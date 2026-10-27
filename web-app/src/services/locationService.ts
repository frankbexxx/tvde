import { apiFetch } from '../api/client'
import {
  type DriverLocationUploadOrigin,
  shouldUploadDriverLocation,
} from './driverLocationUpload'
import { warn as logWarn } from '../utils/logger'

interface SendDriverLocationPayload {
  lat: number
  lng: number
  timestamp: number
}

export interface DriverLocationServer {
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
export async function sendDriverLocation(
  lat: number,
  lng: number,
  accessToken: string,
  origin: DriverLocationUploadOrigin
): Promise<void> {
  if (!shouldUploadDriverLocation(origin)) {
    return
  }

  const payload: SendDriverLocationPayload = {
    lat,
    lng,
    timestamp: Date.now(),
  }

  try {
    await apiFetch<void>('/drivers/location', {
      method: 'POST',
      body: JSON.stringify(payload),
      token: accessToken,
    })
  } catch (err) {
    logWarn('sendDriverLocation failed, retrying once...', err)
    try {
      await apiFetch<void>('/drivers/location', {
        method: 'POST',
        body: JSON.stringify(payload),
        token: accessToken,
      })
    } catch (err2) {
      logWarn('sendDriverLocation retry failed, giving up.', err2)
      throw err2
    }
  }
}

export async function fetchDriverLastServerLocation(
  accessToken: string
): Promise<DriverLocationServer> {
  return apiFetch<DriverLocationServer>('/drivers/location/last', {
    method: 'GET',
    token: accessToken,
  })
}


