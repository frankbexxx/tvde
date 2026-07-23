import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { PartnerDriverRow } from '../../../api/partner'
import {
  driverIsOnActiveTrip,
  filterChipClass,
  locationLabel,
  type DriverFilter,
} from '../partnerTypes'

type PartnerFleetDriversSectionProps = {
  filteredDrivers: PartnerDriverRow[]
  driverFilter: DriverFilter
  onDriverFilterChange: (filter: DriverFilter) => void
  loading: boolean
}

export function PartnerFleetDriversSection({
  filteredDrivers,
  driverFilter,
  onDriverFilterChange,
  loading,
}: PartnerFleetDriversSectionProps) {
  const { t } = useTranslation('partner')

  return (
    <div data-testid="partner-fleet-drivers-section">
      <h3 className="text-base font-medium text-foreground mb-2">Motoristas</h3>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {(
          [
            ['all', 'Todos'],
            ['active', 'ativos'],
            ['online', 'online'],
            ['offline', 'offline'],
            ['on_trip', 'Em viagem'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={filterChipClass(driverFilter === id)}
            onClick={() => onDriverFilterChange(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <ul className="space-y-2">
        {filteredDrivers.map((d) => {
          const onTrip = driverIsOnActiveTrip(d)
          const tripId = d.active_trip_id?.trim() || null
          return (
            <li
              key={d.user_id}
              className="rounded-xl border border-border bg-card p-3 text-sm"
              data-testid="partner-fleet-driver-row"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to={`/partner/drivers/${encodeURIComponent(d.user_id)}`}
                  className="font-medium text-primary hover:underline"
                >
                  {d.user.name ?? '—'}
                </Link>
                {onTrip ? (
                  <span
                    className="inline-flex items-center rounded-full bg-info/15 border border-info/40 px-2 py-0.5 text-[11px] font-semibold text-info"
                    data-testid="partner-driver-on-trip-badge"
                    title={
                      d.active_trip_status
                        ? `Viagem activa (${d.active_trip_status})`
                        : 'Viagem activa'
                    }
                  >
                    Em viagem
                  </span>
                ) : null}
                {onTrip && tripId ? (
                  <Link
                    to={`/partner/trips/${encodeURIComponent(tripId)}`}
                    className="inline-flex items-center rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/15"
                    data-testid="partner-driver-view-trip"
                  >
                    {t('fleet.viewTrip')}
                  </Link>
                ) : null}
              </div>
              <p className="text-muted-foreground">
                Estado: {d.status}
                {d.is_available ? ' · disponível' : ' · indisponível'}
                {onTrip && d.active_trip_status ? ` · ${d.active_trip_status}` : null}
              </p>
              {d.vehicle_plate ? (
                <p
                  className="text-muted-foreground text-xs mt-1"
                  data-testid="partner-driver-vehicle-plate"
                >
                  Viatura: {d.vehicle_plate}
                  {d.vehicle_make || d.vehicle_model
                    ? ` · ${[d.vehicle_make, d.vehicle_model].filter(Boolean).join(' ')}`
                    : ''}
                </p>
              ) : null}
              <p className="text-muted-foreground text-xs mt-1">{locationLabel(d)}</p>
            </li>
          )
        })}
      </ul>
      {!loading && filteredDrivers.length === 0 && (
        <p className="text-sm text-muted-foreground">Sem motoristas neste filtro.</p>
      )}
    </div>
  )
}
