import {
  PARTNER_VEHICLE_DOCUMENT_TYPES,
  type PartnerVehicleDocumentRow,
} from '../../api/partner'

/** PARTNER-FLEET-3B smoke: client-side upload limits (must match backend). */
export const VEHICLE_DOC_MAX_BYTES = 5 * 1024 * 1024
export const VEHICLE_DOC_ACCEPT =
  '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png'
const VEHICLE_DOC_EXTS = new Set(['.pdf', '.jpg', '.jpeg', '.png'])
const VEHICLE_DOC_MIMES = new Set(['application/pdf', 'image/jpeg', 'image/png'])
const EXPIRING_SOON_DAYS = 30

/** Default P0 types — same order as PARTNER_VEHICLE_DOCUMENT_TYPES. */
export const DEFAULT_VEHICLE_DOCUMENT_REQUIRED_TYPES: readonly string[] =
  PARTNER_VEHICLE_DOCUMENT_TYPES

/**
 * Aggregate alert severity (worst first).
 * Distinct from the *derivation* order inside `vehicleDocumentDisplayStatus`
 * (which resolves one document's display key).
 */
const WORST_STATUS_RANK: Record<string, number> = {
  rejected: 0,
  expired: 1,
  expired_pending: 2,
  missing: 3,
  expiring_soon: 4,
  pending_review: 5,
  valid: 6,
}

export type VehicleDocumentDisplayStatusKey =
  | 'missing'
  | 'rejected'
  | 'expired'
  | 'expired_pending'
  | 'expiring_soon'
  | 'pending_review'
  | 'valid'

export type VehicleDocumentsSummary = {
  total_required: number
  present_count: number
  missing_count: number
  expired_count: number
  expiring_soon_count: number
  pending_review_count: number
  rejected_count: number
  valid_count: number
  /** Worst display status across required slots (incl. missing). */
  worst_status: VehicleDocumentDisplayStatusKey | string
}

function worstStatusRank(status: string): number {
  return WORST_STATUS_RANK[status] ?? 100
}

/**
 * Pick one row per `document_type` — last wins (same as PartnerVehicleDocumentsPanel Map).
 * Non-required types are ignored.
 */
export function indexVehicleDocumentsByType(
  documents: readonly PartnerVehicleDocumentRow[],
  requiredTypes: readonly string[] = DEFAULT_VEHICLE_DOCUMENT_REQUIRED_TYPES
): Map<string, PartnerVehicleDocumentRow> {
  const required = new Set(requiredTypes)
  const byType = new Map<string, PartnerVehicleDocumentRow>()
  for (const row of documents) {
    const key = (row.document_type || '').trim()
    if (!key || !required.has(key)) continue
    byType.set(key, row)
  }
  return byType
}

/**
 * PF3C-1 — Summarise P0 (or custom required) slots for one vehicle.
 * Uses `vehicleDocumentDisplayStatus` for per-slot status (date-only expiry).
 */
export function summarizeVehicleDocuments(
  documents: readonly PartnerVehicleDocumentRow[],
  options?: {
    requiredTypes?: readonly string[]
    now?: Date
  }
): VehicleDocumentsSummary {
  const requiredTypes =
    options?.requiredTypes ?? DEFAULT_VEHICLE_DOCUMENT_REQUIRED_TYPES
  const now = options?.now ?? new Date()
  const byType = indexVehicleDocumentsByType(documents, requiredTypes)

  let present_count = 0
  let missing_count = 0
  let expired_count = 0
  let expiring_soon_count = 0
  let pending_review_count = 0
  let rejected_count = 0
  let valid_count = 0
  let worst_status: string | null = null

  if (requiredTypes.length === 0) {
    return {
      total_required: 0,
      present_count: 0,
      missing_count: 0,
      expired_count: 0,
      expiring_soon_count: 0,
      pending_review_count: 0,
      rejected_count: 0,
      valid_count: 0,
      worst_status: 'valid',
    }
  }

  for (const docType of requiredTypes) {
    const row = byType.get(docType) ?? null
    const missing = row == null
    const status = vehicleDocumentDisplayStatus(row, missing, now)

    if (missing) {
      missing_count += 1
    } else {
      present_count += 1
    }

    switch (status) {
      case 'rejected':
        rejected_count += 1
        break
      case 'expired':
      case 'expired_pending':
        // expired_pending counts as expired for alert buckets; worst keeps the key.
        expired_count += 1
        break
      case 'expiring_soon':
        expiring_soon_count += 1
        break
      case 'pending_review':
        pending_review_count += 1
        break
      case 'valid':
        valid_count += 1
        break
      case 'missing':
        break
      default:
        // Unknown display keys: do not inflate known buckets; still affect worst.
        break
    }

    if (
      worst_status == null ||
      worstStatusRank(status) < worstStatusRank(worst_status)
    ) {
      worst_status = status
    }
  }

  return {
    total_required: requiredTypes.length,
    present_count,
    missing_count,
    expired_count,
    expiring_soon_count,
    pending_review_count,
    rejected_count,
    valid_count,
    worst_status: worst_status ?? 'missing',
  }
}

/** Returns i18n key under vehicles.documents.errors.*, or null if OK. */
export function validateVehicleDocumentFile(
  file: File
): 'fileTooLarge' | 'invalidFileType' | null {
  if (file.size > VEHICLE_DOC_MAX_BYTES) return 'fileTooLarge'
  const name = file.name || ''
  const dot = name.lastIndexOf('.')
  const ext = dot >= 0 ? name.slice(dot).toLowerCase() : ''
  if (!VEHICLE_DOC_EXTS.has(ext)) return 'invalidFileType'
  const mime = (file.type || '').split(';')[0].trim().toLowerCase()
  if (mime && !VEHICLE_DOC_MIMES.has(mime)) return 'invalidFileType'
  return null
}

function parseExpiresAt(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

/** UTC YYYY-MM-DD for date-only expiry (matches backend). */
export function utcDateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Whole UTC calendar days from `from` to `to` (to - from).
 * Negative ⇒ expiry date already passed.
 */
export function utcCalendarDaysBetween(from: Date, to: Date): number {
  const a = Date.parse(`${utcDateKey(from)}T00:00:00.000Z`)
  const b = Date.parse(`${utcDateKey(to)}T00:00:00.000Z`)
  return Math.round((b - a) / 86_400_000)
}

/**
 * Display status for one document slot.
 * Derivation order (checks): rejected → expiry (expired / expired_pending /
 * expiring_soon) → pending_review → valid.
 * Aggregate severity across slots: see `summarizeVehicleDocuments` / WORST_STATUS_RANK.
 * Expiry uses UTC calendar dates: expires_at on today is NOT expired.
 */
export function vehicleDocumentDisplayStatus(
  doc: PartnerVehicleDocumentRow | null,
  missing: boolean,
  now: Date = new Date()
):
  | 'missing'
  | 'rejected'
  | 'expired'
  | 'expired_pending'
  | 'expiring_soon'
  | 'pending_review'
  | 'valid'
  | string {
  if (missing || !doc) return 'missing'
  const stored = (doc.status || '').trim().toLowerCase()
  const computed = (doc.computed_status || '').trim().toLowerCase()
  if (stored === 'rejected' || computed === 'rejected') return 'rejected'

  const exp = parseExpiresAt(doc.expires_at)
  if (exp) {
    const daysLeft = utcCalendarDaysBetween(now, exp)
    if (daysLeft < 0) {
      return stored === 'pending_review' || computed === 'pending_review'
        ? 'expired_pending'
        : 'expired'
    }
    if (daysLeft <= EXPIRING_SOON_DAYS) return 'expiring_soon'
  } else if (computed === 'expired') {
    return 'expired'
  } else if (computed === 'expiring_soon') {
    return 'expiring_soon'
  }

  if (stored === 'pending_review' || computed === 'pending_review') return 'pending_review'
  if (computed === 'valid' || stored === 'approved') return 'valid'
  return computed || stored || 'pending_review'
}
