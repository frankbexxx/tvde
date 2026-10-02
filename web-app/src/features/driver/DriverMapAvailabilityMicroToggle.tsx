/**
 * Disponibilidade no palco do mapa: estado e acção separados, um só botão.
 * O toque no mapa não muda a disponibilidade.
 */
import { useTranslation } from 'react-i18next'

type DriverMapAvailabilityMicroToggleProps = {
  offline: boolean
  syncing?: boolean
  blocked?: boolean
  onGoOnline: () => void
  onGoOffline: () => void
}

export function DriverMapAvailabilityMicroToggle({
  offline,
  syncing = false,
  blocked = false,
  onGoOnline,
  onGoOffline,
}: DriverMapAvailabilityMicroToggleProps) {
  const { t } = useTranslation('driver')
  const cannotGoOnline = offline && blocked
  const action = offline ? t('availability.goOnline') : t('availability.goOffline')

  return (
    <div
      className="pointer-events-auto absolute left-3 right-3 top-3 z-[30] flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background/95 px-3 py-2 shadow-md backdrop-blur-sm"
      data-testid="driver-map-availability-control"
    >
      <p className="text-sm font-medium text-foreground" data-testid="driver-availability-state">
        {offline ? t('availability.stateOffline') : t('availability.stateOnline')}
      </p>
      <button
        type="button"
        data-testid={
          offline ? 'driver-map-availability-micro-offline-pill' : 'driver-map-availability-micro-online'
        }
        disabled={syncing || cannotGoOnline}
        aria-busy={syncing}
        onClick={() => (offline ? onGoOnline() : onGoOffline())}
        className="min-h-11 shrink-0 rounded-lg bg-foreground px-3 py-2 text-sm font-semibold text-background touch-manipulation disabled:cursor-not-allowed disabled:opacity-50"
      >
        {syncing ? t('availability.updating') : action}
      </button>
    </div>
  )
}
