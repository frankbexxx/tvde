import type { PartnerDriverRow, PartnerTripRow } from '../../api/partner'
import type { PartnerMenuScreen } from './PartnerSideMenu'

export type PartnerAlertSeverity = 'info' | 'warn' | 'crit'

export type PartnerAlert = {
  id: string
  severity: PartnerAlertSeverity
  title: string
  body: string
  /** Deep route (drivers/trips). Prefer `menuScreen` for in-shell screens. */
  href?: string
  /** Open Partner menu screen (e.g. fleet_vehicles). */
  menuScreen?: PartnerMenuScreen
  /** CTA label; defaults to “Ver detalhe” when omitted. */
  ctaLabel?: string
}

const PIPELINE = new Set(['searching', 'assigned', 'accepted', 'arriving', 'ongoing'])
const STUCK_MINUTES = 5
const OFFLINE_GPS_MINUTES = 15

function parseIsoMs(iso: string | null | undefined): number | null {
  if (!iso) return null
  const ms = Date.parse(iso)
  return Number.isNaN(ms) ? null : ms
}

export function buildPartnerAlerts(
  drivers: PartnerDriverRow[],
  trips: PartnerTripRow[]
): PartnerAlert[] {
  const now = Date.now()
  const stuckMs = STUCK_MINUTES * 60_000
  const offlineMs = OFFLINE_GPS_MINUTES * 60_000
  const alerts: PartnerAlert[] = []
  const driverById = new Map(drivers.map((d) => [d.user_id, d]))

  for (const d of drivers) {
    const locMs = parseIsoMs(d.last_location?.timestamp ?? null)
    const gpsStale = locMs == null || now - locMs > offlineMs
    if (d.status === 'approved' && (!d.is_available || gpsStale)) {
      alerts.push({
        id: `driver-offline-${d.user_id}`,
        severity: gpsStale ? 'warn' : 'info',
        title: `Motorista ${d.user.name ?? d.user_id.slice(0, 8)}`,
        body: gpsStale
          ? 'Sem GPS recente ou indisponível na app.'
          : 'Marcado indisponível na app.',
        href: `/partner/drivers/${encodeURIComponent(d.user_id)}`,
      })
    }

    if (d.documents) {
      for (const [key, doc] of Object.entries(d.documents)) {
        const st = doc?.status
        if (st === 'pending_review' || st === 'pending' || st === 'rejected') {
          alerts.push({
            id: `doc-${d.user_id}-${key}`,
            severity: st === 'rejected' ? 'crit' : 'warn',
            title: `Documento ${key}`,
            body: `${d.user.name ?? 'Motorista'} — estado «${st}».`,
            href: `/partner/drivers/${encodeURIComponent(d.user_id)}`,
          })
        }
        const exp = doc?.expires_at
        if (exp) {
          const expMs = Date.parse(exp)
          if (!Number.isNaN(expMs) && expMs < now) {
            alerts.push({
              id: `doc-exp-${d.user_id}-${key}`,
              severity: 'crit',
              title: `Documento expirado (${key})`,
              body: `${d.user.name ?? 'Motorista'} — validade ultrapassada.`,
              href: `/partner/drivers/${encodeURIComponent(d.user_id)}`,
            })
          }
        }
      }
    }
  }

  for (const t of trips) {
    const updMs = parseIsoMs(t.updated_at)
    const ageMs = updMs != null ? now - updMs : null

    if (PIPELINE.has(t.status) && ageMs != null && ageMs > stuckMs) {
      alerts.push({
        id: `trip-stuck-${t.trip_id}`,
        severity: 'warn',
        title: `Viagem ${t.trip_id.slice(0, 8)}…`,
        body: `Estado «${t.status}» sem alteração há ~${Math.round(ageMs / 60_000)} min.`,
        href: `/partner/trips/${encodeURIComponent(t.trip_id)}`,
      })
    }

    if (t.status === 'assigned' && t.driver_id) {
      const dr = driverById.get(t.driver_id)
      if (dr && !dr.is_available && ageMs != null && ageMs > stuckMs) {
        alerts.push({
          id: `trip-assign-offline-${t.trip_id}`,
          severity: 'crit',
          title: `Viagem atribuída ${t.trip_id.slice(0, 8)}…`,
          body: 'Motorista indisponível — confirme ou reatribua.',
          href: `/partner/trips/${encodeURIComponent(t.trip_id)}`,
        })
      }
    }

    if (PIPELINE.has(t.status) && !t.driver_id) {
      alerts.push({
        id: `trip-no-driver-${t.trip_id}`,
        severity: 'crit',
        title: 'Viagem sem motorista',
        body: `${t.trip_id.slice(0, 8)}… em «${t.status}».`,
        href: `/partner/trips/${encodeURIComponent(t.trip_id)}`,
      })
    }
  }

  const rank = { crit: 0, warn: 1, info: 2 }
  return alerts.sort((a, b) => rank[a.severity] - rank[b.severity])
}

export function partnerAlertSeverityClass(sev: PartnerAlertSeverity): string {
  if (sev === 'crit') return 'border-destructive/40 bg-destructive/5'
  if (sev === 'warn') return 'border-warning/40 bg-warning/10'
  return 'border-border bg-muted/20'
}
