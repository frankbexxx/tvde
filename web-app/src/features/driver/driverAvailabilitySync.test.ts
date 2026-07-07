import { describe, expect, it } from 'vitest'
import {
  formatDriverAvailabilityError,
  isDriverAvailabilityOperational,
  isDrivingHoursBlockedError,
  offlineFromBackendAvailability,
} from './driverAvailabilitySync'

describe('offlineFromBackendAvailability', () => {
  it('backend is_available=false → UI offline mesmo com localStorage online', () => {
    expect(offlineFromBackendAvailability(false, true)).toBe(true)
  })

  it('backend is_available=true → UI online quando documentos permitem', () => {
    expect(offlineFromBackendAvailability(true, true)).toBe(false)
  })

  it('documentos bloqueiam → UI offline', () => {
    expect(offlineFromBackendAvailability(true, false)).toBe(true)
  })
})

describe('isDriverAvailabilityOperational', () => {
  const base = { token: 'tok', offline: false, hydrated: true, syncing: false }

  it('sucesso ao ficar online → reporter/poll activos', () => {
    expect(isDriverAvailabilityOperational(base)).toBe(true)
  })

  it('falha online pendente → permanece offline → poll inactivo', () => {
    expect(isDriverAvailabilityOperational({ ...base, offline: true })).toBe(false)
  })

  it('sync em curso → poll inactivo', () => {
    expect(isDriverAvailabilityOperational({ ...base, syncing: true })).toBe(false)
  })

  it('antes de hidratar servidor → poll inactivo', () => {
    expect(isDriverAvailabilityOperational({ ...base, hydrated: false })).toBe(false)
  })
})

describe('formatDriverAvailabilityError', () => {
  it('driving_hours_blocked é caso específico', () => {
    const msg = formatDriverAvailabilityError({ status: 409, detail: 'driving_hours_blocked' })
    expect(isDrivingHoursBlockedError({ status: 409, detail: 'driving_hours_blocked' })).toBe(true)
    expect(msg).toMatch(/condução/i)
  })

  it('outros erros não são ignorados', () => {
    const msg = formatDriverAvailabilityError({ status: 500, detail: 'internal_error' })
    expect(msg).toContain('internal_error')
    expect(isDrivingHoursBlockedError({ status: 500, detail: 'internal_error' })).toBe(false)
  })
})
