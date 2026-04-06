import { API_BASE, apiFetch } from './client'

export interface PartnerDriverRow {
  user_id: string
  partner_id: string
  status: string
  is_available: boolean
  user: { name: string | null; phone: string | null }
  last_location: { lat: number; lng: number; timestamp: string } | null
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

export async function fetchPartnerMetrics(): Promise<PartnerMetrics> {
  return apiFetch<PartnerMetrics>('/partner/metrics')
}

export function partnerTripsExportUrl(): string {
  const base = API_BASE.replace(/\/$/, '')
  return `${base}/partner/trips/export`
}
