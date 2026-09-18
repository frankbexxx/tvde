import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { AUTH_LOGOUT_EVENT } from '../constants/events'
import {
  ActiveTripProvider,
  useActiveTrip,
} from './ActiveTripContext'
import {
  PASSENGER_ACTIVE_TRIP_STORAGE_KEY,
  writePassengerActiveTripIdToStorage,
} from '../features/passenger/passengerActiveTripRecovery'

function wrapper({ children }: { children: ReactNode }) {
  return <ActiveTripProvider>{children}</ActiveTripProvider>
}

describe('ActiveTripContext logout cleanup (L-FE-02)', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  it('clears passenger storage + React state on AUTH_LOGOUT_EVENT', async () => {
    writePassengerActiveTripIdToStorage('trip-from-A')

    const { result } = renderHook(() => useActiveTrip(), { wrapper })

    await waitFor(() => expect(result.current.passengerActiveTripId).toBe('trip-from-A'))

    act(() => {
      result.current.setDriverActiveTripId('driver-trip-A')
    })
    expect(result.current.driverActiveTripId).toBe('driver-trip-A')

    act(() => {
      window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT))
    })

    expect(sessionStorage.getItem(PASSENGER_ACTIVE_TRIP_STORAGE_KEY)).toBeNull()
    expect(result.current.passengerActiveTripId).toBeNull()
    expect(result.current.driverActiveTripId).toBeNull()
  })

  it('relogin path does not revive prior passenger trip id from storage', async () => {
    writePassengerActiveTripIdToStorage('trip-from-A')
    const { result, unmount } = renderHook(() => useActiveTrip(), { wrapper })
    await waitFor(() => expect(result.current.passengerActiveTripId).toBe('trip-from-A'))

    act(() => {
      window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT))
    })
    expect(sessionStorage.getItem(PASSENGER_ACTIVE_TRIP_STORAGE_KEY)).toBeNull()
    unmount()

    // Simulate next login / new provider mount (passenger B) — storage empty
    const { result: resultB } = renderHook(() => useActiveTrip(), { wrapper })
    expect(resultB.current.passengerActiveTripId).toBeNull()
    expect(sessionStorage.getItem(PASSENGER_ACTIVE_TRIP_STORAGE_KEY)).toBeNull()
  })
})
