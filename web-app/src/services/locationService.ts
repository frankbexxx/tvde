import { apiFetch } from '../api/client'
import {
  GPS_CONTRACT_FIX_V1,
  GPS_CONTRACT_HEADER,
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
 *
 * `device_gps` sends `GeolocationPosition.timestamp` and `X-Gps-Contract: fix-v1`.
 * It does not invent a timestamp from the send clock. Mock E2E keeps the legacy
 * contract (no fix-v1 header) so it is not presented as a real GPS fix.
 */
export async function sendDriverLocation(
  lat: number,
  lng: number,
  accessToken: string,
  origin: DriverLocationUploadOrigin,
  fixTimestampMs?: number
): Promise<void> {
  if (!shouldUploadDriverLocation(origin)) {
    return
  }

  const isRealFix = origin === 'device_gps'
  if (isRealFix && (fixTimestampMs == null || !Number.isFinite(fixTimestampMs))) {
    return
  }

  const payload: SendDriverLocationPayload = {
    lat,
    lng,
    timestamp: isRealFix ? fixTimestampMs! : Date.now(),
  }
  const headers = isRealFix
    ? { [GPS_CONTRACT_HEADER]: GPS_CONTRACT_FIX_V1 }
    : undefined

  try {
    await apiFetch<void>('/drivers/location', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers,
      token: accessToken,
    })
  } catch (err) {
    logWarn('sendDriverLocation failed, retrying once...', err)
    try {
      await apiFetch<void>('/drivers/location', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers,
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


