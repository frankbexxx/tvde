import type { PartnerDriverRow } from '../../../api/partner'
import type { DriverFilter } from '../partnerTypes'
import { PartnerFleetDriversSection } from './PartnerFleetDriversSection'

type PartnerFleetListScreenProps = {
  filteredDrivers: PartnerDriverRow[]
  driverFilter: DriverFilter
  onDriverFilterChange: (filter: DriverFilter) => void
  loading: boolean
  onRefresh: () => void
}

export function PartnerFleetListScreen({
  filteredDrivers,
  driverFilter,
  onDriverFilterChange,
  loading,
  onRefresh,
}: PartnerFleetListScreenProps) {
  return (
    <div className="space-y-4 text-sm text-foreground">
      <PartnerFleetDriversSection
        filteredDrivers={filteredDrivers}
        driverFilter={driverFilter}
        onDriverFilterChange={onDriverFilterChange}
        loading={loading}
      />
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
