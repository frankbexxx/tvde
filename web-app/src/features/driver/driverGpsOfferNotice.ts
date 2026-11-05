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

/**
 * Classificação da localização vinda de GET /driver/status.
 * `unconfirmed` cobre a ausência de leitura e motivos que não são de GPS:
 * a API não diz, nesses casos, se o fix está recente.
 */
export type ServerLocationClass = 'recent' | 'stale' | 'missing' | 'unconfirmed'

export type GpsOfferNoticeState = {
  visibleReason: GpsOfferReason | null
  fetchFailed: boolean
  hasReading: boolean
  serverLocationClass: ServerLocationClass
}

export const INITIAL_GPS_OFFER_NOTICE: GpsOfferNoticeState = {
  visibleReason: null,
  fetchFailed: false,
  hasReading: false,
  serverLocationClass: 'unconfirmed',
}

export type PresentedLocationCue = 'recent' | 'stale' | 'refreshing' | 'unavailable' | 'unconfirmed'

/**
 * O fix local não chega para dizer que a localização está recente.
 * `recent` só quando o servidor confirma `matching_eligible`.
 */
export function presentedDriverLocationCue(input: {
  serverLocationClass: ServerLocationClass
  fetchFailed: boolean
  attention: 'none' | 'refreshing' | 'cooldown'
}): PresentedLocationCue {
  if (input.attention === 'refreshing') return 'refreshing'
  if (input.fetchFailed) return 'unconfirmed'
  if (input.serverLocationClass === 'stale') return 'stale'
  if (input.serverLocationClass === 'missing') return 'unavailable'
  if (input.attention === 'cooldown' && input.serverLocationClass !== 'recent') return 'unavailable'
  if (input.serverLocationClass === 'recent') return 'recent'
  return 'unconfirmed'
}

export function driverAvailabilityLabelKey(
  cue: PresentedLocationCue,
):
  | 'availability.stateOnline'
  | 'availability.stateOnlineRecent'
  | 'availability.stateOnlineStale'
  | 'availability.stateOnlineRefreshing'
  | 'availability.stateOnlineUnavailable' {
  switch (cue) {
    case 'recent':
      return 'availability.stateOnlineRecent'
    case 'stale':
      return 'availability.stateOnlineStale'
    case 'refreshing':
      return 'availability.stateOnlineRefreshing'
    case 'unavailable':
      return 'availability.stateOnlineUnavailable'
    case 'unconfirmed':
      return 'availability.stateOnline'
  }
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

function clearedReading(serverLocationClass: ServerLocationClass): GpsOfferNoticeState {
  return { ...INITIAL_GPS_OFFER_NOTICE, hasReading: true, serverLocationClass }
}

function shown(reason: GpsOfferReason): GpsOfferNoticeState {
  return {
    visibleReason: reason,
    fetchFailed: false,
    hasReading: true,
    serverLocationClass: reason === 'location_missing' ? 'missing' : 'stale',
  }
}

function applyStatus(
  prev: GpsOfferNoticeState,
  status: DriverStatusEligibilitySnapshot,
): GpsOfferNoticeState {
  if (status.is_available === false) return clearedReading('unconfirmed')

  if (!hasEligibilityFields(status)) {
    return { ...prev, fetchFailed: false }
  }

  if (status.is_available !== true) {
    return { ...prev, fetchFailed: false }
  }

  if (status.matching_eligible === true) return clearedReading('recent')

  const reason = status.matching_ineligible_reason
  if (!isGpsOfferReason(reason)) return clearedReading('unconfirmed')
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
