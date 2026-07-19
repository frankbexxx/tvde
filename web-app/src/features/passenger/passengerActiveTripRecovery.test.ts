import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import {
  PASSENGER_ACTIVE_TRIP_STORAGE_KEY,
  isPassengerActiveTripStatus,
  readPassengerActiveTripIdFromStorage,
  resolvePassengerActiveTripId,
  shouldBootstrapPassengerActiveTrip,
  shouldClearPassengerLocalTripOnActiveMiss,
  writePassengerActiveTripIdToStorage,
} from './passengerActiveTripRecovery'
import { PASSENGER_SEARCH_FALLBACK_AFTER_SEC } from './PassengerStatusCard'

describe('passengerActiveTripRecovery', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  it('isPassengerActiveTripStatus covers non-terminal statuses', () => {
    for (const s of ['requested', 'assigned', 'accepted', 'arriving', 'ongoing']) {
      expect(isPassengerActiveTripStatus(s)).toBe(true)
    }
    for (const s of ['completed', 'cancelled', 'failed', null, undefined]) {
      expect(isPassengerActiveTripStatus(s)).toBe(false)
    }
  })

  it('shouldBootstrapPassengerActiveTrip only for passenger with token', () => {
    expect(
      shouldBootstrapPassengerActiveTrip({ token: 't', sessionRole: 'passenger' })
    ).toBe(true)
    expect(shouldBootstrapPassengerActiveTrip({ token: null, sessionRole: 'passenger' })).toBe(
      false
    )
    expect(shouldBootstrapPassengerActiveTrip({ token: 't', sessionRole: 'driver' })).toBe(false)
  })

  it('resolvePassengerActiveTripId prefers backend active trip', () => {
    expect(
      resolvePassengerActiveTripId({
        backendActiveTripId: 'new',
        localTripId: 'old',
      })
    ).toBe('new')
  })

  it('resolvePassengerActiveTripId keeps local id on transient null backend', () => {
    expect(
      resolvePassengerActiveTripId({
        backendActiveTripId: null,
        localTripId: 'local',
        localTripTerminalOrMissing: false,
      })
    ).toBe('local')
  })

  it('resolvePassengerActiveTripId clears when terminal/missing confirmed', () => {
    expect(
      resolvePassengerActiveTripId({
        backendActiveTripId: null,
        localTripId: 'local',
        localTripTerminalOrMissing: true,
      })
    ).toBe(null)
  })

  it('shouldClearPassengerLocalTripOnActiveMiss: cancelled/failed yes, completed no', () => {
    expect(shouldClearPassengerLocalTripOnActiveMiss('cancelled')).toBe(true)
    expect(shouldClearPassengerLocalTripOnActiveMiss('failed')).toBe(true)
    expect(shouldClearPassengerLocalTripOnActiveMiss('completed')).toBe(false)
    expect(shouldClearPassengerLocalTripOnActiveMiss('requested')).toBe(false)
    expect(shouldClearPassengerLocalTripOnActiveMiss('accepted')).toBe(false)
  })

  it('restore keep path: completed keeps id when /trips/active is null', () => {
    // Mirrors Option A: after active-miss, completed must not set localTripTerminalOrMissing.
    expect(shouldClearPassengerLocalTripOnActiveMiss('completed')).toBe(false)
    expect(
      resolvePassengerActiveTripId({
        backendActiveTripId: null,
        localTripId: 'completed-trip',
        localTripTerminalOrMissing: shouldClearPassengerLocalTripOnActiveMiss('completed'),
      })
    ).toBe('completed-trip')
  })

  it('restore clear path: cancelled/failed clear id when /trips/active is null', () => {
    for (const status of ['cancelled', 'failed'] as const) {
      expect(
        resolvePassengerActiveTripId({
          backendActiveTripId: null,
          localTripId: 'gone-trip',
          localTripTerminalOrMissing: shouldClearPassengerLocalTripOnActiveMiss(status),
        })
      ).toBe(null)
    }
  })

  it('sessionStorage round-trip for active trip id', () => {
    writePassengerActiveTripIdToStorage('trip-abc')
    expect(sessionStorage.getItem(PASSENGER_ACTIVE_TRIP_STORAGE_KEY)).toBe('trip-abc')
    expect(readPassengerActiveTripIdFromStorage()).toBe('trip-abc')
    writePassengerActiveTripIdToStorage(null)
    expect(readPassengerActiveTripIdFromStorage()).toBe(null)
  })

  it('search fallback constant does not imply clearing active trip (UX-only 25s)', () => {
    // Guard: fallback delay must remain copy-only; recovery module never clears on this timer.
    expect(PASSENGER_SEARCH_FALLBACK_AFTER_SEC).toBe(25)
    expect(
      resolvePassengerActiveTripId({
        backendActiveTripId: 'still-active',
        localTripId: 'still-active',
      })
    ).toBe('still-active')
  })
})
