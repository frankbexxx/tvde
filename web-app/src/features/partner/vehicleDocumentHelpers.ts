import type { PartnerVehicleDocumentRow } from '../../api/partner'

/** PARTNER-FLEET-3B smoke: client-side upload limits (must match backend). */
export const VEHICLE_DOC_MAX_BYTES = 5 * 1024 * 1024
export const VEHICLE_DOC_ACCEPT =
  '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png'
const VEHICLE_DOC_EXTS = new Set(['.pdf', '.jpg', '.jpeg', '.png'])
const VEHICLE_DOC_MIMES = new Set(['application/pdf', 'image/jpeg', 'image/png'])
const EXPIRING_SOON_DAYS = 30

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
 * Display status for compliance UI.
 * Priority: rejected → expired → expiring_soon → pending → valid → missing.
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
