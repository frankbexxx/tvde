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
  return {
    id: 'vehicle-documents',
    severity: summary.severity,
    title: t('home.vehicleDocsAlert.title'),
    body: t(`home.vehicleDocsAlert.${summary.kind}`, { count: summary.vehicleCount }),
    menuScreen: 'fleet_vehicles',
    ctaLabel: t('home.vehicleDocsAlert.cta'),
  }
}
