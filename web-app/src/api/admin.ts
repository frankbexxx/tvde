/**
 * Admin API — all endpoints needed for mobile admin management.
 */
import { apiFetch, API_BASE } from './client'
import type { TripHistoryItem } from './trips'

/** Motivo mínimo SP-F (10+ chars) para POST operacionais quando a UI não recolhe texto (ex.: DevTools). */
export const DEFAULT_ADMIN_GOVERNANCE_REASON =
  'Operação manual validada no painel ou DevTools (ambiente de desenvolvimento / testes).'

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
  token: string,
  governanceReason: string
): Promise<{ trip_id: string; status: string }> {
  return apiFetch(`/admin/trips/${tripId}/assign`, {
    method: 'POST',
    token,
    body: JSON.stringify({ governance_reason: governanceReason.trim() }),
  })
}

export async function cancelTripAdmin(
  tripId: string,
  token: string,
  reason: string
): Promise<{ trip_id: string; status: string }> {
  return apiFetch(`/admin/cancel-trip/${tripId}`, {
    method: 'POST',
    token,
    body: JSON.stringify({
      confirmation: 'CANCELAR_VIAGEM',
      reason: reason.trim(),
    }),
  })
}

/** SP-A: transição manual (accepted→arriving, arriving→ongoing). Motivo ≥10 chars; confirmação automática. */
export async function adminTripTransition(
  tripId: string,
  token: string,
  payload: { to_status: 'arriving' | 'ongoing'; reason: string }
): Promise<{ trip_id: string; status: string }> {
  const confirmation = payload.to_status === 'arriving' ? 'FORCAR_ARRIVING' : 'FORCAR_ONGOING'
  return apiFetch(`/admin/trips/${tripId}/transition`, {
    method: 'POST',
    token,
    body: JSON.stringify({
      to_status: payload.to_status,
      confirmation,
      reason: payload.reason.trim(),
    }),
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

export async function runTimeouts(
  token: string,
  governanceReason: string = DEFAULT_ADMIN_GOVERNANCE_REASON
): Promise<RunTimeoutsResponse> {
  return apiFetch<RunTimeoutsResponse>('/admin/run-timeouts', {
    method: 'POST',
    token,
    body: JSON.stringify({ governance_reason: governanceReason.trim() }),
  })
}

export async function runOfferExpiry(
  token: string,
  governanceReason: string = DEFAULT_ADMIN_GOVERNANCE_REASON
): Promise<RunOfferExpiryResponse> {
  return apiFetch<RunOfferExpiryResponse>('/admin/run-offer-expiry', {
    method: 'POST',
    token,
    body: JSON.stringify({ governance_reason: governanceReason.trim() }),
  })
}

export async function recoverDriver(
  driverId: string,
  token: string,
  governanceReason: string
): Promise<RecoverDriverResponse> {
  return apiFetch<RecoverDriverResponse>(`/admin/recover-driver/${driverId}`, {
    method: 'POST',
    token,
    body: JSON.stringify({ governance_reason: governanceReason.trim() }),
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

export async function runAdminCron(
  token: string,
  governanceReason: string = DEFAULT_ADMIN_GOVERNANCE_REASON
): Promise<AdminCronRunResponse> {
  return apiFetch<AdminCronRunResponse>('/admin/cron/run', {
    method: 'POST',
    token,
    body: JSON.stringify({ governance_reason: governanceReason.trim() }),
  })
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
  token: string,
  governanceReason: string
): Promise<AdminPartnerCreatedResponse> {
  return apiFetch<AdminPartnerCreatedResponse>('/admin/partners', {
    method: 'POST',
    body: JSON.stringify({
      name: name.trim(),
      governance_reason: governanceReason.trim(),
    }),
    token,
  })
}

export async function createPartnerOrgAdmin(
  partnerId: string,
  body: { name: string; phone: string },
  token: string,
  governanceReason: string
): Promise<AdminPartnerOrgAdminCreatedResponse> {
  const pid = partnerId.trim()
  return apiFetch<AdminPartnerOrgAdminCreatedResponse>(
    `/admin/partners/${encodeURIComponent(pid)}/create-admin`,
    {
      method: 'POST',
      body: JSON.stringify({
        name: body.name.trim(),
        phone: body.phone.trim(),
        governance_reason: governanceReason.trim(),
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
  token: string,
  governanceReason: string
): Promise<AdminAssignPartnerResponse> {
  const did = driverUserId.trim()
  const pid = partnerId.trim()
  return apiFetch<AdminAssignPartnerResponse>(`/admin/drivers/${encodeURIComponent(did)}/assign-partner`, {
    method: 'POST',
    body: JSON.stringify({
      partner_id: pid,
      governance_reason: governanceReason.trim(),
    }),
    token,
  })
}

export async function unassignDriverFromPartner(
  driverUserId: string,
  token: string,
  governanceReason: string
): Promise<AdminAssignPartnerResponse> {
  const did = driverUserId.trim()
  return apiFetch<AdminAssignPartnerResponse>(`/admin/drivers/${encodeURIComponent(did)}/assign-partner`, {
    method: 'DELETE',
    token,
    body: JSON.stringify({ governance_reason: governanceReason.trim() }),
  })
}

/** SP-B / SP-E: eventos `admin.*` persistidos; filtrar por utilizador com entity_type=user. */
export interface AdminAuditTrailItem {
  id: string
  event_type: string
  entity_type: string
  entity_id: string
  occurred_at: string
  payload: Record<string, unknown>
}

export async function getAdminAuditTrail(
  token: string,
  opts?: { limit?: number; offset?: number; entity_type?: string; entity_id?: string }
): Promise<AdminAuditTrailItem[]> {
  const q = new URLSearchParams()
  if (opts?.limit != null) q.set('limit', String(opts.limit))
  if (opts?.offset != null) q.set('offset', String(opts.offset))
  if (opts?.entity_type?.trim()) q.set('entity_type', opts.entity_type.trim())
  if (opts?.entity_id?.trim()) q.set('entity_id', opts.entity_id.trim())
  const qs = q.toString()
  return apiFetch<AdminAuditTrailItem[]>(`/admin/audit-trail${qs ? `?${qs}` : ''}`, { token })
}
