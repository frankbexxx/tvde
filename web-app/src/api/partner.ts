import { API_BASE, apiFetch } from './client'

export interface PartnerDriverRow {
  user_id: string
  partner_id: string
  status: string
  is_available: boolean
  user: { name: string | null; phone: string | null }
  last_location: { lat: number; lng: number; timestamp: string } | null
  documents?: Record<
    string,
    {
      status?: string
      expires_at?: string | null
      partner_note?: string | null
      submitted_at?: string | null
      ocr_suggested_expires_at?: string | null
    }
  > | null
  /** PARTNER-FLEET-1A: trip activa na frota (assigned|accepted|arriving|ongoing). */
  active_trip_id?: string | null
  active_trip_status?: string | null
}

export interface PartnerDriverDiscoveryItem {
  user_id: string
  name: string | null
  phone: string | null
  status: string
  partner_id: string
}

export interface PartnerTripRow {
  trip_id: string
  status: string
  passenger_id: string
  driver_id: string | null
  origin_lat: number
  origin_lng: number
  destination_lat: number
  destination_lng: number
  estimated_price: number
  final_price?: number | null
  cancel_reason?: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
  updated_at: string
}

export interface PartnerMetrics {
  trips_today: number
  trips_total: number
  active_drivers: number
  trips_completed: number
  trips_cancelled: number
  total_drivers: number
  /** PARTNER-FLEET-1A: completed hoje + receita bruta app (€). */
  trips_completed_today?: number
  revenue_completed_today?: number
}

export async function fetchPartnerDrivers(): Promise<PartnerDriverRow[]> {
  return apiFetch<PartnerDriverRow[]>('/partner/drivers')
}

export async function fetchPartnerDriver(userId: string): Promise<PartnerDriverRow> {
  return apiFetch<PartnerDriverRow>(`/partner/drivers/${encodeURIComponent(userId)}`)
}

export async function fetchPartnerTrips(): Promise<PartnerTripRow[]> {
  return apiFetch<PartnerTripRow[]>('/partner/trips')
}

export async function fetchPartnerTrip(tripId: string): Promise<PartnerTripRow> {
  return apiFetch<PartnerTripRow>(`/partner/trips/${encodeURIComponent(tripId)}`)
}

export async function fetchPartnerMetrics(): Promise<PartnerMetrics> {
  return apiFetch<PartnerMetrics>('/partner/metrics')
}

export async function discoverPartnerDrivers(q: string): Promise<PartnerDriverDiscoveryItem[]> {
  return apiFetch<PartnerDriverDiscoveryItem[]>(
    `/partner/drivers/discover?q=${encodeURIComponent(q)}`
  )
}

export async function addDriverToFleet(driverUserId: string): Promise<PartnerDriverRow> {
  return apiFetch<PartnerDriverRow>(`/partner/drivers/${encodeURIComponent(driverUserId)}/add-to-fleet`, {
    method: 'POST',
  })
}

export async function removeDriverFromFleet(userId: string): Promise<void> {
  await apiFetch<void>(`/partner/drivers/${encodeURIComponent(userId)}/from-fleet`, {
    method: 'DELETE',
  })
}

export async function postPartnerMessage(body: {
  title: string
  body: string
  priority?: 'normal' | 'high'
  driver_user_id?: string | null
}): Promise<void> {
  await apiFetch('/partner/messages', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export interface PartnerMessageRow {
  id: string
  title: string
  body: string
  priority: string
  created_at: string
  driver_user_id: string | null
  direction?: string
  read: boolean
}

export interface PartnerInboxMessageRow {
  id: string
  title: string
  body: string
  priority: string
  created_at: string
  driver_user_id: string
  read: boolean
}

export async function fetchPartnerSentMessages(): Promise<PartnerMessageRow[]> {
  return apiFetch<PartnerMessageRow[]>('/partner/messages/sent')
}

export async function fetchPartnerInboxMessages(): Promise<PartnerInboxMessageRow[]> {
  return apiFetch<PartnerInboxMessageRow[]>('/partner/messages/inbox')
}

export async function markPartnerMessageRead(messageId: string): Promise<void> {
  await apiFetch<void>(`/partner/messages/${encodeURIComponent(messageId)}/read`, {
    method: 'PATCH',
  })
}

export function partnerDriverDocumentFileUrl(userId: string, docKey: string): string {
  return `${API_BASE.replace(/\/$/, '')}/partner/drivers/${encodeURIComponent(userId)}/documents/${encodeURIComponent(docKey)}/file`
}

export async function patchPartnerDriverStatus(
  userId: string,
  enabled: boolean
): Promise<PartnerDriverRow> {
  return apiFetch<PartnerDriverRow>(`/partner/drivers/${encodeURIComponent(userId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  })
}

export async function patchPartnerDriverAvailability(
  userId: string,
  online: boolean
): Promise<PartnerDriverRow> {
  return apiFetch<PartnerDriverRow>(
    `/partner/drivers/${encodeURIComponent(userId)}/availability`,
    {
      method: 'PATCH',
      body: JSON.stringify({ online }),
    }
  )
}

export interface PartnerDriverZoneBudgetToday {
  service_date: string
  used_changes: number
  max_changes: number
  remaining: number
  timezone: string
  resets_at_next_midnight_local?: boolean
}

export async function fetchPartnerDriverZoneBudgetToday(
  userId: string
): Promise<PartnerDriverZoneBudgetToday> {
  return apiFetch<PartnerDriverZoneBudgetToday>(
    `/partner/drivers/${encodeURIComponent(userId)}/zones/budget/today`
  )
}

export async function postPartnerGrantDriverZoneBudgetExtra(
  userId: string,
  body: { extra_max_changes?: number; service_date?: string | null } = {}
): Promise<PartnerDriverZoneBudgetToday> {
  return apiFetch<PartnerDriverZoneBudgetToday>(
    `/partner/drivers/${encodeURIComponent(userId)}/zones/budget/grant-extra`,
    {
      method: 'POST',
      body: JSON.stringify({
        extra_max_changes: body.extra_max_changes ?? 1,
        service_date: body.service_date ?? null,
      }),
    }
  )
}

export interface PartnerDriverZoneSession {
  id: string
  zone_id: string
  deadline_at: string
  extension_requested?: boolean
  extension_reason?: string | null
  extension_seconds_approved?: number | null
  status: string
}

export async function fetchPartnerDriverZoneSessionOpen(
  userId: string
): Promise<PartnerDriverZoneSession | null> {
  const res = await apiFetch<{ session: PartnerDriverZoneSession | null }>(
    `/partner/drivers/${encodeURIComponent(userId)}/zones/sessions/open`
  )
  return res.session ?? null
}

export async function postPartnerApproveZoneExtension(
  userId: string,
  sessionId: string,
  extraSeconds: number
): Promise<PartnerDriverZoneSession> {
  return apiFetch<PartnerDriverZoneSession>(
    `/partner/drivers/${encodeURIComponent(userId)}/zones/sessions/${encodeURIComponent(sessionId)}/approve-extension`,
    {
      method: 'POST',
      body: JSON.stringify({ extra_seconds: extraSeconds }),
    }
  )
}

export async function patchPartnerDriverDocuments(
  userId: string,
  docs: Record<
    string,
    { status?: string; expires_at?: string | null; partner_note?: string | null }
  >
): Promise<PartnerDriverRow> {
  return apiFetch<PartnerDriverRow>(`/partner/drivers/${encodeURIComponent(userId)}/documents`, {
    method: 'PATCH',
    body: JSON.stringify({ docs }),
  })
}

export async function postPartnerTripReassign(
  tripId: string,
  driverUserId: string
): Promise<PartnerTripRow> {
  return apiFetch<PartnerTripRow>(
    `/partner/trips/${encodeURIComponent(tripId)}/reassign-driver`,
    {
      method: 'POST',
      body: JSON.stringify({ driver_user_id: driverUserId }),
    }
  )
}

export type PartnerTripsExportFilters = {
  tripFilter?: 'all' | 'ongoing' | 'completed' | 'cancelled' | 'failed' | 'assigned'
  driverId?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}

/**
 * Build GET /partner/trips/export URL.
 * Uses string + URLSearchParams (not `new URL(relative)`) so API_BASE='/api' works in Vite proxy/dev.
 * `apiBase` override is for tests only.
 */
export function partnerTripsExportUrl(
  filters?: PartnerTripsExportFilters,
  apiBase: string = API_BASE
): string {
  const base = apiBase.replace(/\/$/, '')
  const path = `${base}/partner/trips/export`
  if (!filters) return path
  const q = new URLSearchParams()
  if (filters.tripFilter && filters.tripFilter !== 'all') {
    q.set('status', filters.tripFilter)
  }
  if (filters.driverId) q.set('driver_id', filters.driverId)
  if (filters.dateFrom) q.set('from', filters.dateFrom)
  if (filters.dateTo) q.set('to', filters.dateTo)
  if (filters.search?.trim()) q.set('q', filters.search.trim())
  const qs = q.toString()
  return qs ? `${path}?${qs}` : path
}

/** SP-C: cabeçalho CSV `GET /partner/trips/export` (UTF-8). Não reordenar colunas; só acrescentar no fim em versões futuras. */
export const PARTNER_TRIPS_CSV_COLUMNS = [
  'trip_id',
  'driver_id',
  'passenger_id',
  'status',
  'created_at',
  'started_at',
  'completed_at',
  'updated_at',
  'estimated_price',
  'final_price',
] as const
