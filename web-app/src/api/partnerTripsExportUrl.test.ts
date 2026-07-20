import { describe, expect, it } from 'vitest'
import { partnerTripsExportUrl } from './partner'

describe('partnerTripsExportUrl', () => {
  it('funciona com API_BASE relativo /api sem lançar Invalid URL', () => {
    expect(() => partnerTripsExportUrl(undefined, '/api')).not.toThrow()
    expect(partnerTripsExportUrl(undefined, '/api')).toBe('/api/partner/trips/export')
  })

  it('funciona com API_BASE absoluto', () => {
    const u = partnerTripsExportUrl(undefined, 'https://x.example.com/api')
    expect(u).toBe('https://x.example.com/api/partner/trips/export')
  })

  it('preserva filtros/query params', () => {
    const u = partnerTripsExportUrl(
      {
        tripFilter: 'completed',
        driverId: 'drv-1',
        dateFrom: '2026-07-01',
        dateTo: '2026-07-20',
        search: 'abc',
      },
      '/api'
    )
    expect(u.startsWith('/api/partner/trips/export?')).toBe(true)
    const qs = new URLSearchParams(u.split('?')[1])
    expect(qs.get('status')).toBe('completed')
    expect(qs.get('driver_id')).toBe('drv-1')
    expect(qs.get('from')).toBe('2026-07-01')
    expect(qs.get('to')).toBe('2026-07-20')
    expect(qs.get('q')).toBe('abc')
  })

  it('não envia status quando tripFilter é all', () => {
    const u = partnerTripsExportUrl({ tripFilter: 'all' }, '/api')
    expect(u).toBe('/api/partner/trips/export')
  })

  it('remove barra final do base', () => {
    expect(partnerTripsExportUrl(undefined, 'https://x.example.com/api/')).toBe(
      'https://x.example.com/api/partner/trips/export'
    )
  })
})
