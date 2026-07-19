/**
 * PASSENGER-REQUEST-TIMEOUT-UX-1: recover non-terminal trip after reload / retry races.
 * Mirrors driver `shouldBootstrapDriverActiveTrip` + restore pattern (#398).
 */

export const PASSENGER_ACTIVE_TRIP_STORAGE_KEY = 'passenger_active_trip_id'
const E2E_PASSENGER_TRIP_KEY = 'e2e_passenger_trip_id'

const ACTIVE_STATUSES = new Set([
  'requested',
  'assigned',
  'accepted',
  'arriving',
  'ongoing',
])

export function isPassengerActiveTripStatus(status: string | null | undefined): boolean {
  return Boolean(status && ACTIVE_STATUSES.has(status))
}

export function readPassengerActiveTripIdFromStorage(): string | null {
  try {
    if (import.meta.env.VITE_E2E === 'true') {
      return (
        sessionStorage.getItem(E2E_PASSENGER_TRIP_KEY) ??
        sessionStorage.getItem(PASSENGER_ACTIVE_TRIP_STORAGE_KEY)
      )
    }
    return sessionStorage.getItem(PASSENGER_ACTIVE_TRIP_STORAGE_KEY)
  } catch {
    return null
  }
}

export function writePassengerActiveTripIdToStorage(id: string | null): void {
  try {
    if (id) {
      sessionStorage.setItem(PASSENGER_ACTIVE_TRIP_STORAGE_KEY, id)
      if (import.meta.env.VITE_E2E === 'true') {
        sessionStorage.setItem(E2E_PASSENGER_TRIP_KEY, id)
      }
    } else {
      sessionStorage.removeItem(PASSENGER_ACTIVE_TRIP_STORAGE_KEY)
      if (import.meta.env.VITE_E2E === 'true') {
        sessionStorage.removeItem(E2E_PASSENGER_TRIP_KEY)
      }
    }
  } catch {
    // ignore quota / private mode
  }
}

/** Bootstrap when passenger session exists (always reconcile with GET /trips/active). */
export function shouldBootstrapPassengerActiveTrip(opts: {
  token: string | null
  sessionRole: string | null | undefined
}): boolean {
  return Boolean(opts.token && opts.sessionRole === 'passenger')
}

/**
 * Decide next local active trip id after GET /trips/active.
 * - Backend active → use it (authoritative).
 * - Backend null + no local → stay null.
 * - Backend null + local id → clear only when `localTripTerminalOrMissing` is true
 *   (confirmed terminal/404). Transient errors keep local id.
 */
export function resolvePassengerActiveTripId(opts: {
  backendActiveTripId: string | null
  localTripId: string | null
  localTripTerminalOrMissing?: boolean
}): string | null {
  if (opts.backendActiveTripId) return opts.backendActiveTripId
  if (!opts.localTripId) return null
  if (opts.localTripTerminalOrMissing) return null
  return opts.localTripId
}
