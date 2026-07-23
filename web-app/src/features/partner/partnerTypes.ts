import type { PartnerDriverRow, PartnerTripRow } from '../../api/partner'

export type DriverFilter = 'all' | 'active' | 'online' | 'offline' | 'on_trip'

export function driverIsOnActiveTrip(d: PartnerDriverRow): boolean {
  return Boolean(d.active_trip_id && d.active_trip_status)
}
export type TripFilter = 'all' | 'ongoing' | 'completed' | 'cancelled' | 'failed' | 'assigned'

export const TRIP_FILTER_HINT: Partial<Record<TripFilter, string>> = {
  assigned:
    'Viagens com motorista já atribuído; o motorista ainda não aceitou a viagem.',
}

export const ONGOING_TRIP_STATUSES = new Set(['assigned', 'accepted', 'arriving', 'ongoing'])

/** Active trips newest-first by updated_at (OPS-UX-1C Home card). */
export function listActivePartnerTrips(trips: PartnerTripRow[]): PartnerTripRow[] {
  return trips
    .filter((t) => ONGOING_TRIP_STATUSES.has(t.status))
    .slice()
    .sort((a, b) => (parseIsoMs(b.updated_at) ?? 0) - (parseIsoMs(a.updated_at) ?? 0))
}

export function primaryActivePartnerTrip(trips: PartnerTripRow[]): PartnerTripRow | null {
  return listActivePartnerTrips(trips)[0] ?? null
}

export function locationLabel(d: PartnerDriverRow): string {
  const loc = d.last_location
  if (!loc) return 'Sem localização recente'
  return `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`
}

export function parseIsoMs(s: string | null | undefined): number | null {
  if (!s) return null
  const t = Date.parse(s)
  return Number.isFinite(t) ? t : null
}

export function matchesDriverFilter(d: PartnerDriverRow, f: DriverFilter): boolean {
  if (f === 'all') return true
  const approved = d.status === 'approved'
  if (f === 'active') return approved
  if (f === 'online') return approved && d.is_available
  if (f === 'offline') return approved && !d.is_available
  if (f === 'on_trip') return approved && driverIsOnActiveTrip(d)
  return true
}

export function matchesTripFilter(t: PartnerTripRow, f: TripFilter): boolean {
  if (f === 'all') return true
  if (f === 'ongoing') return ONGOING_TRIP_STATUSES.has(t.status)
  if (f === 'completed') return t.status === 'completed'
  if (f === 'cancelled') return t.status === 'cancelled'
  if (f === 'failed') return t.status === 'failed'
  if (f === 'assigned') return t.status === 'assigned'
  return true
}

export function filterChipClass(active: boolean): string {
  return `px-2 py-1 rounded-lg text-xs font-medium border transition-colors ${active
    ? 'bg-primary text-primary-foreground border-primary'
    : 'bg-card border-border text-foreground/80 hover:bg-muted/40'
    }`
}
