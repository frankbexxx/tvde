/**
 * B002: UX state layer for passenger — derived from trip + driver location.
 * 500ms minimum delay on state changes to avoid flicker and abrupt transitions.
 */
import { useEffect, useState } from 'react'
import type { TripDetailResponse } from '../../api/trips'

export type PassengerUxState =
  | 'SEARCHING_DRIVER'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_ARRIVING'
  | 'TRIP_ONGOING'
  | 'TRIP_COMPLETED'

const UX_STATE_DELAY_MS = 400

function deriveRawUxState(
  activeTrip: TripDetailResponse | null | undefined,
  _hasDriverLocation: boolean,
  tripCompletedFromLocation: boolean
): PassengerUxState | null {
  if (tripCompletedFromLocation || activeTrip?.status === 'completed') {
    return 'TRIP_COMPLETED'
  }
  if (!activeTrip) return null

  // A014: `assigned` = motorista encontrado, mesmo sem GPS ainda (não confundir com SEARCHING).
  switch (activeTrip.status) {
    case 'ongoing':
      return 'TRIP_ONGOING'
    case 'arriving':
      return 'DRIVER_ARRIVING'
    case 'assigned':
    case 'accepted':
      return 'DRIVER_ASSIGNED'
    case 'requested':
      return 'SEARCHING_DRIVER'
    default:
      return null
  }
}

export function usePassengerUxState(
  activeTrip: TripDetailResponse | null | undefined,
  hasDriverLocation: boolean,
  tripCompletedFromLocation: boolean
): PassengerUxState | null {
  const rawState = deriveRawUxState(activeTrip, hasDriverLocation, tripCompletedFromLocation)
  const [displayedState, setDisplayedState] = useState<PassengerUxState | null>(null)

  useEffect(() => {
    if (rawState === null) {
      setDisplayedState(null)
      return
    }
    const t = setTimeout(() => setDisplayedState(rawState), UX_STATE_DELAY_MS)
    return () => clearTimeout(t)
  }, [rawState])

  return displayedState
}
