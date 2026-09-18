/**
 * Passenger idle/planning/confirming bottom-sheet max-height selection.
 * Pure helper — keeps MapBottomSheet class wiring testable without mounting the dashboard.
 */
import {
  MAP_SHEET_MAX_H_CONFIRM,
  MAP_SHEET_MAX_H_IDLE,
  MAP_SHEET_MAX_H_SEARCH,
} from '../../components/layout/infoBoxTemplate'
import type { PassengerUIState } from './TripPlannerPanel'

export type PassengerSheetMode = 'idle' | 'search' | 'confirming'

export function resolvePassengerSheetMode(opts: {
  placeSearchActive: boolean
  uiState: PassengerUIState
}): PassengerSheetMode {
  if (opts.placeSearchActive) return 'search'
  if (opts.uiState === 'confirming') return 'confirming'
  return 'idle'
}

export function passengerSheetMaxHClass(mode: PassengerSheetMode): string {
  switch (mode) {
    case 'search':
      return MAP_SHEET_MAX_H_SEARCH
    case 'confirming':
      return MAP_SHEET_MAX_H_CONFIRM
    case 'idle':
    default:
      return MAP_SHEET_MAX_H_IDLE
  }
}
