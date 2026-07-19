import { describe, expect, it } from 'vitest'
import { PARTNER_TRIPS_CSV_COLUMNS } from '../../api/partner'
import {
  driverIsOnActiveTrip,
  matchesDriverFilter,
  type DriverFilter,
} from './partnerTypes'
import type { PartnerDriverRow } from '../../api/partner'

function driver(over: Partial<PartnerDriverRow> = {}): PartnerDriverRow {
  return {
    user_id: 'd1',
    partner_id: 'p1',
    status: 'approved',
    is_available: true,
    user: { name: 'A', phone: null },
    last_location: null,
    ...over,
  }
}

describe('PARTNER-FLEET-1A roster filters', () => {
  it('Em viagem quando há active_trip', () => {
    const d = driver({ active_trip_id: 't1', active_trip_status: 'ongoing' })
    expect(driverIsOnActiveTrip(d)).toBe(true)
    expect(matchesDriverFilter(d, 'on_trip')).toBe(true)
  })

  it('disponível sem trip active não é Em viagem', () => {
    const d = driver({ is_available: true, active_trip_id: null, active_trip_status: null })
    expect(driverIsOnActiveTrip(d)).toBe(false)
    expect(matchesDriverFilter(d, 'on_trip')).toBe(false)
    expect(matchesDriverFilter(d, 'online')).toBe(true)
  })

  it('filtro on_trip é DriverFilter válido', () => {
    const f: DriverFilter = 'on_trip'
    expect(f).toBe('on_trip')
  })
})

describe('PARTNER-FLEET-1A CSV columns', () => {
  it('mantém colunas antigas e acrescenta preços no fim', () => {
    expect(PARTNER_TRIPS_CSV_COLUMNS.slice(0, 8)).toEqual([
      'trip_id',
      'driver_id',
      'passenger_id',
      'status',
      'created_at',
      'started_at',
      'completed_at',
      'updated_at',
    ])
    expect(PARTNER_TRIPS_CSV_COLUMNS.slice(-2)).toEqual(['estimated_price', 'final_price'])
    expect(PARTNER_TRIPS_CSV_COLUMNS).not.toContain('phone')
    expect(PARTNER_TRIPS_CSV_COLUMNS).not.toContain('passenger_name')
  })
})
