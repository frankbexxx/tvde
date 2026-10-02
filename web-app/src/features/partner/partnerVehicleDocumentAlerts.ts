import type { TFunction } from 'i18next'
import type { PartnerVehicleRow } from '../../api/partner'
import type { PartnerAlert, PartnerAlertSeverity } from './partnerAlerts'

/** Fleet-level document problem kinds (priority order). */
export type FleetVehicleDocAlertKind =
  | 'rejected'
  | 'expired'
  | 'missing'
  | 'expiring_soon'
  | 'pending_review'

const KIND_PRIORITY: FleetVehicleDocAlertKind[] = [
  'rejected',
  'expired',
  'missing',
  'expiring_soon',
  'pending_review',
]

function bucketForWorstStatus(worst: string | null | undefined): FleetVehicleDocAlertKind | null {
  const w = (worst || '').trim().toLowerCase()
  if (w === 'rejected') return 'rejected'
  if (w === 'expired' || w === 'expired_pending') return 'expired'
  if (w === 'missing') return 'missing'
  if (w === 'expiring_soon') return 'expiring_soon'
  if (w === 'pending_review') return 'pending_review'
  return null
}

function clean(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null
  return trimmed
}

/** Plate, then make/model, then colour. Null when none of those exist. */
export function partnerVehicleHumanLabel(
  vehicle: Pick<PartnerVehicleRow, 'plate' | 'make' | 'model' | 'color'>,
): string | null {
  const plate = clean(vehicle.plate)
  const makeModel = [clean(vehicle.make), clean(vehicle.model)].filter(Boolean).join(' ')
  const color = clean(vehicle.color)
  const human = [plate, makeModel, color].filter(Boolean).join(' · ')
  return human || null
}

function vehicleListLabel(vehicle: PartnerVehicleRow): string {
  const human = partnerVehicleHumanLabel(vehicle)
  if (human) return human
  const id = clean(vehicle.id)
  return id ? `referência ${id}` : 'referência'
}

function severityForKind(kind: FleetVehicleDocAlertKind): PartnerAlertSeverity {
  if (kind === 'rejected' || kind === 'expired') return 'crit'
  if (kind === 'missing' || kind === 'expiring_soon') return 'warn'
  return 'info'
}

/**
 * PF3C-3 — Count vehicles by worst document_summary status; pick highest priority kind.
 */
export function summarizeFleetVehicleDocumentProblems(
  vehicles: readonly PartnerVehicleRow[]
): { kind: FleetVehicleDocAlertKind; vehicleCount: number; severity: PartnerAlertSeverity } | null {
  const counts: Record<FleetVehicleDocAlertKind, number> = {
    rejected: 0,
    expired: 0,
    missing: 0,
    expiring_soon: 0,
    pending_review: 0,
  }

  for (const v of vehicles) {
    const bucket = bucketForWorstStatus(v.document_summary?.worst_status)
    if (bucket) counts[bucket] += 1
  }

  for (const kind of KIND_PRIORITY) {
    const vehicleCount = counts[kind]
    if (vehicleCount > 0) {
      return { kind, vehicleCount, severity: severityForKind(kind) }
    }
  }
  return null
}

/** At most one aggregated vehicle-document alert for Partner Home. */
export function buildPartnerVehicleDocumentAlert(
  vehicles: readonly PartnerVehicleRow[],
  t: TFunction
): PartnerAlert | null {
  const summary = summarizeFleetVehicleDocumentProblems(vehicles)
  if (!summary) return null
  const matched = vehicles.filter(
    (vehicle) => bucketForWorstStatus(vehicle.document_summary?.worst_status) === summary.kind,
  )
  const single = matched.length === 1 ? matched[0] : null
  const singleHuman = single ? partnerVehicleHumanLabel(single) : null
  const body =
    single && !singleHuman
      ? t(`home.vehicleDocsAlert.${summary.kind}Reference`, {
          id: clean(single.id) ? `referência ${clean(single.id)}` : 'referência',
        })
      : t(`home.vehicleDocsAlert.${summary.kind}`, {
          count: matched.length,
          label: single ? vehicleListLabel(single) : '',
          vehicles: matched.map(vehicleListLabel).join(', '),
        })
  return {
    id: 'vehicle-documents',
    severity: summary.severity,
    title: t('home.vehicleDocsAlert.title'),
    body,
    menuScreen: 'fleet_vehicles',
    ctaLabel: t('home.vehicleDocsAlert.cta'),
  }
}
