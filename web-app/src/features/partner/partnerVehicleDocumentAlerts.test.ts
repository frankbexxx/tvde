import { describe, expect, it } from 'vitest'
import type { PartnerVehicleDocumentSummary, PartnerVehicleRow } from '../../api/partner'
import i18n from '../../i18n'
import {
  buildPartnerVehicleDocumentAlert,
  summarizeFleetVehicleDocumentProblems,
} from './partnerVehicleDocumentAlerts'

function summary(
  worst: string,
  overrides: Partial<PartnerVehicleDocumentSummary> = {}
): PartnerVehicleDocumentSummary {
  return {
    total_required: 4,
    present_count: 0,
    missing_count: 0,
    expired_count: 0,
    expiring_soon_count: 0,
    pending_review_count: 0,
    rejected_count: 0,
    valid_count: 0,
    worst_status: worst,
    ...overrides,
  }
}

function vehicle(
  id: string,
  worst: string,
  overrides: Partial<PartnerVehicleDocumentSummary> = {}
): PartnerVehicleRow {
  return {
    id,
    partner_id: 'p1',
    plate: id,
    plate_normalized: id,
    make: 'Toyota',
    model: 'Yaris',
    year: 2020,
    color: null,
    service_categories: ['x'],
    status: 'active',
    created_at: '2026-07-24T00:00:00Z',
    updated_at: '2026-07-24T00:00:00Z',
    assigned_driver_id: null,
    assigned_driver_name: null,
    document_summary: summary(worst, overrides),
    vehicle_compliance: {
      compliance_status: worst === 'valid' ? 'compliant' : 'blocked',
      blocking_reasons: worst === 'valid' ? [] : ['missing_documents'],
      warning_reasons: [],
      worst_status: worst,
    },
  }
}

describe('summarizeFleetVehicleDocumentProblems (PF3C-3)', () => {
  it('sem problemas → null', () => {
    expect(
      summarizeFleetVehicleDocumentProblems([
        vehicle('a', 'valid', { valid_count: 4, present_count: 4 }),
      ])
    ).toBeNull()
    expect(summarizeFleetVehicleDocumentProblems([])).toBeNull()
  })

  it('rejected domina expired/missing', () => {
    const s = summarizeFleetVehicleDocumentProblems([
      vehicle('r', 'rejected'),
      vehicle('e', 'expired'),
      vehicle('m', 'missing', { missing_count: 2 }),
    ])
    expect(s).toEqual({ kind: 'rejected', vehicleCount: 1, severity: 'crit' })
  })

  it('expired / expired_pending domina missing', () => {
    expect(
      summarizeFleetVehicleDocumentProblems([
        vehicle('e', 'expired'),
        vehicle('m', 'missing', { missing_count: 4 }),
      ])
    ).toEqual({ kind: 'expired', vehicleCount: 1, severity: 'crit' })

    expect(
      summarizeFleetVehicleDocumentProblems([
        vehicle('ep', 'expired_pending'),
        vehicle('m', 'missing', { missing_count: 1 }),
      ])
    ).toEqual({ kind: 'expired', vehicleCount: 1, severity: 'crit' })
  })

  it('missing quando não há rejected/expired', () => {
    expect(
      summarizeFleetVehicleDocumentProblems([
        vehicle('m1', 'missing', { missing_count: 2 }),
        vehicle('m2', 'missing', { missing_count: 1 }),
        vehicle('x', 'expiring_soon'),
      ])
    ).toEqual({ kind: 'missing', vehicleCount: 2, severity: 'warn' })
  })

  it('expiring_soon quando não há problemas mais graves', () => {
    expect(
      summarizeFleetVehicleDocumentProblems([
        vehicle('x', 'expiring_soon'),
        vehicle('p', 'pending_review'),
      ])
    ).toEqual({ kind: 'expiring_soon', vehicleCount: 1, severity: 'warn' })
  })

  it('pending_review só quando é o pior', () => {
    expect(
      summarizeFleetVehicleDocumentProblems([
        vehicle('p1', 'pending_review'),
        vehicle('p2', 'pending_review'),
        vehicle('ok', 'valid', { valid_count: 4, present_count: 4 }),
      ])
    ).toEqual({ kind: 'pending_review', vehicleCount: 2, severity: 'info' })
  })
})

describe('buildPartnerVehicleDocumentAlert i18n', () => {
  it('plural PT 1 vs N', async () => {
    await i18n.changeLanguage('pt')
    const t = i18n.getFixedT('pt', 'partner')
    const one = buildPartnerVehicleDocumentAlert(
      [vehicle('m', 'missing', { missing_count: 1 })],
      t
    )
    expect(one?.body).toMatch(/^1 viatura com documentos em falta$/i)
    expect(one?.title).toMatch(/documentos de viaturas/i)
    expect(one?.ctaLabel).toMatch(/ver viaturas/i)
    expect(one?.menuScreen).toBe('fleet_vehicles')

    const many = buildPartnerVehicleDocumentAlert(
      [
        vehicle('m1', 'missing', { missing_count: 1 }),
        vehicle('m2', 'missing', { missing_count: 2 }),
      ],
      t
    )
    expect(many?.body).toMatch(/^2 viaturas com documentos em falta$/i)
  })
})
