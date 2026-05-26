import { useCallback } from 'react'
import { getDriverTripDetail } from '../../api/trips'
import { usePolling } from '../../hooks/usePolling'
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
    return getDriverTripDetail(tripId, token)
      .then((t) => ({ trip: t, notFound: false }))
      .catch((e: unknown) => {
        const st = (e as { status?: number })?.status
        if (st === 404) return { trip: null, notFound: true }
        throw e
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
