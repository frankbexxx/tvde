import type { PartnerVehicleDocumentRow } from '../../api/partner'

/** PARTNER-FLEET-3B smoke: client-side upload limits (must match backend). */
export const VEHICLE_DOC_MAX_BYTES = 5 * 1024 * 1024
export const VEHICLE_DOC_ACCEPT =
  '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png'
const VEHICLE_DOC_EXTS = new Set(['.pdf', '.jpg', '.jpeg', '.png'])
const VEHICLE_DOC_MIMES = new Set(['application/pdf', 'image/jpeg', 'image/png'])

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

/**
 * Display status for compliance UI.
 * Priority: rejected → expired → expiring_soon → pending → valid → missing.
 * Expired date beats pending_review (backend may still send pending_review).
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
  if (exp && exp.getTime() < now.getTime()) {
    return stored === 'pending_review' || computed === 'pending_review'
      ? 'expired_pending'
      : 'expired'
  }
  if (computed === 'expired') return 'expired'
  if (computed === 'expiring_soon') return 'expiring_soon'
  if (exp) {
    const soon = exp.getTime() - now.getTime()
    if (soon >= 0 && soon <= 30 * 24 * 60 * 60 * 1000) return 'expiring_soon'
  }
  if (stored === 'pending_review' || computed === 'pending_review') return 'pending_review'
  if (computed === 'valid' || stored === 'approved') return 'valid'
  return computed || stored || 'pending_review'
}
