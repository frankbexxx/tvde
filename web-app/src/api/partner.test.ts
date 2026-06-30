import { describe, expect, it } from 'vitest'
import { partnerTripsExportUrl } from './partner'

describe('partnerTripsExportUrl', () => {
  it('builds the default export URL with the relative API base', () => {
    expect(partnerTripsExportUrl()).toBe('/api/partner/trips/export')
  })

  it('omits empty and all filters', () => {
    expect(
      partnerTripsExportUrl({
        tripFilter: 'all',
        search: '   ',
      })
    ).toBe('/api/partner/trips/export')
  })

  it('encodes filtered export parameters', () => {
    expect(
      partnerTripsExportUrl({
        tripFilter: 'completed',
        driverId: 'driver-1',
        dateFrom: '2026-06-01',
        dateTo: '2026-06-30',
        search: ' João Silva ',
      })
    ).toBe(
      '/api/partner/trips/export?status=completed&driver_id=driver-1&from=2026-06-01&to=2026-06-30&q=Jo%C3%A3o+Silva'
    )
  })
})
