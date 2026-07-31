import { useTranslation } from 'react-i18next'
import type { PartnerDriverRow } from '../../../api/partner'
import type { DriverFilter } from '../partnerTypes'
import { PartnerListSearch } from '../components/PartnerListSearch'
import { PartnerFleetDriversSection } from './PartnerFleetDriversSection'

type PartnerFleetListScreenProps = {
  filteredDrivers: PartnerDriverRow[]
  driverFilter: DriverFilter
  onDriverFilterChange: (filter: DriverFilter) => void
  loading: boolean
  onRefresh: () => void
  search: string
  onSearchChange: (value: string) => void
}

export function PartnerFleetListScreen({
  filteredDrivers,
  driverFilter,
  onDriverFilterChange,
  loading,
  onRefresh,
  search,
  onSearchChange,
}: PartnerFleetListScreenProps) {
  const { t } = useTranslation('partner')

  return (
    <div className="space-y-4 text-sm text-foreground">
      <PartnerListSearch
        value={search}
        onChange={onSearchChange}
        placeholder={t('fleet.listSearchPlaceholder')}
        testId="partner-fleet-list-search"
      />
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
        {t('fleet.refresh')}
      </button>
    </div>
  )
}
