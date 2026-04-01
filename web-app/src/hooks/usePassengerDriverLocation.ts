import { useEffect, useMemo, useState } from 'react'
import type { TripDetailResponse } from '../api/trips'
import { getDriverLocation } from '../services/trackingService'
import { warn as logWarn } from '../utils/logger'

/** Estados em que o backend expõe rasto e o passageiro deve ver movimento. */
export const PASSENGER_DRIVER_TRACKING_STATUSES = ['accepted', 'arriving', 'ongoing'] as const

export type PassengerDriverTrackingStatus = (typeof PASSENGER_DRIVER_TRACKING_STATUSES)[number]

export function isPassengerDriverTrackingStatus(s: string | undefined): s is PassengerDriverTrackingStatus {
  return s != null && (PASSENGER_DRIVER_TRACKING_STATUSES as readonly string[]).includes(s)
}

type PolledPoint = { tripId: string; lat: number; lng: number }

/**
 * Posição do motorista: mistura `driver_location` do GET /trips/:id com poll em /driver-location.
 * Estado do poll só é atualizado em callbacks assíncronos (compatível com react-hooks/set-state-in-effect).
 */
export function usePassengerDriverLocation(options: {
  activeTripId: string | null
  activeTrip: TripDetailResponse | null
  tripCompletedFromLocation: boolean
  pollIntervalMs: number
  onTripCompletedFromLocation?: () => void
}): { driverLocation: { lat: number; lng: number } | null } {
  const { activeTripId, activeTrip, tripCompletedFromLocation, pollIntervalMs, onTripCompletedFromLocation } =
    options

  const embeddedDriverLocation = useMemo((): { lat: number; lng: number } | null => {
    if (!activeTrip || !activeTripId || tripCompletedFromLocation) return null
    if (!isPassengerDriverTrackingStatus(activeTrip.status)) return null
    const emb = activeTrip.driver_location
    if (!emb) return null
    return { lat: emb.lat, lng: emb.lng }
  }, [activeTrip, activeTripId, tripCompletedFromLocation])

  const [polled, setPolled] = useState<PolledPoint | null>(null)

  const driverLocation = useMemo(() => {
    if (!activeTripId || tripCompletedFromLocation) return null
    if (!isPassengerDriverTrackingStatus(activeTrip?.status)) return null
    if (polled?.tripId === activeTripId) {
      return { lat: polled.lat, lng: polled.lng }
    }
    return embeddedDriverLocation
  }, [activeTripId, tripCompletedFromLocation, polled, embeddedDriverLocation, activeTrip])

  useEffect(() => {
    if (!activeTripId || tripCompletedFromLocation) {
      return
    }
    const st = activeTrip?.status
    if (!isPassengerDriverTrackingStatus(st)) {
      return
    }

    let cancelled = false

    const pollOnce = () => {
      if (cancelled) return
      void getDriverLocation(activeTripId)
        .then((result) => {
          if (cancelled) return
          if (result.ok) {
            setPolled({ tripId: activeTripId, lat: result.lat, lng: result.lng })
          } else if (result.reason === 'trip_completed') {
            onTripCompletedFromLocation?.()
            setPolled(null)
          }
        })
        .catch((err) => {
          if (cancelled) return
          const stErr = (err as { status?: number })?.status
          if (stErr != null && stErr >= 500) {
            logWarn('getDriverLocation falha de servidor', err)
          } else if (stErr === 0) {
            logWarn('getDriverLocation rede / timeout', err)
          } else {
            logWarn('getDriverLocation', err)
          }
        })
    }

    pollOnce()
    const interval = window.setInterval(pollOnce, pollIntervalMs)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [activeTripId, activeTrip?.status, tripCompletedFromLocation, pollIntervalMs, onTripCompletedFromLocation])

  return { driverLocation }
}
