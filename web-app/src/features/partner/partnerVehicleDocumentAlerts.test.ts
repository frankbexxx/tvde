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
    expect(one?.body).toBe('A viatura m · Toyota Yaris tem documentos em falta.')
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
    expect(many?.body).toBe(
      '2 viaturas com documentos em falta: m1 · Toyota Yaris, m2 · Toyota Yaris.',
    )
  })

  it('matrícula, marca/modelo e cor entram na frase; campos vazios não', async () => {
    await i18n.changeLanguage('pt')
    const t = i18n.getFixedT('pt', 'partner')
    const full = buildPartnerVehicleDocumentAlert(
      [
        {
          ...vehicle('id-1', 'rejected'),
          plate: '12-AB-34',
          make: 'Toyota',
          model: 'Corolla',
          color: 'azul',
        },
      ],
      t,
    )
    expect(full?.body).toBe('A viatura 12-AB-34 · Toyota Corolla · azul tem documentos rejeitados.')
    expect(full?.menuScreen).toBe('fleet_vehicles')

    const plateOnly = buildPartnerVehicleDocumentAlert(
      [{ ...vehicle('id-2', 'pending_review'), plate: '34-CD-56', make: '', model: '', color: null }],
      t,
    )
    expect(plateOnly?.body).toBe('A viatura 34-CD-56 tem documentos por rever.')
    expect(plateOnly?.body).not.toMatch(/undefined|null|· ·/)
  })

  it('sem matrícula nem marca usa a referência e não o uuid cru', async () => {
    await i18n.changeLanguage('pt')
    const t = i18n.getFixedT('pt', 'partner')
    const id = '2481222c-50f6-403f-aa59-8d386f1cd00a'
    const alert = buildPartnerVehicleDocumentAlert(
      [{ ...vehicle(id, 'expired'), plate: ' ', make: '', model: 'null', color: 'undefined' }],
      t,
    )
    expect(alert?.body).toBe(`Viatura · referência ${id} tem um documento expirado.`)
    expect(alert?.body?.startsWith('Viatura · referência')).toBe(true)
    expect(alert?.ctaLabel).toMatch(/ver viaturas/i)
  })
})
