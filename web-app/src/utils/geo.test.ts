import { describe, expect, it } from 'vitest'
import { formatApproxDistanceKm, haversineKm } from './geo'

describe('haversineKm', () => {
  it('returns ~0 for identical points', () => {
    const p = { lat: 38.7, lng: -9.14 }
    expect(haversineKm(p, p)).toBeLessThan(0.001)
  })

  it('returns plausible distance Lisbon–Porto order of magnitude', () => {
    const lisbon = { lat: 38.7223, lng: -9.1393 }
    const porto = { lat: 41.1579, lng: -8.6291 }
    const km = haversineKm(lisbon, porto)
    expect(km).toBeGreaterThan(250)
    expect(km).toBeLessThan(350)
  })
})

describe('formatApproxDistanceKm', () => {
  it('uses metres under 1 km', () => {
    expect(formatApproxDistanceKm(0.4)).toMatch(/m/)
  })

  it('uses km with one decimal from 1 km', () => {
    expect(formatApproxDistanceKm(2.25)).toBe('a ~2.3 km')
  })
})
