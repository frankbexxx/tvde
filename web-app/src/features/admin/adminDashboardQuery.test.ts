import { describe, expect, it } from 'vitest'
import { parseAdminDashboardQuery } from './adminDashboardQuery'

describe('parseAdminDashboardQuery', () => {
  it('defaults to pending when empty', () => {
    expect(parseAdminDashboardQuery(new URLSearchParams())).toEqual({
      tab: 'pending',
      tripId: null,
    })
  })

  it('parses tab=health', () => {
    const sp = new URLSearchParams('tab=health')
    expect(parseAdminDashboardQuery(sp)).toEqual({ tab: 'health', tripId: null })
  })

  it('forces trips when tripId is set', () => {
    const sp = new URLSearchParams('tab=health&tripId=abc-123')
    expect(parseAdminDashboardQuery(sp)).toEqual({ tab: 'trips', tripId: 'abc-123' })
  })

  it('accepts trip_id alias', () => {
    const sp = new URLSearchParams('trip_id=uuid-here')
    expect(parseAdminDashboardQuery(sp)).toEqual({ tab: 'trips', tripId: 'uuid-here' })
  })

  it('ignores invalid tab', () => {
    const sp = new URLSearchParams('tab=nope')
    expect(parseAdminDashboardQuery(sp)).toEqual({ tab: 'pending', tripId: null })
  })
})
