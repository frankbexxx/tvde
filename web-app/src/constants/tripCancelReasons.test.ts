import { describe, expect, it } from 'vitest'
import { TRIP_CANCEL_SELECT_OTHER, tripCancelReasonForApi } from './tripCancelReasons'

describe('tripCancelReasonForApi', () => {
  it('returns null for empty preset', () => {
    expect(tripCancelReasonForApi('', '')).toBeNull()
  })

  it('returns preset text', () => {
    expect(tripCancelReasonForApi('Alteração de planos', '')).toBe('Alteração de planos')
  })

  it('uses other detail when preset is Other', () => {
    expect(tripCancelReasonForApi(TRIP_CANCEL_SELECT_OTHER, '  Taxi avariado  ')).toBe('Taxi avariado')
  })

  it('returns literal Outro when Other and empty detail', () => {
    expect(tripCancelReasonForApi(TRIP_CANCEL_SELECT_OTHER, '')).toBe('Outro')
  })
})
