import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  driverDocumentsApprovedCount,
  getDriverDocumentsState,
  isDriverDocumentsGateEnabled,
  isDriverDocumentsReady,
  setDriverDocumentsGateEnabled,
  setDriverDocumentsState,
  type DriverDocumentsState,
} from './driverDocuments'

function stateWith(
  overrides: Partial<DriverDocumentsState['docs']>,
  onboardingCompleted = false
): DriverDocumentsState {
  return {
    docs: {
      carta_tvde: 'missing',
      certificado_motorista_tvde: 'missing',
      seguro_responsabilidade_civil: 'missing',
      inspecao_viatura: 'missing',
      ...overrides,
    },
    onboardingCompleted,
  }
}

describe('driverDocuments service', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('defaults to all missing and onboarding false', () => {
    const s = getDriverDocumentsState()
    expect(s.onboardingCompleted).toBe(false)
    expect(isDriverDocumentsReady(s)).toBe(false)
    expect(driverDocumentsApprovedCount(s)).toBe(0)
  })

  it('marks onboarding completed when all required docs are approved', () => {
    const ready = stateWith({
      carta_tvde: 'approved',
      certificado_motorista_tvde: 'approved',
      seguro_responsabilidade_civil: 'approved',
      inspecao_viatura: 'approved',
    })
    setDriverDocumentsState(ready)
    const stored = getDriverDocumentsState()
    expect(isDriverDocumentsReady(stored)).toBe(true)
    expect(stored.onboardingCompleted).toBe(true)
    expect(driverDocumentsApprovedCount(stored)).toBe(4)
  })

  it('preserves manual completion flag once set', () => {
    const partial = stateWith({ carta_tvde: 'approved' }, true)
    setDriverDocumentsState(partial)
    const stored = getDriverDocumentsState()
    expect(stored.onboardingCompleted).toBe(true)
    expect(driverDocumentsApprovedCount(stored)).toBe(1)
  })

  it('toggles documents gate flag in local storage', () => {
    expect(isDriverDocumentsGateEnabled()).toBe(false)
    setDriverDocumentsGateEnabled(true)
    expect(isDriverDocumentsGateEnabled()).toBe(true)
    setDriverDocumentsGateEnabled(false)
    expect(isDriverDocumentsGateEnabled()).toBe(false)
  })
})
