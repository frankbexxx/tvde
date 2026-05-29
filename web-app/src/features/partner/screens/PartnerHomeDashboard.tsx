import type { PartnerMetrics } from '../../../api/partner'

type PartnerHomeDashboardProps = {
  metrics: PartnerMetrics | null
  search: string
  onSearchChange: (value: string) => void
  onRefresh: () => void
}

export function PartnerHomeDashboard({
  metrics,
  search,
  onSearchChange,
  onRefresh,
}: PartnerHomeDashboardProps) {
  return (
    <>
      <label className="block text-sm text-foreground/80" htmlFor="partner-search">
        Pesquisar viagens (ID, motorista ou passageiro)
      </label>
      <input
        id="partner-search"
        type="search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="ID viagem, nome/telefone motorista ou ID passageiro"
        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm"
      />

      {metrics ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Viagens hoje</p>
            <p className="text-xl font-bold text-foreground">{metrics.trips_today}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Total viagens</p>
            <p className="text-xl font-bold text-foreground">{metrics.trips_total}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Concluídas</p>
            <p className="text-xl font-bold text-foreground">{metrics.trips_completed}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Canceladas</p>
            <p className="text-xl font-bold text-foreground">{metrics.trips_cancelled}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Motoristas ativos (GPS)</p>
            <p className="text-xl font-bold text-foreground">{metrics.active_drivers}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Total motoristas</p>
            <p className="text-xl font-bold text-foreground">{metrics.total_drivers}</p>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onRefresh}
        className="w-full rounded-xl bg-secondary py-2 text-sm font-medium text-secondary-foreground"
      >
        Atualizar
      </button>
    </>
  )
}
