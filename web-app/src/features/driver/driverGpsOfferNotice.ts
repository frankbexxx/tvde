/**
 * Aviso de ofertas no DriverDashboard.
 *
 * A elegibilidade vem só de GET /driver/status. Os 45 s ficam no backend.
 * location_missing e location_stale acendem o aviso na mesma leitura.
 * matching_eligible apaga o aviso na mesma leitura.
 */

export const GPS_OFFER_REASONS = ['location_missing', 'location_stale'] as const
export type GpsOfferReason = (typeof GPS_OFFER_REASONS)[number]

export type DriverStatusEligibilitySnapshot = {
  is_available?: boolean
  matching_eligible?: boolean
  gps_fix_age_seconds?: number | null
  location_stale_for_matching?: boolean
  matching_ineligible_reason?: string | null
}

export type GpsOfferNoticeState = {
  visibleReason: GpsOfferReason | null
  fetchFailed: boolean
  hasReading: boolean
}

export const INITIAL_GPS_OFFER_NOTICE: GpsOfferNoticeState = {
  visibleReason: null,
  fetchFailed: false,
  hasReading: false,
}

export type GpsOfferNoticeEvent =
  | { type: 'status'; status: DriverStatusEligibilitySnapshot }
  | { type: 'fetch_failed' }
  | { type: 'went_offline' }

function isGpsOfferReason(value: string | null | undefined): value is GpsOfferReason {
  return value === 'location_missing' || value === 'location_stale'
}

function hasEligibilityFields(status: DriverStatusEligibilitySnapshot): boolean {
  return 'matching_eligible' in status || 'matching_ineligible_reason' in status
}

function clearedReading(): GpsOfferNoticeState {
  return { ...INITIAL_GPS_OFFER_NOTICE, hasReading: true }
}

function shown(reason: GpsOfferReason): GpsOfferNoticeState {
  return { visibleReason: reason, fetchFailed: false, hasReading: true }
}

function applyStatus(
  prev: GpsOfferNoticeState,
  status: DriverStatusEligibilitySnapshot,
): GpsOfferNoticeState {
  if (status.is_available === false) return clearedReading()

  if (!hasEligibilityFields(status)) {
    return { ...prev, fetchFailed: false }
  }

  if (status.is_available !== true) {
    return { ...prev, fetchFailed: false }
  }

  if (status.matching_eligible === true) return clearedReading()

  const reason = status.matching_ineligible_reason
  if (!isGpsOfferReason(reason)) return clearedReading()
  return shown(reason)
}

export function reduceGpsOfferNotice(
  prev: GpsOfferNoticeState,
  event: GpsOfferNoticeEvent,
): GpsOfferNoticeState {
  if (event.type === 'went_offline') return INITIAL_GPS_OFFER_NOTICE
  if (event.type === 'fetch_failed') {
    return { ...prev, fetchFailed: true }
  }
  return applyStatus(prev, event.status)
}
