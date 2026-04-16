/**
 * Admin API — all endpoints needed for mobile admin management.
 */
import { apiFetch, API_BASE } from './client'
import type { TripHistoryItem } from './trips'

export interface TripActiveItem {
  trip_id: string
  status: string
  passenger_id: string
  driver_id: string | null
  origin_lat: number
  origin_lng: number
  destination_lat: number
  destination_lng: number
}

export interface TripDetailAdmin {
  trip_id: string
  status: string
  passenger_id: string
  driver_id?: string
  origin_lat: number
  origin_lng: number
  destination_lat: number
  destination_lng: number
  estimated_price: number
  final_price?: number
  stripe_payment_intent_id?: string
  [key: string]: unknown
}

export interface SystemHealthResponse {
  status: string
  trips_accepted_too_long: Array<Record<string, unknown>>
  trips_ongoing_too_long: Array<Record<string, unknown>>
  stuck_payments: Array<Record<string, unknown>>
  drivers_unavailable_too_long: Array<Record<string, unknown>>
  /** Presentes na API; listas de anomalias financeiras / pagamento em falta. */
  missing_payment_records?: Array<Record<string, unknown>>
  inconsistent_financial_state?: Array<Record<string, unknown>>
  warnings: string[]
}

export interface AdminMetricsResponse {
  active_trips: number
  drivers_available: number
  drivers_busy: number
  trips_requested: number
  trips_ongoing: number
  trips_completed_today: number
  trips_created_total: number
  trips_accepted_total: number
  trips_completed_total: number
}

export interface WeeklyReportRow {
  week_start: string
  trips_created: number
  trips_completed: number
}

export interface AdminAlertsResponse {
  zero_drivers_available: boolean
  zero_trips_today: boolean
}

export interface AdminUsageSummaryResponse {
  metrics: AdminMetricsResponse
  alerts: AdminAlertsResponse
  weekly: WeeklyReportRow[]
}

export interface RunTimeoutsResponse {
  assigned_to_requested: number
  accepted_to_cancelled: number
  ongoing_to_failed: number
}

export interface RunOfferExpiryResponse {
  expired_count: number
  redispatch_offers_created: number
}

export interface RecoverDriverResponse {
  driver_id: string
  is_available: boolean
}

export async function getActiveTrips(token: string): Promise<TripActiveItem[]> {
  return apiFetch<TripActiveItem[]>('/admin/trips/active', { token })
}

/** Viagens concluídas / canceladas / falha (mais recentes primeiro; paginação opcional). */
export async function getAdminTripHistory(
  token: string,
  opts?: { limit?: number; offset?: number }
): Promise<TripHistoryItem[]> {
  const q = new URLSearchParams()
  if (opts?.limit != null) q.set('limit', String(opts.limit))
  if (opts?.offset != null) q.set('offset', String(opts.offset))
  const qs = q.toString()
  return apiFetch<TripHistoryItem[]>(`/admin/trip-history${qs ? `?${qs}` : ''}`, { token })
}

export async function getTripDetailAdmin(
  tripId: string,
  token: string
): Promise<TripDetailAdmin> {
  return apiFetch<TripDetailAdmin>(`/admin/trips/${tripId}`, { token })
}

export async function getTripDebug(tripId: string, token: string): Promise<Record<string, unknown>> {
  return apiFetch<Record<string, unknown>>(`/admin/trip-debug/${tripId}`, { token })
}

export async function assignTripAdmin(
  tripId: string,
  token: string
): Promise<{ trip_id: string; status: string }> {
  return apiFetch(`/admin/trips/${tripId}/assign`, {
    method: 'POST',
    token,
  })
}

export async function cancelTripAdmin(
  tripId: string,
  token: string
): Promise<{ trip_id: string; status: string }> {
  return apiFetch(`/admin/cancel-trip/${tripId}`, {
    method: 'POST',
    token,
  })
}

export async function getSystemHealth(token: string): Promise<SystemHealthResponse> {
  return apiFetch<SystemHealthResponse>('/admin/system-health', { token })
}

export async function getMetrics(token: string): Promise<AdminMetricsResponse> {
  return apiFetch<AdminMetricsResponse>('/admin/metrics', { token })
}

export async function getWeeklyReport(token: string): Promise<WeeklyReportRow[]> {
  return apiFetch<WeeklyReportRow[]>('/admin/reports/weekly', { token })
}

export async function getAdminAlerts(token: string): Promise<AdminAlertsResponse> {
  return apiFetch<AdminAlertsResponse>('/admin/alerts', { token })
}

export async function getUsageSummary(token: string): Promise<AdminUsageSummaryResponse> {
  return apiFetch<AdminUsageSummaryResponse>('/admin/usage-summary', { token })
}

export async function runTimeouts(token: string): Promise<RunTimeoutsResponse> {
  return apiFetch<RunTimeoutsResponse>('/admin/run-timeouts', {
    method: 'POST',
    token,
  })
}

export async function runOfferExpiry(token: string): Promise<RunOfferExpiryResponse> {
  return apiFetch<RunOfferExpiryResponse>('/admin/run-offer-expiry', {
    method: 'POST',
    token,
  })
}

export async function recoverDriver(
  driverId: string,
  token: string
): Promise<RecoverDriverResponse> {
  return apiFetch<RecoverDriverResponse>(`/admin/recover-driver/${driverId}`, {
    method: 'POST',
    token,
  })
}

export async function exportLogsCsv(token: string): Promise<Blob> {
  const res = await fetch(`${API_BASE}/admin/export-logs?format=csv`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.blob()
}

export interface AdminPhase0Response {
  status: string
  request_id: string
  env: string
  environment: string | null
  cron_secret_set: boolean
  stripe_webhook_secret_set: boolean
  stripe_mock: boolean
  beta_mode: boolean
}

export interface AdminCronRunResponse {
  status: string
  duration_ms: number
  error_count: number
  errors: Record<string, string>
  timeouts: Record<string, number>
  offers: Record<string, number>
  cleanup: Record<string, unknown>
  system_health_status: string
  request_id: string
}

export interface AdminEnvValidateResponse {
  status: string
  request_id: string
  present_keys: string[]
  missing_required_keys: string[]
  ignored_lines: number
}

export async function getAdminPhase0(token: string): Promise<AdminPhase0Response> {
  return apiFetch<AdminPhase0Response>('/admin/phase0', { token })
}

export async function runAdminCron(token: string): Promise<AdminCronRunResponse> {
  return apiFetch<AdminCronRunResponse>('/admin/cron/run', { method: 'POST', token })
}

export async function validateEnvText(
  envText: string,
  token: string
): Promise<AdminEnvValidateResponse> {
  return apiFetch<AdminEnvValidateResponse>('/admin/env/validate', {
    method: 'POST',
    token,
    body: JSON.stringify({ env_text: envText }),
  })
}

export interface AdminPartnerCreatedResponse {
  id: string
  name: string
  created_at: string
}

export interface AdminPartnerOrgAdminCreatedResponse {
  user_id: string
  role: string
  partner_id: string
  phone: string
  name: string
}

export interface AdminPartnerListItem {
  id: string
  name: string
  created_at: string
}

export interface AdminDriverListItem {
  user_id: string
  partner_id: string
  status: string
}

export interface AdminAssignPartnerResponse {
  user_id: string
  partner_id: string
}

export async function createPartner(
  name: string,
  token: string
): Promise<AdminPartnerCreatedResponse> {
  return apiFetch<AdminPartnerCreatedResponse>('/admin/partners', {
    method: 'POST',
    body: JSON.stringify({ name: name.trim() }),
    token,
  })
}

export async function createPartnerOrgAdmin(
  partnerId: string,
  body: { name: string; phone: string },
  token: string
): Promise<AdminPartnerOrgAdminCreatedResponse> {
  const pid = partnerId.trim()
  return apiFetch<AdminPartnerOrgAdminCreatedResponse>(
    `/admin/partners/${encodeURIComponent(pid)}/create-admin`,
    {
      method: 'POST',
      body: JSON.stringify({
        name: body.name.trim(),
        phone: body.phone.trim(),
      }),
      token,
    }
  )
}

export async function listPartners(token: string): Promise<AdminPartnerListItem[]> {
  return apiFetch<AdminPartnerListItem[]>('/admin/partners', { token })
}

export async function listDrivers(token: string): Promise<AdminDriverListItem[]> {
  return apiFetch<AdminDriverListItem[]>('/admin/drivers', { token })
}

export async function assignDriverToPartner(
  driverUserId: string,
  partnerId: string,
  token: string
): Promise<AdminAssignPartnerResponse> {
  const did = driverUserId.trim()
  const pid = partnerId.trim()
  return apiFetch<AdminAssignPartnerResponse>(`/admin/drivers/${encodeURIComponent(did)}/assign-partner`, {
    method: 'POST',
    body: JSON.stringify({ partner_id: pid }),
    token,
  })
}

export async function unassignDriverFromPartner(
  driverUserId: string,
  token: string
): Promise<AdminAssignPartnerResponse> {
  const did = driverUserId.trim()
  return apiFetch<AdminAssignPartnerResponse>(`/admin/drivers/${encodeURIComponent(did)}/assign-partner`, {
    method: 'DELETE',
    token,
  })
}
