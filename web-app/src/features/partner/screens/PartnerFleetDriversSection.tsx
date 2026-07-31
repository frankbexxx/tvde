import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { PartnerDriverRow } from '../../../api/partner'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { partnerDriverStatusLabel, partnerTripStatusLabel } from '../partnerLabels'
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

const DRIVER_FILTERS: DriverFilter[] = ['all', 'active', 'online', 'offline', 'on_trip']

export function PartnerFleetDriversSection({
  filteredDrivers,
  driverFilter,
  onDriverFilterChange,
  loading,
}: PartnerFleetDriversSectionProps) {
  const { t } = useTranslation('partner')

  return (
    <div data-testid="partner-fleet-drivers-section">
      <h3 className="text-base font-medium text-foreground mb-2">{t('fleet.driversTitle')}</h3>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {DRIVER_FILTERS.map((id) => (
          <button
            key={id}
            type="button"
            className={filterChipClass(driverFilter === id)}
            onClick={() => onDriverFilterChange(id)}
          >
            {t(`fleet.filters.${id}`)}
          </button>
        ))}
      </div>
      <ul className="space-y-2">
        {filteredDrivers.map((d) => {
          const onTrip = driverIsOnActiveTrip(d)
          const tripId = d.active_trip_id?.trim() || null
          const tripStatusLabel = d.active_trip_status
            ? partnerTripStatusLabel(d.active_trip_status)
            : null
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
                      tripStatusLabel
                        ? t('fleet.onTripTitleWithStatus', { status: tripStatusLabel })
                        : t('fleet.onTripTitle')
                    }
                  >
                    {t('fleet.onTripBadge')}
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
                {t('fleet.statusPrefix')} {partnerDriverStatusLabel(d.status)}
                {d.is_available ? t('fleet.availableSuffix') : t('fleet.unavailableSuffix')}
                {onTrip && tripStatusLabel ? ` · ${tripStatusLabel}` : null}
              </p>
              {d.vehicle_plate ? (
                <p
                  className="text-muted-foreground text-xs mt-1"
                  data-testid="partner-driver-vehicle-plate"
                >
                  {t('fleet.vehiclePrefix')} {d.vehicle_plate}
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
        <EmptyState
          title={t('fleet.emptyFilter')}
          description={t('fleet.emptyFilterHint')}
          testId="partner-fleet-drivers-empty"
        />
      )}
    </div>
  )
}
