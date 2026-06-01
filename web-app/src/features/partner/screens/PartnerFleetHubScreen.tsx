import type { PartnerMetrics } from '../../../api/partner'

type PartnerFleetHubScreenProps = {
  metrics: PartnerMetrics | null
  onNavigate: (screen: 'fleet_list' | 'fleet_map' | 'fleet_add') => void
}

export function PartnerFleetHubScreen({ metrics, onNavigate }: PartnerFleetHubScreenProps) {
  return (
    <div className="space-y-4 text-sm text-foreground" data-testid="partner-fleet-hub">
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
      <div className="space-y-2">
        <button
          type="button"
          data-testid="partner-fleet-hub-list"
          onClick={() => onNavigate('fleet_list')}
          className="w-full min-h-[48px] rounded-xl border border-border bg-card px-4 text-left text-sm font-semibold text-foreground hover:bg-muted/40 touch-manipulation"
        >
          Lista motoristas
        </button>
        <button
          type="button"
          data-testid="partner-fleet-hub-map"
          onClick={() => onNavigate('fleet_map')}
          className="w-full min-h-[48px] rounded-xl border border-border bg-card px-4 text-left text-sm font-semibold text-foreground hover:bg-muted/40 touch-manipulation"
        >
          Mapa live
        </button>
        <button
          type="button"
          data-testid="partner-fleet-hub-add"
          onClick={() => onNavigate('fleet_add')}
          className="w-full min-h-[48px] rounded-xl border border-border bg-card px-4 text-left text-sm font-semibold text-foreground hover:bg-muted/40 touch-manipulation"
        >
          Adicionar à frota
        </button>
      </div>
    </div>
  )
}
