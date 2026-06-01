import type { PartnerDriverRow, PartnerTripRow } from '../../../api/partner'
import { PartnerFleetMap } from '../PartnerFleetMap'

type PartnerFleetMapScreenProps = {
  drivers: PartnerDriverRow[]
  trips: PartnerTripRow[]
  onRefresh: () => void
}

export function PartnerFleetMapScreen({ drivers, trips, onRefresh }: PartnerFleetMapScreenProps) {
  return (
    <div className="space-y-4 text-sm text-foreground">
      <PartnerFleetMap drivers={drivers} trips={trips} />
      <button
        type="button"
        data-testid="partner-view-map"
        onClick={onRefresh}
        className="w-full min-h-11 rounded-xl border border-border bg-card py-2.5 text-sm font-semibold text-foreground hover:bg-muted/40 touch-manipulation"
      >
        Atualizar mapa
      </button>
    </div>
  )
}
