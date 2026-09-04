import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  buildEmergencyShareText,
  getEmergencySnapshot,
  openEmergencyCall112,
  recordEmergencyEvent,
  shareEmergencyText,
  type EmergencySnapshot,
} from './emergencyShare'
import { BTN_PRIMARY_COMPACT, BTN_SECONDARY } from '../../components/layout/infoBoxTemplate'

export interface EmergencySosPanelProps {
  tripId: string
  token: string
  open: boolean
  onClose: () => void
  /** passenger | driver — affects copy only when snapshot lags */
  roleHint?: 'passenger' | 'driver'
}

export function EmergencySosPanel({
  tripId,
  token,
  open,
  onClose,
}: EmergencySosPanelProps) {
  const [snap, setSnap] = useState<EmergencySnapshot | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open || !tripId || !token) return
    let cancelled = false
    setLoadError(null)
    setSnap(null)
    void (async () => {
      try {
        await recordEmergencyEvent(tripId, token, 'opened')
        const data = await getEmergencySnapshot(tripId, token)
        if (!cancelled) setSnap(data)
      } catch {
        if (!cancelled) setLoadError('Não foi possível carregar os dados de emergência.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, tripId, token])

  const onCall112 = useCallback(async () => {
    setBusy(true)
    try {
      await recordEmergencyEvent(tripId, token, 'call_initiated')
    } finally {
      openEmergencyCall112()
      setBusy(false)
    }
  }, [tripId, token])

  const onShare = useCallback(async () => {
    if (!snap) return
    setBusy(true)
    try {
      await recordEmergencyEvent(tripId, token, 'shared')
      const text = buildEmergencyShareText(snap)
      const result = await shareEmergencyText(text)
      if (result === 'shared') toast.success('Partilha iniciada')
      else if (result === 'copied') toast.success('Dados copiados para a área de transferência')
      else toast.error('Não foi possível partilhar')
    } finally {
      setBusy(false)
    }
  }, [snap, tripId, token])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-sos-title"
      data-testid="emergency-sos-panel"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-background p-4 shadow-xl ring-1 ring-border"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="emergency-sos-title" className="text-lg font-semibold text-foreground">
          Emergência
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Em perigo imediato, liga para o 112. A chamada não é iniciada automaticamente.
        </p>

        {loadError ? (
          <p className="mt-3 text-sm text-destructive" data-testid="emergency-sos-error">
            {loadError}
          </p>
        ) : null}

        {snap ? (
          <dl className="mt-3 space-y-1.5 text-sm" data-testid="emergency-sos-summary">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Viagem</dt>
              <dd className="font-mono">{snap.trip_ref}</dd>
            </div>
            {snap.vehicle_plate ? (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Matrícula</dt>
                <dd>{snap.vehicle_plate}</dd>
              </div>
            ) : null}
            {snap.driver_display_name ? (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Motorista</dt>
                <dd>{snap.driver_display_name}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Origem</dt>
              <dd className="text-right font-mono text-xs">
                {snap.origin_lat.toFixed(5)}, {snap.origin_lng.toFixed(5)}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Destino</dt>
              <dd className="text-right font-mono text-xs">
                {snap.destination_lat.toFixed(5)}, {snap.destination_lng.toFixed(5)}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Localização</dt>
              <dd className="text-right">
                {snap.location ? (
                  <a
                    className="text-primary underline"
                    href={snap.location.map_link}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ver no mapa
                  </a>
                ) : (
                  <span data-testid="emergency-location-unavailable">
                    Localização actual indisponível
                  </span>
                )}
              </dd>
            </div>
          </dl>
        ) : !loadError ? (
          <p className="mt-3 text-sm text-muted-foreground">A carregar…</p>
        ) : null}

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            className={BTN_PRIMARY_COMPACT}
            data-testid="emergency-call-112"
            disabled={busy}
            onClick={() => void onCall112()}
          >
            Ligar 112
          </button>
          <button
            type="button"
            className={BTN_SECONDARY}
            data-testid="emergency-share-trip"
            disabled={busy || !snap}
            onClick={() => void onShare()}
          >
            Partilhar dados da viagem
          </button>
          <button
            type="button"
            className={BTN_SECONDARY}
            data-testid="emergency-sos-close"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

export function EmergencySosButton({
  onClick,
  className = '',
}: {
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      data-testid="emergency-sos-button"
      className={`rounded-lg border border-red-600/40 bg-red-600/10 px-3 py-2 text-sm font-semibold text-red-700 dark:text-red-400 ${className}`}
      onClick={onClick}
    >
      SOS
    </button>
  )
}
