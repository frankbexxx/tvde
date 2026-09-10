/**
 * PET-5A.2 — structured attendable reasons (animal / assistance dog).
 * Codes must match backend `app.services.attendable_reasons`.
 */

export const ATTENDABLE_REASON_CODES = [
  'animal_safety_risk',
  'animal_hygiene_issue',
  'animal_health_concern',
  'inadequate_accommodation',
  'other_attendable_reason',
] as const

export type AttendableReasonCode = (typeof ATTENDABLE_REASON_CODES)[number]

export const OTHER_ATTENDABLE_REASON: AttendableReasonCode = 'other_attendable_reason'

export const MAX_ATTENDABLE_REASON_DETAIL = 280

export type AnimalTripFlags = {
  has_pet?: boolean | null
  is_assistance_animal?: boolean | null
  vehicle_category?: string | null
}

export function tripInvolvesAnimal(trip: AnimalTripFlags | null | undefined): boolean {
  if (!trip) return false
  if (trip.is_assistance_animal) return true
  if (trip.has_pet) return true
  return (trip.vehicle_category ?? '').trim().toLowerCase() === 'pet'
}

export function isAttendableReasonCode(raw: string | null | undefined): raw is AttendableReasonCode {
  return ATTENDABLE_REASON_CODES.includes(raw as AttendableReasonCode)
}

export function validateAttendableReasonInput(
  code: string | null | undefined,
  detail: string | null | undefined,
): { ok: true; code: AttendableReasonCode; detail: string | null } | { ok: false; messageKey: string } {
  const c = (code ?? '').trim()
  if (!c || !isAttendableReasonCode(c)) {
    return { ok: false, messageKey: 'attendableReasons.errCodeRequired' }
  }
  const d = (detail ?? '').trim()
  if (c === OTHER_ATTENDABLE_REASON && !d) {
    return { ok: false, messageKey: 'attendableReasons.errDetailRequired' }
  }
  if (d.length > MAX_ATTENDABLE_REASON_DETAIL) {
    return { ok: false, messageKey: 'attendableReasons.errDetailTooLong' }
  }
  return { ok: true, code: c, detail: d || null }
}

/** i18n key under `trip:` namespace for a code. */
export function attendableReasonLabelKey(code: AttendableReasonCode): string {
  return `attendableReasons.${code}`
}
