import { describe, expect, it } from 'vitest'
import {
  countCriticalHealthSignalRows,
  countHealthSignalRows,
  countInformationalHealthSignalRows,
} from './adminDashboardHelpers'
import type { SystemHealthResponse } from '../../api/admin'

const base: SystemHealthResponse = {
  status: 'ok',
  warnings: [],
  informational_warnings: [],
  trips_accepted_too_long: [],
  trips_ongoing_too_long: [],
  stuck_payments: [],
  drivers_unavailable_too_long: [],
  missing_payment_records: [],
  inconsistent_financial_state: [],
}

describe('health signal counters (Phase 1)', () => {
  it('F1: offline alone is informational only', () => {
    const h: SystemHealthResponse = {
      ...base,
      drivers_unavailable_too_long: [{ driver_id: 'd1' }],
      informational_warnings: ['1 driver(s) unavailable without trip'],
    }
    expect(countCriticalHealthSignalRows(h)).toBe(0)
    expect(countInformationalHealthSignalRows(h)).toBe(1)
    expect(countHealthSignalRows(h)).toBe(0)
  })

  it('F1: stuck payment counts as critical', () => {
    const h: SystemHealthResponse = {
      ...base,
      status: 'degraded',
      stuck_payments: [{ id: 'p1' }],
      warnings: ['1 payment(s) stuck in processing'],
    }
    expect(countCriticalHealthSignalRows(h)).toBe(1)
    expect(countInformationalHealthSignalRows(h)).toBe(0)
  })

  it('F1: critical and informational together', () => {
    const h: SystemHealthResponse = {
      ...base,
      status: 'degraded',
      stuck_payments: [{ id: 'p1' }],
      drivers_unavailable_too_long: [{ driver_id: 'd1' }, { driver_id: 'd2' }],
    }
    expect(countCriticalHealthSignalRows(h)).toBe(1)
    expect(countInformationalHealthSignalRows(h)).toBe(2)
  })
})
