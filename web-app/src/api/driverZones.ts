/**
 * Driver «mudança de zona» (v1) — alinhado com ``/driver/zones/*`` no backend.
 */
import { apiFetch, type ApiError } from './client'

export type DriverZoneKind = 'generic' | 'airport'

export interface DriverZoneCatalogItem {
  zone_id: string
  label_pt: string
  kind: DriverZoneKind
  ops_note_pt?: string | null
  /** WGS84 anchor for server-side «Cheguei» distance check (when arrived_max_km is set). */
  arrived_anchor_lat?: number | null
  arrived_anchor_lng?: number | null
  arrived_max_km?: number | null
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
  extension_requested?: boolean
  extension_reason?: string | null
  extension_seconds_approved?: number | null
  approved_by_partner_user_id?: string | null
}

export interface DriverZoneEtaEstimateResponse {
  zone_id: string
  eta_seconds_baseline: number
  source: 'server_haversine'
  distance_km: number
}

export interface DriverZoneCustomItem {
  zone_id: string
  created_at: string
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

export async function postDriverZoneEtaEstimate(
  token: string,
  zoneId: string,
): Promise<DriverZoneEtaEstimateResponse> {
  return apiFetch<DriverZoneEtaEstimateResponse>('/driver/zones/eta-estimate', {
    method: 'POST',
    token,
    body: JSON.stringify({ zone_id: zoneId }),
  })
}

export async function getDriverZoneCustomZones(token: string): Promise<DriverZoneCustomItem[]> {
  const res = await apiFetch<{ zones: DriverZoneCustomItem[] }>('/driver/zones/custom-zones', { token })
  return res.zones ?? []
}

export async function postDriverZoneCustomZone(token: string, zoneId: string): Promise<DriverZoneCustomItem> {
  return apiFetch<DriverZoneCustomItem>('/driver/zones/custom-zones', {
    method: 'POST',
    token,
    body: JSON.stringify({ zone_id: zoneId }),
  })
}

export async function deleteDriverZoneCustomZone(token: string, zoneId: string): Promise<void> {
  await apiFetch<void>(`/driver/zones/custom-zones/${encodeURIComponent(zoneId)}`, {
    method: 'DELETE',
    token,
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

export async function postDriverZoneSessionRequestExtension(
  token: string,
  sessionId: string,
  reason: string,
): Promise<DriverZoneSession> {
  return apiFetch<DriverZoneSession>(`/driver/zones/sessions/${sessionId}/request-extension`, {
    method: 'POST',
    token,
    body: JSON.stringify({ reason }),
  })
}
