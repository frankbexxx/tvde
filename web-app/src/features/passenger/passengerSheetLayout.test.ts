import { describe, expect, it } from 'vitest'
import {
  MAP_SHEET_MAX_H_CONFIRM,
  MAP_SHEET_MAX_H_IDLE,
  MAP_SHEET_MAX_H_SEARCH,
} from '../../components/layout/infoBoxTemplate'
import {
  passengerSheetMaxHClass,
  resolvePassengerSheetMode,
} from './passengerSheetLayout'

describe('passengerSheetLayout', () => {
  it('idle uses compact height; search uses expanded search height', () => {
    expect(resolvePassengerSheetMode({ placeSearchActive: false, uiState: 'idle' })).toBe(
      'idle',
    )
    expect(passengerSheetMaxHClass('idle')).toBe(MAP_SHEET_MAX_H_IDLE)
    expect(resolvePassengerSheetMode({ placeSearchActive: true, uiState: 'idle' })).toBe(
      'search',
    )
    expect(passengerSheetMaxHClass('search')).toBe(MAP_SHEET_MAX_H_SEARCH)
  })

  it('confirming uses dedicated tall sheet (~78dvh), not idle', () => {
    expect(
      resolvePassengerSheetMode({ placeSearchActive: false, uiState: 'confirming' }),
    ).toBe('confirming')
    expect(passengerSheetMaxHClass('confirming')).toBe(MAP_SHEET_MAX_H_CONFIRM)
    expect(MAP_SHEET_MAX_H_CONFIRM).toContain('78dvh')
    expect(MAP_SHEET_MAX_H_CONFIRM).not.toBe(MAP_SHEET_MAX_H_IDLE)
  })

  it('search while confirming still prefers search height (keyboard/suggestions)', () => {
    expect(
      resolvePassengerSheetMode({ placeSearchActive: true, uiState: 'confirming' }),
    ).toBe('search')
  })

  it('planning/searching/in_trip without search stay idle height on idle sheet', () => {
    expect(
      resolvePassengerSheetMode({ placeSearchActive: false, uiState: 'planning' }),
    ).toBe('idle')
    expect(
      resolvePassengerSheetMode({ placeSearchActive: false, uiState: 'searching' }),
    ).toBe('idle')
  })
})
