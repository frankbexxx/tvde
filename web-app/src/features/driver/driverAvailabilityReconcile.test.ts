import { describe, expect, it } from 'vitest'
import { reconcileDriverOfflineState } from './driverAvailabilityReconcile'

describe('reconcileDriverOfflineState', () => {
  it('preserves an intentional local offline state when the server still says available', () => {
    expect(reconcileDriverOfflineState(true, true, true)).toBe(true)
  })

  it('keeps an online driver online when the server is available and docs allow it', () => {
    expect(reconcileDriverOfflineState(false, true, true)).toBe(false)
  })

  it('forces offline when the server is unavailable', () => {
    expect(reconcileDriverOfflineState(false, false, true)).toBe(true)
  })

  it('forces offline when local gates prevent going online', () => {
    expect(reconcileDriverOfflineState(false, true, false)).toBe(true)
  })
})
