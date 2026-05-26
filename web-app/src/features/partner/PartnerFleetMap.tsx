import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapView } from '../../maps/MapView'
import type { PartnerDriverRow, PartnerTripRow } from '../../api/partner'

const ACTIVE_TRIP_STATUSES = new Set([
  'searching',
  'assigned',
  'accepted',
  'arriving',
  'ongoing',
])

function locationAgeMs(loc: PartnerDriverRow['last_location']): number | null {
  if (!loc?.timestamp) return null
  const ms = Date.parse(loc.timestamp)
  if (Number.isNaN(ms)) return null
  return Date.now() - ms
}

function driverOnActiveTrip(driverId: string, trips: PartnerTripRow[]): boolean {
  return trips.some(
    (t) => t.driver_id === driverId && ACTIVE_TRIP_STATUSES.has(t.status)
  )
}

function driverMarkerTone(
  d: PartnerDriverRow,
  trips: PartnerTripRow[]
): 'free' | 'on_trip' | 'offline' {
  const age = locationAgeMs(d.last_location)
  const stale = age == null || age > 15 * 60_000
  if (stale || !d.is_available) return 'offline'
  if (driverOnActiveTrip(d.user_id, trips)) return 'on_trip'
  return 'free'
}

export function PartnerFleetMap({
  drivers,
  trips,
}: {
  drivers: PartnerDriverRow[]
  trips: PartnerTripRow[]
}) {
  const navigate = useNavigate()

  const activeTrips = useMemo(
    () => trips.filter((t) => ACTIVE_TRIP_STATUSES.has(t.status)),
    [trips]
  )

  const tripPickups = useMemo(
    () =>
      activeTrips.map((t, i) => ({
        lat: t.origin_lat,
        lng: t.origin_lng,
        label: String(i + 1),
        tripId: t.trip_id,
      })),
    [activeTrips]
  )

  const fleetDrivers = useMemo(
    () =>
      drivers
        .filter((d) => d.last_location)
        .map((d) => {
          const loc = d.last_location!
          const tone = driverMarkerTone(d, trips)
          return {
            userId: d.user_id,
            lat: loc.lat,
            lng: loc.lng,
            label: (d.user.name ?? d.user_id.slice(0, 6)).split(' ')[0] ?? '—',
            tone,
          }
        }),
    [drivers, trips]
  )

  const showMap = fleetDrivers.length > 0 || tripPickups.length > 0

  return (
    <div className="space-y-3" data-testid="partner-fleet-map">
      <MapView
        showMap={showMap}
        mapPlaceholder="Sem posições GPS recentes nem viagens activas para mostrar no mapa."
        fleetDrivers={fleetDrivers.length ? fleetDrivers : null}
        onFleetDriverClick={(userId) => {
          void navigate(`/partner/drivers/${encodeURIComponent(userId)}`)
        }}
        pendingOfferPickups={tripPickups.length ? tripPickups : null}
        onPendingOfferPickupClick={(tripId) => {
          void navigate(`/partner/trips/${encodeURIComponent(tripId)}`)
        }}
        compactHeight={false}
        tallStage
        className="border border-border"
      />
      <div className="rounded-xl border border-border bg-card p-3 text-xs space-y-2">
        <p className="font-medium text-foreground text-sm">Legenda</p>
        <ul className="space-y-1 text-muted-foreground">
          <li>
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 mr-1.5" />
            Disponível (online, sem viagem activa)
          </li>
          <li>
            <span className="inline-block h-2 w-2 rounded-full bg-sky-500 mr-1.5" />
            Em viagem
          </li>
          <li>
            <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground mr-1.5" />
            Offline / GPS antigo (&gt;15 min)
          </li>
          <li>
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500 mr-1.5" />
            Recolha viagem activa (número = link detalhe)
          </li>
        </ul>
      </div>
      <ul className="space-y-2 max-h-48 overflow-y-auto">
        {drivers.map((d) => {
          const tone = driverMarkerTone(d, trips)
          const dot =
            tone === 'offline'
              ? 'bg-muted-foreground'
              : tone === 'on_trip'
                ? 'bg-sky-500'
                : 'bg-emerald-500'
          return (
            <li key={d.user_id} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 min-w-0">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
                <span className="truncate text-foreground">{d.user.name ?? d.user_id.slice(0, 8)}</span>
              </span>
              <button
                type="button"
                onClick={() => void navigate(`/partner/drivers/${encodeURIComponent(d.user_id)}`)}
                className="shrink-0 text-primary text-xs underline touch-manipulation"
              >
                Detalhe
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
