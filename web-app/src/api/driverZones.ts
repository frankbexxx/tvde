/**
 * Driver «mudança de zona» (v1) — alinhado com ``/driver/zones/*`` no backend.
 */
import { apiFetch, type ApiError } from './client'

export type DriverZoneKind = 'generic' | 'airport'

export interface DriverZoneCatalogItem {
  zone_id: string
  label_pt: string
  kind: DriverZoneKind
}

export interface DriverZoneCatalogResponse {
  zones: DriverZoneCatalogItem[]
}

export interface DriverZoneBudgetToday {
  service_date: string
  used_changes: number
  max_changes: number
  remaining: number
  timezone: string
  resets_at_next_midnight_local?: boolean
}

export interface DriverZoneSession {
  id: string
  driver_id: string
  zone_id: string
  started_at: string
  eta_seconds_baseline: number
  eta_margin_percent: number
  deadline_at: string
  arrived_at?: string | null
  first_completed_trip_id?: string | null
  first_completed_at?: string | null
  consume_reason?: string | null
  status: string
}

export async function getDriverZoneBudgetToday(token: string): Promise<DriverZoneBudgetToday> {
  return apiFetch<DriverZoneBudgetToday>('/driver/zones/budget/today', { token })
}

export async function getDriverZoneCatalog(token: string): Promise<DriverZoneCatalogResponse> {
  return apiFetch<DriverZoneCatalogResponse>('/driver/zones/catalog', { token })
}

/** ``null`` quando não há sessão aberta (404). */
export async function fetchOpenDriverZoneSession(token: string): Promise<DriverZoneSession | null> {
  try {
    return await apiFetch<DriverZoneSession>('/driver/zones/sessions/open', { token })
  } catch (e) {
    const st = (e as ApiError)?.status
    if (st === 404) return null
    throw e
  }
}

export async function createDriverZoneSession(
  token: string,
  body: { zone_id: string; eta_seconds_baseline: number; eta_margin_percent: number },
): Promise<DriverZoneSession> {
  return apiFetch<DriverZoneSession>('/driver/zones/sessions', {
    method: 'POST',
    token,
    body: JSON.stringify(body),
  })
}

export async function postDriverZoneSessionArrived(
  token: string,
  sessionId: string,
): Promise<DriverZoneSession> {
  return apiFetch<DriverZoneSession>(`/driver/zones/sessions/${sessionId}/arrived`, {
    method: 'POST',
    token,
    body: JSON.stringify({}),
  })
}

export async function postDriverZoneSessionCancel(
  token: string,
  sessionId: string,
  cancelReason?: string | null,
): Promise<DriverZoneSession> {
  return apiFetch<DriverZoneSession>(`/driver/zones/sessions/${sessionId}/cancel`, {
    method: 'POST',
    token,
    body: JSON.stringify({ cancel_reason: cancelReason ?? null }),
  })
}
