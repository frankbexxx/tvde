type PartnerTripsHubScreenProps = {
  onNavigate: (screen: 'trips_summary' | 'trips_list' | 'trips_export') => void
}

export function PartnerTripsHubScreen({ onNavigate }: PartnerTripsHubScreenProps) {
  return (
    <div className="space-y-2 text-sm text-foreground" data-testid="partner-trips-hub">
      <button
        type="button"
        data-testid="partner-trips-hub-summary"
        onClick={() => onNavigate('trips_summary')}
        className="w-full min-h-[48px] rounded-xl border border-border bg-card px-4 text-left text-sm font-semibold text-foreground hover:bg-muted/40 touch-manipulation"
      >
        Resumo
      </button>
      <button
        type="button"
        data-testid="partner-trips-hub-list"
        onClick={() => onNavigate('trips_list')}
        className="w-full min-h-[48px] rounded-xl border border-border bg-card px-4 text-left text-sm font-semibold text-foreground hover:bg-muted/40 touch-manipulation"
      >
        Lista (filtros)
      </button>
      <button
        type="button"
        data-testid="partner-trips-hub-export"
        onClick={() => onNavigate('trips_export')}
        className="w-full min-h-[48px] rounded-xl border border-border bg-card px-4 text-left text-sm font-semibold text-foreground hover:bg-muted/40 touch-manipulation"
      >
        Exportar CSV
      </button>
    </div>
  )
}
