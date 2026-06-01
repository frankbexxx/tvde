import { Link } from 'react-router-dom'
import { PARTNER_TRIPS_CSV_COLUMNS, type PartnerDriverRow, type PartnerTripRow } from '../../../api/partner'
import { PartnerListSearch } from '../components/PartnerListSearch'
import { filterChipClass, TRIP_FILTER_HINT, type TripFilter } from '../partnerTypes'

type PartnerTripsSectionProps = {
  filteredTrips: PartnerTripRow[]
  drivers: PartnerDriverRow[]
  tripFilter: TripFilter
  onTripFilterChange: (filter: TripFilter) => void
  tripDriverFilter: string
  onTripDriverFilterChange: (value: string) => void
  tripDateFrom: string
  onTripDateFromChange: (value: string) => void
  tripDateTo: string
  onTripDateToChange: (value: string) => void
  loading: boolean
  onDownloadCsv: () => void
  search: string
  onSearchChange: (value: string) => void
}

export function PartnerTripsSection({
  filteredTrips,
  drivers,
  tripFilter,
  onTripFilterChange,
  tripDriverFilter,
  onTripDriverFilterChange,
  tripDateFrom,
  onTripDateFromChange,
  tripDateTo,
  onTripDateToChange,
  loading,
  onDownloadCsv,
  search,
  onSearchChange,
}: PartnerTripsSectionProps) {
  return (
    <div className="space-y-3">
      <PartnerListSearch
        value={search}
        onChange={onSearchChange}
        placeholder="ID viagem, motorista ou passageiro"
        testId="partner-trips-list-search"
      />
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-medium text-foreground">Viagens</h3>
        <button
          type="button"
          onClick={onDownloadCsv}
          className="shrink-0 text-xs font-medium text-primary underline-offset-2 hover:underline"
        >
          Exportar CSV
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Colunas do CSV (UTF-8): {PARTNER_TRIPS_CSV_COLUMNS.join(', ')}.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ['all', 'Todas'],
            ['ongoing', 'Em curso'],
            ['completed', 'Concluídas'],
            ['cancelled', 'Canceladas'],
            ['failed', 'Falhadas'],
            ['assigned', 'Por aceitar'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            title={TRIP_FILTER_HINT[id]}
            className={filterChipClass(tripFilter === id)}
            onClick={() => onTripFilterChange(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <label className="text-xs text-muted-foreground">
          Motorista
          <select
            value={tripDriverFilter}
            onChange={(e) => onTripDriverFilterChange(e.target.value)}
            className="mt-1 w-full px-2 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
          >
            <option value="">Todos</option>
            {drivers.map((d) => (
              <option key={d.user_id} value={d.user_id}>
                {d.user.name ?? d.user_id.slice(0, 8)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          Desde
          <input
            type="date"
            value={tripDateFrom}
            onChange={(e) => onTripDateFromChange(e.target.value)}
            className="mt-1 w-full px-2 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Até
          <input
            type="date"
            value={tripDateTo}
            onChange={(e) => onTripDateToChange(e.target.value)}
            className="mt-1 w-full px-2 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
          />
        </label>
      </div>
      <ul className="space-y-2">
        {filteredTrips.map((t) => (
          <li key={t.trip_id} className="rounded-xl border border-border bg-card p-3 text-sm">
            <Link
              to={`/partner/trips/${encodeURIComponent(t.trip_id)}`}
              className="font-medium text-primary hover:underline"
            >
              {t.trip_id.slice(0, 8)}… · {t.status}
            </Link>
            <p className="text-muted-foreground text-xs mt-1">
              Criada: {t.created_at}
              {t.updated_at ? ` · Atualizada: ${t.updated_at}` : null}
            </p>
          </li>
        ))}
      </ul>
      {!loading && filteredTrips.length === 0 && (
        <p className="text-sm text-muted-foreground">Sem viagens neste filtro.</p>
      )}
    </div>
  )
}
