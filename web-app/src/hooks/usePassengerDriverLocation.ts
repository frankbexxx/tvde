import { useEffect, useState } from 'react'
import type { TripDetailResponse } from '../api/trips'
import { getDriverLocation } from '../services/trackingService'
import { warn as logWarn } from '../utils/logger'

/** Estados em que o backend expõe rasto e o passageiro deve ver movimento. */
export const PASSENGER_DRIVER_TRACKING_STATUSES = ['accepted', 'arriving', 'ongoing'] as const

export type PassengerDriverTrackingStatus = (typeof PASSENGER_DRIVER_TRACKING_STATUSES)[number]

export function isPassengerDriverTrackingStatus(s: string | undefined): s is PassengerDriverTrackingStatus {
  return s != null && (PASSENGER_DRIVER_TRACKING_STATUSES as readonly string[]).includes(s)
}

/**
 * Posição do motorista: mistura `driver_location` do GET /trips/:id com poll em /driver-location.
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
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    if (!activeTrip || !isPassengerDriverTrackingStatus(activeTrip.status)) {
      return
    }
    const emb = activeTrip.driver_location
    if (emb) {
      setDriverLocation({ lat: emb.lat, lng: emb.lng })
    }
  }, [
    activeTrip?.trip_id,
    activeTrip?.status,
    activeTrip?.driver_location?.lat,
    activeTrip?.driver_location?.lng,
    activeTrip?.driver_location?.timestamp,
  ])

  useEffect(() => {
    if (!activeTripId || tripCompletedFromLocation) {
      setDriverLocation(null)
      return
    }
    const st = activeTrip?.status
    if (!isPassengerDriverTrackingStatus(st)) {
      setDriverLocation(null)
      return
    }

    let cancelled = false

    const pollOnce = () => {
      if (cancelled) return
      void getDriverLocation(activeTripId)
        .then((result) => {
          if (cancelled) return
          if (result.ok) {
            setDriverLocation({ lat: result.lat, lng: result.lng })
          } else if (result.reason === 'trip_completed') {
            onTripCompletedFromLocation?.()
            setDriverLocation(null)
          }
          // 404 / location_unavailable: manter última posição (embed ou tick anterior)
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
