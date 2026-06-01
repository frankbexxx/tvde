import type { PartnerDriverDiscoveryItem } from '../../../api/partner'
import { PartnerFleetDiscoverSection } from './PartnerFleetDiscoverSection'

type PartnerFleetAddScreenProps = {
  discoverQuery: string
  onDiscoverQueryChange: (value: string) => void
  discoverLoading: boolean
  discoverRows: PartnerDriverDiscoveryItem[]
  discoverSearched: boolean
  discoverAlreadyInFleet: boolean
  onDiscoverSearch: () => void
  onAddToFleet: (userId: string) => void
}

export function PartnerFleetAddScreen({
  onDiscoverSearch,
  ...rest
}: PartnerFleetAddScreenProps) {
  return (
    <div className="space-y-4 text-sm text-foreground" data-testid="partner-fleet-add-screen">
      <PartnerFleetDiscoverSection {...rest} onSearch={onDiscoverSearch} />
    </div>
  )
}
