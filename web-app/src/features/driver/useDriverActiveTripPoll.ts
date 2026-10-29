import { useCallback } from 'react'
import { getDriverTripDetail } from '../../api/trips'
import { usePolling } from '../../hooks/usePolling'
import { currentSessionFamily } from './driverSessionFamily'
import { resolveDriverTripPollFailure } from './driverAvailabilitySync'
import { driverTripPollEquals, type DriverTripPollResult } from './driverTripPollEquals'

export type DriverActiveTripPollState = {
  poll: DriverTripPollResult | null
  isRefreshing: boolean
  lastSuccessAt: number | null
  pollFault: boolean
  refetch: () => Promise<void>
}

/** Uma fonte de verdade para poll GET /driver/trips/:id (2s). */
export function useDriverActiveTripPoll(
  tripId: string | null | undefined,
  token: string | null | undefined,
  enabled = true
): DriverActiveTripPollState {
  const fetchTrip = useCallback((): Promise<DriverTripPollResult> => {
    if (!tripId || !token) return Promise.resolve({ trip: null, notFound: false })
    const requestFamily = currentSessionFamily()
    return getDriverTripDetail(tripId, token)
      .then((t) => {
        if (currentSessionFamily() !== requestFamily) return { trip: null, notFound: true }
        return { trip: t, notFound: false }
      })
      .catch((e: unknown) => {
        const st = (e as { status?: number })?.status
        const decision = resolveDriverTripPollFailure({
          requestFamily,
          currentFamily: currentSessionFamily(),
          httpStatus: st,
        })
        if (decision === 'keep') throw e
        return { trip: null, notFound: true }
      })
  }, [tripId, token])

  const { data, isRefreshing, lastSuccessAt, pollFault, refetch } = usePolling<DriverTripPollResult>(
    fetchTrip,
    [fetchTrip],
    Boolean(enabled && tripId && token),
    2000,
    { equals: driverTripPollEquals }
  )

  return {
    poll: data,
    isRefreshing,
    lastSuccessAt,
    pollFault,
    refetch,
  }
}
