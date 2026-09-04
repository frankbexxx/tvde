/** M2-L4 Emergency / SOS — API + share helpers (no internal IDs in share text). */

import { apiFetch } from '../../api/client'

export const PASSENGER_EMERGENCY_STATUSES = [
  'assigned',
  'accepted',
  'arriving',
  'ongoing',
] as const

export const DRIVER_EMERGENCY_STATUSES = ['accepted', 'arriving', 'ongoing'] as const

export type PassengerEmergencyStatus = (typeof PASSENGER_EMERGENCY_STATUSES)[number]
export type DriverEmergencyStatus = (typeof DRIVER_EMERGENCY_STATUSES)[number]

export function isPassengerEmergencyStatus(s: string | undefined): s is PassengerEmergencyStatus {
  return !!s && (PASSENGER_EMERGENCY_STATUSES as readonly string[]).includes(s)
}

export function isDriverEmergencyStatus(s: string | undefined): s is DriverEmergencyStatus {
  return !!s && (DRIVER_EMERGENCY_STATUSES as readonly string[]).includes(s)
}

export interface EmergencyLocationSnapshot {
  lat: number
  lng: number
  updated_at: string
  map_link: string
}

export interface EmergencySnapshot {
  trip_ref: string
  status: string
  origin_lat: number
  origin_lng: number
  destination_lat: number
  destination_lng: number
  vehicle_plate: string | null
  driver_display_name: string | null
  location: EmergencyLocationSnapshot | null
  role_view: string
}

export type EmergencyEventAction = 'opened' | 'call_initiated' | 'shared'

export async function getEmergencySnapshot(
  tripId: string,
  token: string
): Promise<EmergencySnapshot> {
  return apiFetch<EmergencySnapshot>(`/emergency/trips/${tripId}/snapshot`, { token })
}

/** Best-effort audit — never throws to caller for UX-critical paths. */
export async function recordEmergencyEvent(
  tripId: string,
  token: string,
  action: EmergencyEventAction
): Promise<void> {
  try {
    await apiFetch(`/emergency/trips/${tripId}/events`, {
      method: 'POST',
      token,
      body: JSON.stringify({ action }),
    })
  } catch {
    /* user safety first — call/share must proceed */
  }
}

export function formatCoordPair(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

export function buildEmergencyShareText(snap: EmergencySnapshot): string {
  const lines = [
    'Vamulá — Emergência',
    `Viagem: ${snap.trip_ref}`,
    `Estado: ${snap.status}`,
  ]
  if (snap.vehicle_plate) {
    lines.push(`Veículo: ${snap.vehicle_plate}`)
  }
  if (snap.role_view === 'passenger' && snap.driver_display_name) {
    lines.push(`Motorista: ${snap.driver_display_name}`)
  }
  lines.push(`Origem: ${formatCoordPair(snap.origin_lat, snap.origin_lng)}`)
  lines.push(`Destino: ${formatCoordPair(snap.destination_lat, snap.destination_lng)}`)
  if (snap.location) {
    lines.push(`Localização actual: ${snap.location.map_link}`)
  } else {
    lines.push('Localização actual: indisponível')
  }
  return lines.join('\n')
}

export async function shareEmergencyText(text: string): Promise<'shared' | 'copied' | 'failed'> {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined
  if (nav && typeof nav.share === 'function') {
    try {
      await nav.share({ title: 'Vamulá — Emergência', text })
      return 'shared'
    } catch (err) {
      // User abort → treat as cancelled without clipboard spam
      if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'AbortError') {
        return 'failed'
      }
    }
  }
  try {
    if (nav?.clipboard?.writeText) {
      await nav.clipboard.writeText(text)
      return 'copied'
    }
  } catch {
    /* fall through */
  }
  return 'failed'
}

export const EMERGENCY_TEL_HREF = 'tel:112'

export function openEmergencyCall112(): void {
  if (typeof window === 'undefined') return
  window.location.href = EMERGENCY_TEL_HREF
}
