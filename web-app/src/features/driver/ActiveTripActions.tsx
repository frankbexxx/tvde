import { useCallback, useEffect, useState } from 'react'
import { getDriverTripDetail, type TripDetailResponse } from '../../api/trips'
import { isTimeoutLikeError } from '../../api/client'
import { usePolling } from '../../hooks/usePolling'
import { mergeDriverPolledWithOverride, tripStateRank, driverActiveTripUi } from '../../constants/tripStatus'
import { PrimaryActionButton } from '../../components/layout/PrimaryActionButton'
import { toast as sonnerToast } from 'sonner'
import { DRIVER_START_TRIP_MAX_DISTANCE_M, haversineKm } from '../../utils/geo'
import {
  driverPerformAccept,
  driverPerformCancel,
  driverPerformComplete,
  driverPerformStartFromAccepted,
  driverPerformStartFromArriving,
} from './driverTripActions'
import { canDriverStartTripNearPickup } from './driverPickupGate'
import { googleMapsDirectionsUrl, wazeNavigateUrl } from '../../utils/externalNavigation'

export interface ActiveTripActionsProps {
  tripId: string
  token: string
  /**
   * Último detalhe conhecido (ex.: logo após aceitar) enquanto o poll deste bloco ainda não devolveu `trip`.
   * O `ActiveTripSummary` já usa o mesmo fallback; sem isto, links Waze/Maps e o gate de distância ficam invisíveis.
   */
  tripDetailFallback?: TripDetailResponse | null
  /** Posição actual do motorista (real ou simulada); necessária para o gate de «Iniciar viagem». */
  driverLocation: { lat: number; lng: number } | null
  addLog: (msg: string, type?: 'info' | 'success' | 'error' | 'action') => void
  setStatus: (msg: string) => void
  statusOverride: string | null
  onClearStatusOverride: () => void
  onTripActionSuccess: (status: string) => void
  onComplete: () => void
  onError: (s: string) => void
}

export function ActiveTripActions({
  tripId,
  token,
  tripDetailFallback = null,
  driverLocation,
  addLog,
  setStatus,
  statusOverride,
  onClearStatusOverride,
  onTripActionSuccess,
  onComplete,
  onError,
}: ActiveTripActionsProps) {
  const fetchTrip = useCallback(() => getDriverTripDetail(tripId, token), [tripId, token])
  const { data: trip } = usePolling(
    fetchTrip,
    [tripId, token],
    !!tripId && !!token,
    2000
  )
  const coordsSource = trip ?? tripDetailFallback
  const displayStatus = mergeDriverPolledWithOverride(coordsSource?.status, statusOverride, 'accepted')
  const pickupCoords =
    coordsSource != null ? { lat: coordsSource.origin_lat, lng: coordsSource.origin_lng } : null
  const startTripAllowed = canDriverStartTripNearPickup(
    displayStatus,
    driverLocation,
    pickupCoords
  )

  useEffect(() => {
    if (!statusOverride || !trip?.status) return
    if (tripStateRank(trip.status) >= tripStateRank(statusOverride)) {
      onClearStatusOverride()
    }
  }, [trip?.status, statusOverride, onClearStatusOverride])

  const navPickup = pickupCoords
  const navDestination =
    coordsSource != null
      ? { lat: coordsSource.destination_lat, lng: coordsSource.destination_lng }
      : null

  const [loading, setLoading] = useState(false)
  const [loadingLong, setLoadingLong] = useState(false)

  /**
   * Guarda simples: quando o motorista toca num link para Waze ou Google Maps,
   * pergunta antes de sair da app. Evita saídas acidentais durante demo/viagem
   * activa. Se o motorista cancelar, intercepta `preventDefault` para impedir
   * a abertura do separador.
   *
   * Nota: este é um `window.confirm` nativo. Propositadamente não adicionamos
   * "don't ask again" — é baixo-frequência (1-2x por viagem) e a segurança
   * vale o click extra.
   */
  const confirmExternalNav = (mapName: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    const ok = window.confirm(
      `Abrir ${mapName} num separador novo?\n\nA app TVDE fica aberta — volta ao separador quando estiveres pronto.`
    )
    if (!ok) e.preventDefault()
  }

  useEffect(() => {
    if (!loading) {
      setLoadingLong(false)
      return
    }
    const id = window.setTimeout(() => setLoadingLong(true), 12_000)
    return () => window.clearTimeout(id)
  }, [loading])

  const run = async (
    action: () => Promise<{ status: string }>,
    actionName: string
  ) => {
    if (loading) return
    if (
      actionName === 'Iniciar viagem' &&
      !canDriverStartTripNearPickup(displayStatus, driverLocation, pickupCoords)
    ) {
      const msg = `Aproxima-te do ponto de recolha (até ~${DRIVER_START_TRIP_MAX_DISTANCE_M} m) para iniciar.`
      onError(msg)
      setStatus('Erro')
      addLog(`Bloqueado: ${actionName} — longe do pickup`, 'error')
      return
    }
    setLoading(true)
    onError('')
    setStatus(`A executar: ${actionName}...`)
    addLog(`Clique: ${actionName}`, 'action')
    try {
      const res = await action()
      onTripActionSuccess(res.status)
      setStatus(driverActiveTripUi(res.status).label)
      addLog(`${actionName} concluído (${res.status})`, 'success')
      if (res.status === 'ongoing') sonnerToast.success('Viagem iniciada')
      if (res.status === 'completed') sonnerToast.success('Viagem concluída')
      if (res.status === 'completed' || res.status === 'cancelled') onComplete()
    } catch (err: unknown) {
      const e = err as { status?: number; detail?: string }
      const msg = isTimeoutLikeError(err) || e?.status === 0
        ? 'Sem ligação ou o pedido demorou demasiado. Verifica a rede e tenta de novo.'
        : String(e?.detail ?? 'Erro')
      onError(msg)
      setStatus('Erro')
      addLog(`Erro ${actionName}: ${msg}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  if (displayStatus === 'completed' || displayStatus === 'cancelled') return null

  const buttonConfig =
    displayStatus === 'assigned'
      ? { label: 'Aceitar', action: () => driverPerformAccept(tripId, token) }
      : displayStatus === 'accepted'
        ? { label: 'Iniciar viagem', action: () => driverPerformStartFromAccepted(tripId, token) }
        : displayStatus === 'arriving'
          ? { label: 'Iniciar viagem', action: () => driverPerformStartFromArriving(tripId, token) }
          : displayStatus === 'ongoing'
            ? { label: 'Terminar viagem', action: () => driverPerformComplete(tripId, token) }
            : null

  if (!buttonConfig) {
    return (
      <div className="rounded-xl border border-border/80 bg-muted/30 px-4 py-3 text-center text-sm text-foreground/75">
        A sincronizar estado da viagem… Se persistir, recarrega a página.
      </div>
    )
  }

  const showCancel =
    displayStatus === 'assigned' ||
    displayStatus === 'accepted' ||
    displayStatus === 'arriving'

  const startTripGateActive =
    (displayStatus === 'accepted' || displayStatus === 'arriving') &&
    buttonConfig.label === 'Iniciar viagem'

  const distanceToPickupM =
    startTripGateActive && driverLocation && pickupCoords
      ? Math.round(haversineKm(driverLocation, pickupCoords) * 1000)
      : null

  return (
    <div className="space-y-2">
      {loadingLong ? (
        <p className="text-center text-sm text-foreground/70 px-1" aria-live="polite">
          Ainda a processar… Se demorar muito, verifica a ligação.
        </p>
      ) : null}
      {startTripGateActive && !startTripAllowed ? (
        <div className="text-center text-sm text-foreground/75 px-1 leading-snug" aria-live="polite">
          <p>Aproxima-te do ponto de recolha (~{DRIVER_START_TRIP_MAX_DISTANCE_M} m) para iniciar a viagem.</p>
          {distanceToPickupM != null ? (
            <p className="mt-1 font-medium">Distância ao pickup: ~{distanceToPickupM} m</p>
          ) : null}
        </div>
      ) : null}
      {navPickup &&
      (displayStatus === 'assigned' ||
        displayStatus === 'accepted' ||
        displayStatus === 'arriving') ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <a
            href={wazeNavigateUrl(navPickup.lat, navPickup.lng)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={confirmExternalNav('Waze')}
            className="min-h-11 flex flex-1 items-center justify-center rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground hover:bg-muted/50 touch-manipulation"
          >
            Pickup no Waze
          </a>
          <a
            href={googleMapsDirectionsUrl(navPickup.lat, navPickup.lng)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={confirmExternalNav('Google Maps')}
            className="min-h-11 flex flex-1 items-center justify-center rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground hover:bg-muted/50 touch-manipulation"
          >
            Pickup no Google Maps
          </a>
        </div>
      ) : null}
      {navDestination && displayStatus === 'ongoing' ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <a
            href={wazeNavigateUrl(navDestination.lat, navDestination.lng)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={confirmExternalNav('Waze')}
            className="min-h-11 flex flex-1 items-center justify-center rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground hover:bg-muted/50 touch-manipulation"
          >
            Destino no Waze
          </a>
          <a
            href={googleMapsDirectionsUrl(navDestination.lat, navDestination.lng)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={confirmExternalNav('Google Maps')}
            className="min-h-11 flex flex-1 items-center justify-center rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground hover:bg-muted/50 touch-manipulation"
          >
            Destino no Google Maps
          </a>
        </div>
      ) : null}
      <PrimaryActionButton
        onClick={() => {
          void run(buttonConfig.action, buttonConfig.label)
        }}
        disabled={loading || (startTripGateActive && !startTripAllowed)}
        loading={loading}
      >
        {buttonConfig.label}
      </PrimaryActionButton>
      {showCancel && (
        <button
          type="button"
          onClick={() => {
            void run(() => driverPerformCancel(tripId, token), 'Cancelar viagem')
          }}
          disabled={loading}
          className="w-full min-h-[44px] rounded-lg border border-destructive/40 bg-transparent text-destructive text-base font-medium py-3 hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 focus-visible:ring-offset-2 disabled:border-border disabled:bg-muted/50 disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors touch-manipulation"
        >
          Cancelar viagem
        </button>
      )}
    </div>
  )
}
