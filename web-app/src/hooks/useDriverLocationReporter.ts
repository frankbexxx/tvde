import { useEffect } from 'react'
import { sendDriverLocation } from '../services/locationService'
import { warn as logWarn } from '../utils/logger'

const DEFAULT_INTERVAL_MS = 5000
const ACTIVE_TRIP_INTERVAL_MS = 4000

export function useDriverLocationReporter(options: {
  /** Ex.: motorista online, com token e fix GPS. */
  enabled: boolean
  lat: number | undefined
  lng: number | undefined
  /** Se true, intervalo um pouco mais curto (ainde dentro de 3–5s). */
  hasActiveTrip: boolean
}): void {
  const { enabled, lat, lng, hasActiveTrip } = options
  const intervalMs = hasActiveTrip ? ACTIVE_TRIP_INTERVAL_MS : DEFAULT_INTERVAL_MS

  useEffect(() => {
    if (!enabled || lat == null || lng == null) return

    let cancelled = false

    void sendDriverLocation(lat, lng).catch((err) => {
      if (!cancelled) logWarn('Failed to send driver location (first)', err)
    })

    const id = window.setInterval(() => {
      if (cancelled) return
      void sendDriverLocation(lat, lng).catch((err) => {
        if (!cancelled) logWarn('Failed to send driver location', err)
      })
    }, intervalMs)

    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [enabled, lat, lng, intervalMs])
}
