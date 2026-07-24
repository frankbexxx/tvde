import { API_BASE, apiFetch, type ApiError } from './client'
import { getStoredAccessToken } from '../utils/authStorage'

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
  /** PARTNER-FLEET-2A/2C: viatura activa (0/1). */
  active_vehicle_id?: string | null
  vehicle_plate?: string | null
  vehicle_make?: string | null
  vehicle_model?: string | null
  vehicle_service_categories?: string[] | null
}

/** PARTNER-FLEET-2A/2C — viatura da frota. */
export interface PartnerVehicleDocumentSummary {
  total_required: number
  present_count: number
  missing_count: number
  expired_count: number
  expiring_soon_count: number
  pending_review_count: number
  rejected_count: number
  valid_count: number
  worst_status: string
}

export interface PartnerVehicleRow {
  id: string
  partner_id: string
  plate: string
  plate_normalized: string
  make: string
  model: string
  year: number | null
  color: string | null
  service_categories: string[]
  status: string
  created_at: string
  updated_at: string
  assigned_driver_id: string | null
  assigned_driver_name: string | null
  /** PF3C-2A/2B — aggregate P0 document alerts. */
  document_summary: PartnerVehicleDocumentSummary
}

export type PartnerVehicleCreateBody = {
  plate: string
  make: string
  model: string
  year?: number | null
  color?: string | null
  service_categories: string[]
  status?: string | null
}

export type PartnerVehiclePatchBody = {
  plate?: string
  make?: string
  model?: string
  year?: number | null
  color?: string | null
  service_categories?: string[]
  status?: string
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

export async function fetchPartnerVehicles(): Promise<PartnerVehicleRow[]> {
  return apiFetch<PartnerVehicleRow[]>('/partner/vehicles')
}

export async function fetchPartnerVehicle(vehicleId: string): Promise<PartnerVehicleRow> {
  return apiFetch<PartnerVehicleRow>(`/partner/vehicles/${encodeURIComponent(vehicleId)}`)
}

export async function createPartnerVehicle(
  body: PartnerVehicleCreateBody
): Promise<PartnerVehicleRow> {
  return apiFetch<PartnerVehicleRow>('/partner/vehicles', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function patchPartnerVehicle(
  vehicleId: string,
  body: PartnerVehiclePatchBody
): Promise<PartnerVehicleRow> {
  return apiFetch<PartnerVehicleRow>(`/partner/vehicles/${encodeURIComponent(vehicleId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function assignPartnerVehicle(
  vehicleId: string,
  driverUserId: string
): Promise<PartnerVehicleRow> {
  return apiFetch<PartnerVehicleRow>(
    `/partner/vehicles/${encodeURIComponent(vehicleId)}/assign`,
    {
      method: 'POST',
      body: JSON.stringify({ driver_user_id: driverUserId }),
    }
  )
}

export async function unassignPartnerVehicle(vehicleId: string): Promise<PartnerVehicleRow> {
  return apiFetch<PartnerVehicleRow>(
    `/partner/vehicles/${encodeURIComponent(vehicleId)}/unassign`,
    { method: 'POST' }
  )
}

/** PARTNER-FLEET-3A/3B — tipos P0 de documentos da viatura. */
export const PARTNER_VEHICLE_DOCUMENT_TYPES = [
  'vehicle_registration',
  'vehicle_insurance',
  'periodic_inspection',
  'tvde_sticker',
] as const

export type PartnerVehicleDocumentType = (typeof PARTNER_VEHICLE_DOCUMENT_TYPES)[number]

export type PartnerVehicleDocumentStoredStatus =
  | 'pending_review'
  | 'approved'
  | 'rejected'

export type PartnerVehicleDocumentComputedStatus =
  | 'pending_review'
  | 'valid'
  | 'expiring_soon'
  | 'expired'
  | 'rejected'

export interface PartnerVehicleDocumentRow {
  id: string
  vehicle_id: string
  partner_id: string
  document_type: string
  status: string
  computed_status: PartnerVehicleDocumentComputedStatus | string
  file_path: string | null
  file_name: string | null
  has_file: boolean
  document_number: string | null
  issuer: string | null
  valid_from: string | null
  expires_at: string | null
  issued_at: string | null
  metadata: Record<string, unknown> | null
  notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export type PartnerVehicleDocumentCreateBody = {
  document_type: PartnerVehicleDocumentType | string
  status?: PartnerVehicleDocumentStoredStatus | string | null
  document_number?: string | null
  issuer?: string | null
  valid_from?: string | null
  expires_at?: string | null
  issued_at?: string | null
  notes?: string | null
  metadata?: Record<string, unknown> | null
}

export type PartnerVehicleDocumentPatchBody = {
  status?: PartnerVehicleDocumentStoredStatus | string | null
  document_number?: string | null
  issuer?: string | null
  valid_from?: string | null
  expires_at?: string | null
  issued_at?: string | null
  notes?: string | null
  metadata?: Record<string, unknown> | null
}

export async function fetchPartnerVehicleDocuments(
  vehicleId: string
): Promise<PartnerVehicleDocumentRow[]> {
  return apiFetch<PartnerVehicleDocumentRow[]>(
    `/partner/vehicles/${encodeURIComponent(vehicleId)}/documents`
  )
}

export async function createPartnerVehicleDocument(
  vehicleId: string,
  body: PartnerVehicleDocumentCreateBody
): Promise<PartnerVehicleDocumentRow> {
  return apiFetch<PartnerVehicleDocumentRow>(
    `/partner/vehicles/${encodeURIComponent(vehicleId)}/documents`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    }
  )
}

export async function patchPartnerVehicleDocument(
  vehicleId: string,
  documentId: string,
  body: PartnerVehicleDocumentPatchBody
): Promise<PartnerVehicleDocumentRow> {
  return apiFetch<PartnerVehicleDocumentRow>(
    `/partner/vehicles/${encodeURIComponent(vehicleId)}/documents/${encodeURIComponent(documentId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    }
  )
}

export async function deletePartnerVehicleDocument(
  vehicleId: string,
  documentId: string
): Promise<void> {
  await apiFetch<void>(
    `/partner/vehicles/${encodeURIComponent(vehicleId)}/documents/${encodeURIComponent(documentId)}`,
    { method: 'DELETE' }
  )
}

export function partnerVehicleDocumentFileUrl(vehicleId: string, documentId: string): string {
  return `${API_BASE.replace(/\/$/, '')}/partner/vehicles/${encodeURIComponent(vehicleId)}/documents/${encodeURIComponent(documentId)}/file`
}

export async function uploadPartnerVehicleDocument(
  vehicleId: string,
  documentId: string,
  file: File
): Promise<PartnerVehicleDocumentRow> {
  const authToken = getStoredAccessToken()
  const form = new FormData()
  form.append('file', file)
  const headers: HeadersInit = {}
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`
  }
  const res = await fetch(
    `${API_BASE.replace(/\/$/, '')}/partner/vehicles/${encodeURIComponent(vehicleId)}/documents/${encodeURIComponent(documentId)}/upload`,
    {
      method: 'POST',
      headers,
      body: form,
    }
  )
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { detail?: string }
    throw { status: res.status, detail: data.detail ?? res.statusText } as ApiError
  }
  return (await res.json()) as PartnerVehicleDocumentRow
}

export async function downloadPartnerVehicleDocumentFile(
  vehicleId: string,
  documentId: string
): Promise<Blob> {
  const authToken = getStoredAccessToken()
  const headers: HeadersInit = {}
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`
  }
  const res = await fetch(partnerVehicleDocumentFileUrl(vehicleId, documentId), { headers })
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { detail?: string }
    throw { status: res.status, detail: data.detail ?? res.statusText } as ApiError
  }
  return res.blob()
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
