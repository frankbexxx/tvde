import { Link } from 'react-router-dom'
import type { PartnerDriverRow } from '../../../api/partner'
import { filterChipClass, locationLabel, type DriverFilter } from '../partnerTypes'

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
        {filteredDrivers.map((d) => (
          <li key={d.user_id} className="rounded-xl border border-border bg-card p-3 text-sm">
            <Link
              to={`/partner/drivers/${encodeURIComponent(d.user_id)}`}
              className="font-medium text-primary hover:underline"
            >
              {d.user.name ?? '—'}
            </Link>
            <p className="text-muted-foreground">
              Estado: {d.status}
              {d.is_available ? ' · disponível' : ' · indisponível'}
            </p>
            <p className="text-muted-foreground text-xs mt-1">{locationLabel(d)}</p>
          </li>
        ))}
      </ul>
      {!loading && filteredDrivers.length === 0 && (
        <p className="text-sm text-muted-foreground">Sem motoristas neste filtro.</p>
      )}
    </div>
  )
}
