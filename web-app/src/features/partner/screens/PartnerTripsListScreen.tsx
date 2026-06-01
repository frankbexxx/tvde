import type { PartnerDriverRow, PartnerTripRow } from '../../../api/partner'
import type { TripFilter } from '../partnerTypes'
import { PartnerTripsSection } from './PartnerTripsSection'

type PartnerTripsListScreenProps = {
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
}

export function PartnerTripsListScreen(props: PartnerTripsListScreenProps) {
  return (
    <div className="space-y-4 text-sm text-foreground" data-testid="partner-trips-list-screen">
      <PartnerTripsSection {...props} />
    </div>
  )
}
