type DriverShellTopChipsProps = {
  offline: boolean
  activeTripId: string | null
  /** Quando a viagem já terminou mas o motorista ainda não carregou em Continuar. */
  tripCompleted?: boolean
}

/**
 * §9.5 — Uma linha: estatuto operacional (dia 22 — sem Breve/lupa no mapa).
 */
export function DriverShellTopChips({
  offline,
  activeTripId,
  tripCompleted = false,
}: DriverShellTopChipsProps) {
  const statutLabel = tripCompleted
    ? 'Viagem concluída'
    : activeTripId != null
      ? 'Em viagem'
      : offline
        ? 'Offline'
        : 'Disponível'
  const statutClass =
    activeTripId != null
      ? 'border-secondary bg-secondary/15 text-secondary-foreground'
      : offline
        ? 'border-border bg-muted text-foreground/85'
        : 'border-emerald-500/45 bg-emerald-500/10 text-foreground'

  return (
    <div
      className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden"
      data-testid="driver-shell-top-chips"
    >
      <span
        className={`inline-flex max-w-full shrink items-center truncate rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-tight ${statutClass}`}
        title="Estado operacional"
      >
        Estatuto · {statutLabel}
      </span>
    </div>
  )
}
