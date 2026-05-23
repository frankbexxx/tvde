/**
 * FIX-001 — Disponibilidade no palco mapa: micro on/off por cima dos tiles (acima da nav z-40).
 * Online via map-touch mantém-se; aqui sobretudo «disponível → offline».
 * Dia 23: estado no pino (+ «offline» pequeno), sem pastilha Estatuto.
 */
type DriverMapAvailabilityMicroToggleProps = {
  offline: boolean
  mapTapGoesOnline: boolean
  onGoOnline: () => void
  onGoOffline: () => void
}

function OfflineLabel() {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wide text-destructive" aria-hidden>
      offline
    </span>
  )
}

export function DriverMapAvailabilityMicroToggle({
  offline,
  mapTapGoesOnline,
  onGoOnline,
  onGoOffline,
}: DriverMapAvailabilityMicroToggleProps) {
  if (offline && mapTapGoesOnline) {
    return (
      <div
        className="pointer-events-none absolute right-3 top-3 z-[30] flex flex-col items-center gap-0.5"
        role="status"
        aria-label="Offline. Toca no mapa para ficares disponível."
        data-testid="driver-map-availability-micro-offline"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-destructive/35 bg-background/90 shadow-md backdrop-blur-sm">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-destructive/45" aria-hidden />
        </div>
        <OfflineLabel />
      </div>
    )
  }

  if (offline) {
    return (
      <div className="pointer-events-auto absolute right-3 top-3 z-[30] flex flex-col items-center gap-0.5">
        <button
          type="button"
          data-testid="driver-map-availability-micro-offline-pill"
          onClick={onGoOnline}
          aria-label="Offline — tocar para ficares disponível"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-destructive/35 bg-background/90 shadow-md backdrop-blur-sm touch-manipulation hover:bg-background"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-destructive/45" aria-hidden />
        </button>
        <OfflineLabel />
      </div>
    )
  }

  return (
    <button
      type="button"
      data-testid="driver-map-availability-micro-online"
      onClick={onGoOffline}
      aria-label="Disponível — tocar para ficar offline"
      className="pointer-events-auto absolute right-3 top-3 z-[30] flex h-11 w-11 items-center justify-center rounded-full border border-emerald-500/40 bg-background/90 shadow-md backdrop-blur-sm touch-manipulation hover:bg-background"
    >
      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-400/55" aria-hidden />
    </button>
  )
}
