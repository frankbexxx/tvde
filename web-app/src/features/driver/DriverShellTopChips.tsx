import { Gem, Search } from 'lucide-react'
import { toast as sonnerToast } from 'sonner'

type DriverShellTopChipsProps = {
  offline: boolean
  activeTripId: string | null
}

/**
 * §9.5 — Estatuto (operacional), placeholder tier, Lupa (modo destino v2).
 * Só com `VITE_DRIVER_BOTTOM_NAV`; não duplica o cabeçalho global da app.
 */
export function DriverShellTopChips({ offline, activeTripId }: DriverShellTopChipsProps) {
  const statutLabel =
    activeTripId != null ? 'Em viagem' : offline ? 'Offline' : 'Disponível'
  const statutClass =
    activeTripId != null
      ? 'border-secondary bg-secondary/15 text-secondary-foreground'
      : offline
        ? 'border-border bg-muted text-foreground/85'
        : 'border-emerald-500/45 bg-emerald-500/10 text-foreground'

  const handleLupa = () => {
    sonnerToast.message('Modo destino', {
      description: 'Filtro por direcção / destino — em breve (wireframe §9.5).',
      duration: 4000,
    })
  }

  return (
    <div
      className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
      data-testid="driver-shell-top-chips"
    >
      <span
        className={`inline-flex max-w-[min(100%,14rem)] shrink items-center truncate rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-tight ${statutClass}`}
        title="Estado operacional"
      >
        Estatuto · {statutLabel}
      </span>
      <span
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-border/80 bg-muted/30 px-2 py-1 text-[10px] font-medium text-muted-foreground"
        title="Programa / tier — referência competitiva (v2)"
      >
        <Gem className="h-3.5 w-3.5 shrink-0 opacity-70" strokeWidth={2} aria-hidden />
        Breve
      </span>
      <button
        type="button"
        onClick={handleLupa}
        data-testid="driver-shell-lupa"
        className="inline-flex min-h-[40px] min-w-[40px] shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm hover:bg-muted/50 touch-manipulation"
        aria-label="Modo destino (em breve)"
        title="Modo destino — em breve"
      >
        <Search className="h-4 w-4" strokeWidth={2} aria-hidden />
      </button>
    </div>
  )
}
