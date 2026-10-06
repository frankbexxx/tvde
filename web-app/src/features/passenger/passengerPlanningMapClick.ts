import type { GeocodeSuggestion } from '../../services/geocoding'

export type PlanningCoords = { lat: number; lng: number }

export type PassengerPlanningState = {
  pickup: PlanningCoords | null
  dropoff: PlanningCoords | null
  pickupCandidate: GeocodeSuggestion | null
  destinationCandidate: GeocodeSuggestion | null
}

export type PlanningMapClickTarget = 'pickup' | 'destination'

/** Human step in the planning flow (after Limpar / confirm). */
export type PlanningUiStep = 'choose_pickup' | 'choose_destination' | 'configure_trip'

/** Map click previews pickup until pickup is confirmed; afterwards previews destination. */
export function resolvePlanningMapClickTarget(
  hasConfirmedPickup: boolean
): PlanningMapClickTarget {
  return hasConfirmedPickup ? 'destination' : 'pickup'
}

export function resolvePlanningUiStep(
  state: PassengerPlanningState
): PlanningUiStep {
  if (!state.pickup) return 'choose_pickup'
  if (!state.dropoff) return 'choose_destination'
  return 'configure_trip'
}

/**
 * Final trip-config screen: map must not change pickup/dropoff.
 * Edit via «Alterar» (clears dropoff) before map accepts selection again.
 */
export function canAcceptPlanningMapClick(
  state: PassengerPlanningState
): boolean {
  return resolvePlanningUiStep(state) !== 'configure_trip'
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
 * No-op on the final configure screen (both points confirmed).
 */
export function applyMapSelection(
  state: PassengerPlanningState,
  coords: PlanningCoords,
  address: string
): PassengerPlanningState {
  if (!canAcceptPlanningMapClick(state)) {
    return state
  }
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

/**
 * Limpar removes the active candidate only — confirmed points stay.
 * Caller should also clear the matching search query so the UI is not hybrid.
 */
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

/** «Alterar» — leave configure trip and return to choose destination. */
export function beginEditDestination(
  state: PassengerPlanningState
): PassengerPlanningState {
  return {
    ...state,
    dropoff: null,
    destinationCandidate: null,
  }
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
  return Boolean(
    state.pickup &&
      state.dropoff &&
      !state.pickupCandidate &&
      !state.destinationCandidate
  )
}
