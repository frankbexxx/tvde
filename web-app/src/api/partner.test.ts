import { describe, expect, it } from 'vitest'
import { API_BASE } from './client'
import { partnerTripsExportUrl } from './partner'

const exportBase = `${API_BASE.replace(/\/$/, '')}/partner/trips/export`

describe('partnerTripsExportUrl', () => {
  it('returns the export endpoint without throwing for the default relative API base', () => {
    expect(partnerTripsExportUrl()).toBe(exportBase)
  })

  it('omits the all status filter', () => {
    expect(partnerTripsExportUrl({ tripFilter: 'all' })).toBe(exportBase)
  })

  it('serializes filtered export params', () => {
    expect(
      partnerTripsExportUrl({
        tripFilter: 'completed',
        driverId: 'driver-123',
        dateFrom: '2026-06-01',
        dateTo: '2026-06-30',
        search: '  airport pickup  ',
      })
    ).toBe(
      `${exportBase}?status=completed&driver_id=driver-123&from=2026-06-01&to=2026-06-30&q=airport+pickup`
    )
  })
})
