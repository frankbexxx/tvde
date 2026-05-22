/**
 * FIX-001 — Disponibilidade no palco mapa: micro on/off por cima dos tiles (acima da nav z-40).
 * Online via map-touch mantém-se; aqui sobretudo «disponível → offline».
 */
type DriverMapAvailabilityMicroToggleProps = {
  offline: boolean
  mapTapGoesOnline: boolean
  onGoOnline: () => void
  onGoOffline: () => void
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
        className="pointer-events-none absolute right-3 top-3 z-[30] flex h-11 w-11 items-center justify-center rounded-full border border-destructive/35 bg-background/90 shadow-md backdrop-blur-sm"
        role="status"
        aria-label="Offline. Toca no mapa para ficares disponível."
        data-testid="driver-map-availability-micro-offline"
      >
        <span className="h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-destructive/45" aria-hidden />
      </div>
    )
  }

  if (offline) {
    return (
      <button
        type="button"
        data-testid="driver-map-availability-micro-offline-pill"
        onClick={onGoOnline}
        aria-label="Offline — tocar para ficares disponível"
        className="pointer-events-auto absolute right-3 top-3 z-[30] flex h-11 w-11 items-center justify-center rounded-full border border-destructive/35 bg-background/90 shadow-md backdrop-blur-sm touch-manipulation hover:bg-background"
      >
        <span className="h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-destructive/45" aria-hidden />
      </button>
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
