import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  defaultDriverDocumentsState,
  driverDocumentsApprovedCount,
  getDriverDocumentsState,
  isDriverDocumentsGateEnabled,
  isDriverDocumentsReady,
  partnerDocumentsApprovedCount,
  setDriverDocumentsGateEnabled,
  setDriverDocumentsState,
  type DriverDocumentsState,
} from './driverDocuments'
import { driverDocumentsFromServer, mergeServerDriverDocuments, type DriverDocumentsApiState } from '../api/driverDocuments'

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
      cartao_cidadao: 'missing',
      registo_criminal: 'missing',
      ...overrides,
    },
    onboardingCompleted,
    docDetails: {},
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
      cartao_cidadao: 'approved',
      registo_criminal: 'approved',
    })
    setDriverDocumentsState(ready)
    const stored = getDriverDocumentsState()
    expect(isDriverDocumentsReady(stored)).toBe(true)
    expect(stored.onboardingCompleted).toBe(true)
    expect(driverDocumentsApprovedCount(stored)).toBe(6)
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

  it('driverDocumentsFromServer ignores stale localStorage statuses', () => {
    setDriverDocumentsState(
      stateWith({
        carta_tvde: 'approved',
        certificado_motorista_tvde: 'approved',
        seguro_responsabilidade_civil: 'approved',
        inspecao_viatura: 'approved',
        cartao_cidadao: 'approved',
        registo_criminal: 'approved',
      })
    )
    const fromServer = driverDocumentsFromServer({
      version: 1,
      docs: {
        carta_tvde: { status: 'pending_review' },
      },
    })
    expect(fromServer.docs.carta_tvde).toBe('pending_review')
    expect(fromServer.docs.certificado_motorista_tvde).toBe('missing')
    expect(isDriverDocumentsReady(fromServer)).toBe(false)
    expect(getDriverDocumentsState().docs.carta_tvde).toBe('approved')
  })

  it('defaultDriverDocumentsState starts with all missing', () => {
    const s = defaultDriverDocumentsState()
    expect(s.onboardingCompleted).toBe(false)
    expect(isDriverDocumentsReady(s)).toBe(false)
    expect(driverDocumentsApprovedCount(s)).toBe(0)
  })

  it('mergeServerDriverDocuments copia a validade e o motivo público, e ignora a nota interna', () => {
    const prev = stateWith({ carta_tvde: 'approved' })
    const merged = mergeServerDriverDocuments(prev, {
      version: 2,
      docs: {
        carta_tvde: {
          status: 'rejected',
          expires_at: '2030-06-01T00:00:00Z',
          public_rejection_reason: 'Documento ilegível',
          partner_note: 'nota-so-da-equipa-xyz',
        },
      } as DriverDocumentsApiState['docs'],
    })
    expect(merged.docDetails.carta_tvde?.expiresAt).toBe('2030-06-01T00:00:00Z')
    expect(merged.docDetails.carta_tvde?.publicRejectionReason).toBe('Documento ilegível')
    expect(JSON.stringify(merged)).not.toContain('nota-so-da-equipa-xyz')
    expect(JSON.stringify(merged)).not.toContain('partner_note')
    expect(JSON.stringify(merged)).not.toContain('partnerNote')
  })

  it('partnerDocumentsApprovedCount counts approved keys from partner payload', () => {
    expect(partnerDocumentsApprovedCount(null)).toBe(0)
    expect(partnerDocumentsApprovedCount(undefined)).toBe(0)
    expect(
      partnerDocumentsApprovedCount({
        carta_tvde: { status: 'approved' },
        inspecao_viatura: { status: 'pending_review' },
      })
    ).toBe(1)
    expect(
      partnerDocumentsApprovedCount({
        carta_tvde: { status: 'approved' },
        certificado_motorista_tvde: { status: 'approved' },
        seguro_responsabilidade_civil: { status: 'approved' },
        inspecao_viatura: { status: 'approved' },
        cartao_cidadao: { status: 'approved' },
        registo_criminal: { status: 'approved' },
      })
    ).toBe(6)
  })
})
