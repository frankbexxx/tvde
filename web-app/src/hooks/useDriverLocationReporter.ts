import { useEffect, useState } from 'react'
import { sendDriverLocation } from '../services/locationService'
import { warn as logWarn } from '../utils/logger'
import type { ApiError } from '../api/client'

const DEFAULT_INTERVAL_MS = 5000
const ACTIVE_TRIP_INTERVAL_MS = 4000

export function useDriverLocationReporter(options: {
  /** Ex.: motorista online, com token e fix GPS. */
  enabled: boolean
  /** JWT motorista — obrigatório quando enabled (E2E pode não ter access_token em localStorage). */
  accessToken: string | null
  lat: number | undefined
  lng: number | undefined
  /** Se true, intervalo um pouco mais curto (ainde dentro de 3–5s). */
  hasActiveTrip: boolean
}): {
  lastOkAt: number | null
  lastError: ApiError | null
} {
  const { enabled, accessToken, lat, lng, hasActiveTrip } = options
  const intervalMs = hasActiveTrip ? ACTIVE_TRIP_INTERVAL_MS : DEFAULT_INTERVAL_MS
  const [lastOkAt, setLastOkAt] = useState<number | null>(null)
  const [lastError, setLastError] = useState<ApiError | null>(null)

  useEffect(() => {
    if (!enabled || !accessToken || lat == null || lng == null) return

    let cancelled = false

    void sendDriverLocation(lat, lng, accessToken)
      .then(() => {
        if (cancelled) return
        setLastOkAt(Date.now())
        setLastError(null)
      })
      .catch((err) => {
        if (cancelled) return
        logWarn('Failed to send driver location (first)', err)
        setLastError(err as ApiError)
      })

    const id = window.setInterval(() => {
      if (cancelled) return
      void sendDriverLocation(lat, lng, accessToken)
        .then(() => {
          if (cancelled) return
          setLastOkAt(Date.now())
          setLastError(null)
        })
        .catch((err) => {
          if (cancelled) return
          logWarn('Failed to send driver location', err)
          setLastError(err as ApiError)
        })
    }, intervalMs)

    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [enabled, accessToken, lat, lng, intervalMs])

  return { lastOkAt, lastError }
}
