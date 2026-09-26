import { describe, expect, it } from 'vitest'
import { guardRedirect } from './routeGuard'

describe('guardRedirect', () => {
  it('qualquer papel activo entra em /passenger', () => {
    for (const role of ['passenger', 'driver', 'partner', 'admin', 'super_admin']) {
      expect(guardRedirect('passenger', role)).toBeNull()
    }
  })

  it('/driver só para driver', () => {
    expect(guardRedirect('driver', 'driver')).toBeNull()
    expect(guardRedirect('driver', 'admin')).toBe('/admin')
    expect(guardRedirect('driver', 'super_admin')).toBe('/admin')
    expect(guardRedirect('driver', 'partner')).toBe('/partner')
    expect(guardRedirect('driver', 'passenger')).toBe('/passenger')
  })

  it('/partner só para partner', () => {
    expect(guardRedirect('partner', 'partner')).toBeNull()
    expect(guardRedirect('partner', 'driver')).toBe('/driver')
    expect(guardRedirect('partner', 'admin')).toBe('/admin')
    expect(guardRedirect('partner', 'passenger')).toBe('/passenger')
  })

  it('/admin só para staff', () => {
    expect(guardRedirect('admin', 'admin')).toBeNull()
    expect(guardRedirect('admin', 'super_admin')).toBeNull()
    expect(guardRedirect('admin', 'driver')).toBe('/driver')
    expect(guardRedirect('admin', 'partner')).toBe('/partner')
    expect(guardRedirect('admin', 'passenger')).toBe('/passenger')
  })
})
