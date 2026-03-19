import { apiFetch } from '../api/client'

export interface DriverLocationResponse {
  lat: number
  lng: number
  timestamp: number
}

/** A013: soft outcomes — never surface as “Servidor indisponível”. */
export type DriverLocationFailureReason =
  | 'driver_not_assigned'
  | 'location_unavailable'
  | 'trip_completed'

export type DriverLocationResult =
  | { ok: true; lat: number; lng: number }
  | { ok: false; reason: DriverLocationFailureReason }

const TRIP_NOT_ACTIVE_PREFIX = 'trip_not_active_for_location_'

/** Terminal trip statuses from GET driver-location 409 (backend: trip not in accepted/arriving/ongoing). */
const TERMINAL_TRIP_STATUS_FOR_LOCATION = new Set(['completed', 'cancelled', 'failed'])

function toDetailString(detail: unknown): string {
  if (detail == null) return ''
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const first = detail[0] as { msg?: string } | undefined
    if (first && typeof first === 'object' && 'msg' in first && first.msg != null) {
      return String(first.msg)
    }
    try {
      return JSON.stringify(detail)
    } catch {
      return ''
    }
  }
  if (typeof detail === 'object' && detail !== null && 'detail' in detail) {
    return toDetailString((detail as { detail: unknown }).detail)
  }
  return String(detail)
}

function reasonFor409Conflict(detailRaw: unknown): DriverLocationFailureReason {
  const detail = toDetailString(detailRaw)
  if (detail.startsWith(TRIP_NOT_ACTIVE_PREFIX)) {
    const statusSuffix = detail.slice(TRIP_NOT_ACTIVE_PREFIX.length)
    if (TERMINAL_TRIP_STATUS_FOR_LOCATION.has(statusSuffix)) {
      return 'trip_completed'
    }
  }
  // e.g. assigned/requested — localização ainda não exposta; não confundir com viagem concluída
  return 'location_unavailable'
}

/**
 * Fetches the latest driver location for a given trip.
 * A013: 404 / most 409 = fluxo normal (sem toast, sem erro vermelho). Só 5xx, rede ou 401/403 propagam erro real.
 */
export async function getDriverLocation(tripId: string): Promise<DriverLocationResult> {
  try {
    const res = await apiFetch<DriverLocationResponse>(`/trips/${tripId}/driver-location`)
    return { ok: true, lat: res.lat, lng: res.lng }
  } catch (err) {
    const status = (err as { status?: number })?.status
    const detail = (err as { detail?: unknown })?.detail

    // Qualquer 404 neste endpoint = ainda sem motorista ou sem posição persistida (esperado).
    if (status === 404) {
      return { ok: false, reason: 'driver_not_assigned' }
    }

    if (status === 409) {
      return { ok: false, reason: reasonFor409Conflict(detail) }
    }

    // Erro real: 5xx, falha de rede, timeout
    if (status != null && status >= 500) {
      console.warn('[getDriverLocation] server error', status, toDetailString(detail))
    } else if (status === 0) {
      console.warn('[getDriverLocation] network or timeout', toDetailString(detail))
    }
    throw err
  }
}

