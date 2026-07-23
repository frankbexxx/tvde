import { describe, expect, it } from 'vitest'
import { PARTNER_TRIPS_CSV_COLUMNS } from '../../api/partner'
import {
  driverIsOnActiveTrip,
  listActivePartnerTrips,
  matchesDriverFilter,
  primaryActivePartnerTrip,
  type DriverFilter,
} from './partnerTypes'
import type { PartnerDriverRow, PartnerTripRow } from '../../api/partner'

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

describe('OPS-UX-1C active trip helpers', () => {
  function t(over: Partial<PartnerTripRow> & Pick<PartnerTripRow, 'trip_id' | 'status'>): PartnerTripRow {
    return {
      passenger_id: 'p',
      driver_id: 'd',
      origin_lat: 1,
      origin_lng: 2,
      destination_lat: 3,
      destination_lng: 4,
      estimated_price: 1,
      created_at: '2026-07-23T08:00:00Z',
      started_at: null,
      completed_at: null,
      updated_at: '2026-07-23T08:00:00Z',
      ...over,
    }
  }

  it('lista só assigned/accepted/arriving/ongoing e ordena por updated_at', () => {
    const rows = listActivePartnerTrips([
      t({ trip_id: 'a', status: 'assigned', updated_at: '2026-07-23T09:00:00Z' }),
      t({ trip_id: 'b', status: 'completed', updated_at: '2026-07-23T12:00:00Z' }),
      t({ trip_id: 'c', status: 'ongoing', updated_at: '2026-07-23T10:00:00Z' }),
    ])
    expect(rows.map((x) => x.trip_id)).toEqual(['c', 'a'])
    expect(primaryActivePartnerTrip(rows)?.trip_id).toBe('c')
  })
})
