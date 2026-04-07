import { API_BASE, apiFetch } from './client'

export interface PartnerDriverRow {
  user_id: string
  partner_id: string
  status: string
  is_available: boolean
  user: { name: string | null; phone: string | null }
  last_location: { lat: number; lng: number; timestamp: string } | null
}

export interface PartnerTripRow {
  trip_id: string
  status: string
  passenger_id: string
  driver_id: string | null
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

export function partnerTripsExportUrl(): string {
  const base = API_BASE.replace(/\/$/, '')
  return `${base}/partner/trips/export`
}
