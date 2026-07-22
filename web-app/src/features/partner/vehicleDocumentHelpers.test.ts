import { describe, expect, it } from 'vitest'
import {
  utcCalendarDaysBetween,
  vehicleDocumentDisplayStatus,
} from './vehicleDocumentHelpers'
import type { PartnerVehicleDocumentRow } from '../../api/partner'

const now = new Date('2026-07-22T15:30:00.000Z')

function doc(
  overrides: Partial<PartnerVehicleDocumentRow> = {}
): PartnerVehicleDocumentRow {
  return {
    id: 'd1',
    vehicle_id: 'v1',
    partner_id: 'p1',
    document_type: 'vehicle_insurance',
    status: 'pending_review',
    computed_status: 'pending_review',
    file_path: null,
    file_name: null,
    has_file: false,
    document_number: null,
    issuer: null,
    valid_from: null,
    expires_at: null,
    issued_at: null,
    metadata: null,
    notes: null,
    reviewed_by: null,
    reviewed_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('utcCalendarDaysBetween', () => {
  it('same UTC day is 0 even if timestamp already past midnight', () => {
    expect(
      utcCalendarDaysBetween(now, new Date('2026-07-22T00:00:00.000Z'))
    ).toBe(0)
  })

  it('yesterday is -1', () => {
    expect(
      utcCalendarDaysBetween(now, new Date('2026-07-21T00:00:00.000Z'))
    ).toBe(-1)
  })
})

describe('vehicleDocumentDisplayStatus date-only expiry', () => {
  it('yesterday → expired / expired_pending', () => {
    expect(
      vehicleDocumentDisplayStatus(
        doc({
          status: 'approved',
          computed_status: 'expired',
          expires_at: '2026-07-21T00:00:00Z',
        }),
        false,
        now
      )
    ).toBe('expired')
    expect(
      vehicleDocumentDisplayStatus(
        doc({
          status: 'pending_review',
          computed_status: 'pending_review',
          expires_at: '2026-07-21T00:00:00Z',
        }),
        false,
        now
      )
    ).toBe('expired_pending')
  })

  it('today + pending_review → expiring_soon (never expired)', () => {
    expect(
      vehicleDocumentDisplayStatus(
        doc({
          status: 'pending_review',
          computed_status: 'pending_review',
          expires_at: '2026-07-22T00:00:00Z',
        }),
        false,
        now
      )
    ).toBe('expiring_soon')
  })

  it('today + approved → expiring_soon (never expired)', () => {
    expect(
      vehicleDocumentDisplayStatus(
        doc({
          status: 'approved',
          computed_status: 'valid',
          expires_at: '2026-07-22T00:00:00Z',
        }),
        false,
        now
      )
    ).toBe('expiring_soon')
  })

  it('ignores stale computed expired when expires_at is today', () => {
    expect(
      vehicleDocumentDisplayStatus(
        doc({
          status: 'pending_review',
          computed_status: 'expired',
          expires_at: '2026-07-22T00:00:00Z',
        }),
        false,
        now
      )
    ).toBe('expiring_soon')
  })

  it('tomorrow → expiring_soon', () => {
    expect(
      vehicleDocumentDisplayStatus(
        doc({
          status: 'approved',
          computed_status: 'expiring_soon',
          expires_at: '2026-07-23T00:00:00Z',
        }),
        false,
        now
      )
    ).toBe('expiring_soon')
  })

  it('within 30 days → expiring_soon; beyond → valid/pending', () => {
    expect(
      vehicleDocumentDisplayStatus(
        doc({
          status: 'approved',
          computed_status: 'expiring_soon',
          expires_at: '2026-08-21T00:00:00Z',
        }),
        false,
        now
      )
    ).toBe('expiring_soon')
    expect(
      vehicleDocumentDisplayStatus(
        doc({
          status: 'approved',
          computed_status: 'valid',
          expires_at: '2026-08-22T00:00:00Z',
        }),
        false,
        now
      )
    ).toBe('valid')
    expect(
      vehicleDocumentDisplayStatus(
        doc({
          status: 'pending_review',
          computed_status: 'pending_review',
          expires_at: '2026-08-22T00:00:00Z',
        }),
        false,
        now
      )
    ).toBe('pending_review')
  })
})
