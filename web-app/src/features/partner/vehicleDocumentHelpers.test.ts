import { describe, expect, it } from 'vitest'
import {
  DEFAULT_VEHICLE_DOCUMENT_REQUIRED_TYPES,
  summarizeVehicleDocuments,
  utcCalendarDaysBetween,
  vehicleDocumentDisplayStatus,
} from './vehicleDocumentHelpers'
import type { PartnerVehicleDocumentRow } from '../../api/partner'

const now = new Date('2026-07-22T15:30:00.000Z')

const P0 = [...DEFAULT_VEHICLE_DOCUMENT_REQUIRED_TYPES] as const

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

function validDoc(
  document_type: string,
  id: string
): PartnerVehicleDocumentRow {
  return doc({
    id,
    document_type,
    status: 'approved',
    computed_status: 'valid',
    expires_at: '2027-01-01T00:00:00Z',
  })
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

describe('summarizeVehicleDocuments (PF3C-1)', () => {
  it('zero documents → 4 missing, worst_status missing', () => {
    const s = summarizeVehicleDocuments([], { now })
    expect(s).toEqual({
      total_required: 4,
      present_count: 0,
      missing_count: 4,
      expired_count: 0,
      expiring_soon_count: 0,
      pending_review_count: 0,
      rejected_count: 0,
      valid_count: 0,
      worst_status: 'missing',
    })
  })

  it('all valid → valid_count 4, worst_status valid', () => {
    const rows = P0.map((t, i) => validDoc(t, `v${i}`))
    const s = summarizeVehicleDocuments(rows, { now })
    expect(s.total_required).toBe(4)
    expect(s.present_count).toBe(4)
    expect(s.missing_count).toBe(0)
    expect(s.valid_count).toBe(4)
    expect(s.worst_status).toBe('valid')
  })

  it('one expired → expired_count 1, worst_status expired', () => {
    const rows = [
      validDoc('vehicle_registration', 'a'),
      doc({
        id: 'b',
        document_type: 'vehicle_insurance',
        status: 'approved',
        computed_status: 'expired',
        expires_at: '2026-07-01T00:00:00Z',
      }),
      validDoc('periodic_inspection', 'c'),
      validDoc('tvde_sticker', 'd'),
    ]
    const s = summarizeVehicleDocuments(rows, { now })
    expect(s.expired_count).toBe(1)
    expect(s.valid_count).toBe(3)
    expect(s.worst_status).toBe('expired')
  })

  it('one expiring_soon without expired/rejected → worst_status expiring_soon', () => {
    const rows = [
      validDoc('vehicle_registration', 'a'),
      doc({
        id: 'b',
        document_type: 'vehicle_insurance',
        status: 'approved',
        computed_status: 'expiring_soon',
        expires_at: '2026-08-01T00:00:00Z',
      }),
      validDoc('periodic_inspection', 'c'),
      validDoc('tvde_sticker', 'd'),
    ]
    const s = summarizeVehicleDocuments(rows, { now })
    expect(s.expiring_soon_count).toBe(1)
    expect(s.expired_count).toBe(0)
    expect(s.rejected_count).toBe(0)
    expect(s.worst_status).toBe('expiring_soon')
  })

  it('pending_review without worse issues → worst_status pending_review', () => {
    const rows = [
      validDoc('vehicle_registration', 'a'),
      doc({
        id: 'b',
        document_type: 'vehicle_insurance',
        status: 'pending_review',
        computed_status: 'pending_review',
        expires_at: '2027-01-01T00:00:00Z',
      }),
      validDoc('periodic_inspection', 'c'),
      validDoc('tvde_sticker', 'd'),
    ]
    const s = summarizeVehicleDocuments(rows, { now })
    expect(s.pending_review_count).toBe(1)
    expect(s.missing_count).toBe(0)
    expect(s.worst_status).toBe('pending_review')
  })

  it('rejected dominates all', () => {
    const rows = [
      doc({
        id: 'a',
        document_type: 'vehicle_registration',
        status: 'rejected',
        computed_status: 'rejected',
        expires_at: '2027-01-01T00:00:00Z',
      }),
      doc({
        id: 'b',
        document_type: 'vehicle_insurance',
        status: 'approved',
        computed_status: 'expired',
        expires_at: '2026-07-01T00:00:00Z',
      }),
      // missing periodic_inspection + tvde_sticker
    ]
    const s = summarizeVehicleDocuments(rows, { now })
    expect(s.rejected_count).toBe(1)
    expect(s.expired_count).toBe(1)
    expect(s.missing_count).toBe(2)
    expect(s.worst_status).toBe('rejected')
  })

  it('duplicate document_type: last wins (same as panel Map)', () => {
    const rows = [
      doc({
        id: 'old',
        document_type: 'vehicle_insurance',
        status: 'approved',
        computed_status: 'valid',
        expires_at: '2027-01-01T00:00:00Z',
      }),
      doc({
        id: 'new',
        document_type: 'vehicle_insurance',
        status: 'rejected',
        computed_status: 'rejected',
        expires_at: '2027-01-01T00:00:00Z',
      }),
      validDoc('vehicle_registration', 'a'),
      validDoc('periodic_inspection', 'c'),
      validDoc('tvde_sticker', 'd'),
    ]
    const s = summarizeVehicleDocuments(rows, { now })
    expect(s.present_count).toBe(4)
    expect(s.rejected_count).toBe(1)
    expect(s.valid_count).toBe(3)
    expect(s.worst_status).toBe('rejected')
  })

  it('non-P0 types ignored; custom requiredTypes respected', () => {
    const rows = [
      validDoc('vehicle_registration', 'a'),
      doc({
        id: 'extra',
        document_type: 'custom_other',
        status: 'rejected',
        computed_status: 'rejected',
      }),
    ]
    const defaultSummary = summarizeVehicleDocuments(rows, { now })
    expect(defaultSummary.rejected_count).toBe(0)
    expect(defaultSummary.missing_count).toBe(3)
    expect(defaultSummary.worst_status).toBe('missing')

    const custom = summarizeVehicleDocuments(rows, {
      now,
      requiredTypes: ['vehicle_registration', 'custom_other'],
    })
    expect(custom.total_required).toBe(2)
    expect(custom.rejected_count).toBe(1)
    expect(custom.valid_count).toBe(1)
    expect(custom.worst_status).toBe('rejected')
  })

  it('expired_pending counts as expired and can be worst when no plain expired/rejected', () => {
    const rows = [
      doc({
        id: 'b',
        document_type: 'vehicle_insurance',
        status: 'pending_review',
        computed_status: 'pending_review',
        expires_at: '2026-07-01T00:00:00Z',
      }),
      validDoc('vehicle_registration', 'a'),
      validDoc('periodic_inspection', 'c'),
      validDoc('tvde_sticker', 'd'),
    ]
    const s = summarizeVehicleDocuments(rows, { now })
    expect(s.expired_count).toBe(1)
    expect(s.pending_review_count).toBe(0)
    expect(s.worst_status).toBe('expired_pending')
  })
})
