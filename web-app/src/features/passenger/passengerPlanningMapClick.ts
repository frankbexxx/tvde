import type { GeocodeSuggestion } from '../../services/geocoding'

export type PlanningCoords = { lat: number; lng: number }

export type PassengerPlanningState = {
  pickup: PlanningCoords | null
  dropoff: PlanningCoords | null
  pickupCandidate: GeocodeSuggestion | null
  destinationCandidate: GeocodeSuggestion | null
}

export type PlanningMapClickTarget = 'pickup' | 'destination'

/** Map click previews pickup until pickup is confirmed; afterwards previews destination. */
export function resolvePlanningMapClickTarget(
  hasConfirmedPickup: boolean
): PlanningMapClickTarget {
  return hasConfirmedPickup ? 'destination' : 'pickup'
}

/** Build a Candidate from map coords + reverse-geocode label (same shape as text search). */
export function coordsToMapCandidate(
  coords: PlanningCoords,
  address: string
): GeocodeSuggestion {
  const trimmed = address.trim() || 'Local selecionado'
  const parts = trimmed
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  const primary = parts[0] ?? trimmed
  const secondary = parts.slice(1).join(', ')
  return {
    id: `map:${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}`,
    lat: coords.lat,
    lng: coords.lng,
    primary,
    secondary,
  }
}

/**
 * Map selection → preview only. Never commits pickup/dropoff.
 * If destination is re-selected after a prior confirm, dropoff is uncommitted
 * so the UI returns to destination preview (select → preview → confirm).
 */
export function applyMapSelection(
  state: PassengerPlanningState,
  coords: PlanningCoords,
  address: string
): PassengerPlanningState {
  const candidate = coordsToMapCandidate(coords, address)
  const target = resolvePlanningMapClickTarget(Boolean(state.pickup))
  if (target === 'pickup') {
    return {
      ...state,
      pickupCandidate: candidate,
    }
  }
  return {
    ...state,
    dropoff: null,
    destinationCandidate: candidate,
  }
}

export function confirmPickupCandidate(
  state: PassengerPlanningState
): PassengerPlanningState {
  if (!state.pickupCandidate) return state
  return {
    ...state,
    pickup: { lat: state.pickupCandidate.lat, lng: state.pickupCandidate.lng },
    pickupCandidate: null,
  }
}

export function confirmDestinationCandidate(
  state: PassengerPlanningState
): PassengerPlanningState {
  if (!state.destinationCandidate) return state
  return {
    ...state,
    dropoff: {
      lat: state.destinationCandidate.lat,
      lng: state.destinationCandidate.lng,
    },
    destinationCandidate: null,
  }
}

/** Limpar removes the active candidate only — confirmed points stay. */
export function clearPickupCandidateOnly(
  state: PassengerPlanningState
): PassengerPlanningState {
  return { ...state, pickupCandidate: null }
}

export function clearDestinationCandidateOnly(
  state: PassengerPlanningState
): PassengerPlanningState {
  return { ...state, destinationCandidate: null }
}

export function resetPlanningState(): PassengerPlanningState {
  return {
    pickup: null,
    dropoff: null,
    pickupCandidate: null,
    destinationCandidate: null,
  }
}

export function planningReadyForTripConfig(
  state: PassengerPlanningState
): boolean {
  return Boolean(state.pickup && state.dropoff && !state.pickupCandidate && !state.destinationCandidate)
}
