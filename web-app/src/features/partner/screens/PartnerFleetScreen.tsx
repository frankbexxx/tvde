import type {
  PartnerDriverDiscoveryItem,
  PartnerDriverRow,
  PartnerMetrics,
  PartnerTripRow,
} from '../../../api/partner'
import { PartnerFleetMap } from '../PartnerFleetMap'
import type { DriverFilter, PartnerHomeView } from '../partnerTypes'
import { PartnerFleetDiscoverSection } from './PartnerFleetDiscoverSection'
import { PartnerFleetDriversSection } from './PartnerFleetDriversSection'

type PartnerFleetScreenProps = {
  metrics: PartnerMetrics | null
  drivers: PartnerDriverRow[]
  trips: PartnerTripRow[]
  filteredDrivers: PartnerDriverRow[]
  driverFilter: DriverFilter
  onDriverFilterChange: (filter: DriverFilter) => void
  fleetView: PartnerHomeView
  onFleetViewChange: (view: PartnerHomeView) => void
  loading: boolean
  onRefresh: () => void
  discoverQuery: string
  onDiscoverQueryChange: (value: string) => void
  discoverLoading: boolean
  discoverRows: PartnerDriverDiscoveryItem[]
  discoverSearched: boolean
  discoverAlreadyInFleet: boolean
  onDiscoverSearch: () => void
  onAddToFleet: (userId: string) => void
}

export function PartnerFleetScreen({
  metrics,
  drivers,
  trips,
  filteredDrivers,
  driverFilter,
  onDriverFilterChange,
  fleetView,
  onFleetViewChange,
  loading,
  onRefresh,
  discoverQuery,
  onDiscoverQueryChange,
  discoverLoading,
  discoverRows,
  discoverSearched,
  discoverAlreadyInFleet,
  onDiscoverSearch,
  onAddToFleet,
}: PartnerFleetScreenProps) {
  return (
    <div className="space-y-4 text-sm text-foreground">
      {metrics ? (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border bg-background px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Motoristas (total)</p>
            <p className="text-lg font-semibold tabular-nums">{metrics.total_drivers}</p>
          </div>
          <div className="rounded-xl border border-border bg-background px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Com GPS recente</p>
            <p className="text-lg font-semibold tabular-nums">{metrics.active_drivers}</p>
          </div>
        </div>
      ) : null}

      <div className="flex gap-2">
        <button
          type="button"
          className={`flex-1 min-h-10 rounded-xl border text-sm font-semibold touch-manipulation ${fleetView === 'list' ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-card text-muted-foreground'}`}
          onClick={() => onFleetViewChange('list')}
        >
          Lista
        </button>
        <button
          type="button"
          data-testid="partner-view-map"
          className={`flex-1 min-h-10 rounded-xl border text-sm font-semibold touch-manipulation ${fleetView === 'map' ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-card text-muted-foreground'}`}
          onClick={() => onFleetViewChange('map')}
        >
          Mapa live
        </button>
      </div>

      {fleetView === 'map' ? <PartnerFleetMap drivers={drivers} trips={trips} /> : null}

      {fleetView === 'list' ? (
        <>
          <PartnerFleetDiscoverSection
            discoverQuery={discoverQuery}
            onDiscoverQueryChange={onDiscoverQueryChange}
            discoverLoading={discoverLoading}
            discoverRows={discoverRows}
            discoverSearched={discoverSearched}
            discoverAlreadyInFleet={discoverAlreadyInFleet}
            onSearch={onDiscoverSearch}
            onAddToFleet={onAddToFleet}
          />
          <PartnerFleetDriversSection
            filteredDrivers={filteredDrivers}
            driverFilter={driverFilter}
            onDriverFilterChange={onDriverFilterChange}
            loading={loading}
          />
        </>
      ) : null}

      <button
        type="button"
        onClick={onRefresh}
        className="w-full min-h-11 rounded-xl border border-border bg-card py-2.5 text-sm font-semibold text-foreground hover:bg-muted/40 touch-manipulation"
      >
        Atualizar dados
      </button>
    </div>
  )
}
