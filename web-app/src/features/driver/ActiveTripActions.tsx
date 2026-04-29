import { useCallback, useEffect, useState } from 'react'
import { getDriverTripDetail, type TripDetailResponse } from '../../api/trips'
import { isTimeoutLikeError } from '../../api/client'
import { usePolling } from '../../hooks/usePolling'
import { mergeDriverPolledWithOverride, tripStateRank, driverActiveTripUi } from '../../constants/tripStatus'
import { PrimaryActionButton } from '../../components/layout/PrimaryActionButton'
import { toast as sonnerToast } from 'sonner'
import { DRIVER_START_TRIP_MAX_DISTANCE_M, haversineKm } from '../../utils/geo'
import { usePollStallHint } from '../../hooks/usePollStallHint'
import {
  driverPerformAccept,
  driverPerformCancel,
  driverPerformComplete,
  driverPerformStartFromAccepted,
  driverPerformStartFromArriving,
} from './driverTripActions'
import { canDriverStartTripNearPickup } from './driverPickupGate'
import { googleMapsDirectionsUrl, wazeNavigateUrl } from '../../utils/externalNavigation'
import { getDriverNavApp, type DriverNavApp } from '../../services/driverNavPreference'
import { useScreenWakeLock } from '../../hooks/useScreenWakeLock'

function DriverExternalNavLinks({
  phase,
  lat,
  lng,
  navApp,
  confirmExternalNav,
}: {
  phase: 'pickup' | 'destination'
  lat: number
  lng: number
  navApp: DriverNavApp
  confirmExternalNav: (mapName: string) => (e: React.MouseEvent<HTMLAnchorElement>) => void
}) {
  const wazeHref = wazeNavigateUrl(lat, lng)
  const googleHref = googleMapsDirectionsUrl(lat, lng)
  const preferWaze = navApp === 'waze'
  const primaryHref = preferWaze ? wazeHref : googleHref
  const secondaryHref = preferWaze ? googleHref : wazeHref
  const primaryMapName = preferWaze ? 'Waze' : 'Google Maps'
  const secondaryMapName = preferWaze ? 'Google Maps' : 'Waze'
  const primaryLabel =
    phase === 'pickup'
      ? preferWaze
        ? 'Recolha — Waze'
        : 'Recolha — Google Maps'
      : preferWaze
        ? 'Destino — Waze'
        : 'Destino — Google Maps'
  const secondaryLabel =
    phase === 'pickup'
      ? preferWaze
        ? 'Recolha — Google Maps'
        : 'Recolha — Waze'
      : preferWaze
        ? 'Destino — Google Maps'
        : 'Destino — Waze'
  const primaryTestId =
    phase === 'pickup' ? 'driver-nav-pickup-primary' : 'driver-nav-destination-primary'
  const secondaryTestId =
    phase === 'pickup' ? 'driver-nav-pickup-secondary' : 'driver-nav-destination-secondary'
  const linkClassPrimary =
    'min-h-11 flex flex-1 items-center justify-center rounded-xl border-2 border-info/80 bg-info/10 px-3 text-sm font-semibold text-foreground hover:bg-info/15 touch-manipulation'
  const linkClassSecondary =
    'min-h-11 flex flex-1 items-center justify-center rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground hover:bg-muted/50 touch-manipulation'

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <a
        href={primaryHref}
        target="_blank"
        rel="noopener noreferrer"
        data-testid={primaryTestId}
        onClick={confirmExternalNav(primaryMapName)}
        className={linkClassPrimary}
      >
        {primaryLabel}
      </a>
      <a
        href={secondaryHref}
        target="_blank"
        rel="noopener noreferrer"
        data-testid={secondaryTestId}
        onClick={confirmExternalNav(secondaryMapName)}
        className={linkClassSecondary}
      >
        {secondaryLabel}
      </a>
    </div>
  )
}

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
  const {
    data: trip,
    isRefreshing: tripRefreshing,
    lastSuccessAt: tripLastSuccessAt,
    pollFault: tripPollFault,
  } = usePolling(
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
  const navApp = getDriverNavApp()

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
  const hasTripContext = Boolean(coordsSource)
  const tripPollStalled = usePollStallHint(
    tripLastSuccessAt,
    tripRefreshing,
    Boolean(tripId && token && trip)
  )
  const wakeLockEnabled =
    displayStatus === 'assigned' ||
    displayStatus === 'accepted' ||
    displayStatus === 'arriving' ||
    displayStatus === 'ongoing'
  useScreenWakeLock(wakeLockEnabled)

  const tripPollHint = tripPollFault
    ? 'Não foi possível atualizar agora. Mantemos a última informação e tentamos de novo.'
    : trip
      ? tripRefreshing
        ? 'A atualizar estado…'
        : tripPollStalled
          ? 'Sem novidades há instantes — a última informação mantém-se válida.'
          : null
      : null

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
  if (!hasTripContext && !statusOverride) {
    return (
      <div className="rounded-xl border border-border/80 bg-muted/30 px-4 py-3 text-center text-sm text-foreground/75">
        A sincronizar estado da viagem… Se persistir, recarrega a página.
      </div>
    )
  }

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
  const nextStepHint =
    displayStatus === 'assigned'
      ? 'Aceita para começar a aproximação ao passageiro.'
      : (displayStatus === 'accepted' || displayStatus === 'arriving')
        ? 'Confirma a chegada ao ponto de recolha antes de iniciar viagem.'
        : displayStatus === 'ongoing'
          ? 'Segue para o destino e termina a viagem no fim.'
          : null

  const startTripGateActive =
    (displayStatus === 'accepted' || displayStatus === 'arriving') &&
    buttonConfig.label === 'Iniciar viagem'

  const distanceToPickupM =
    startTripGateActive && driverLocation && pickupCoords
      ? Math.max(0, Math.round(Math.abs(haversineKm(driverLocation, pickupCoords) * 1000)))
      : null

  return (
    <div className="space-y-2">
      {loadingLong ? (
        <p className="text-center text-sm text-foreground/70 px-1" aria-live="polite">
          Ainda a processar… Se demorar muito, verifica a ligação.
        </p>
      ) : null}
      {tripPollHint ? (
        <p className="text-center text-sm text-foreground/70 px-1 -mt-1" aria-live="polite">
          {tripPollHint}
        </p>
      ) : null}
      {nextStepHint ? (
        <p className="text-center text-sm text-foreground/75 px-1 -mt-1" aria-live="polite">
          {nextStepHint}
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
        <DriverExternalNavLinks
          phase="pickup"
          lat={navPickup.lat}
          lng={navPickup.lng}
          navApp={navApp}
          confirmExternalNav={confirmExternalNav}
        />
      ) : null}
      {navDestination && displayStatus === 'ongoing' ? (
        <DriverExternalNavLinks
          phase="destination"
          lat={navDestination.lat}
          lng={navDestination.lng}
          navApp={navApp}
          confirmExternalNav={confirmExternalNav}
        />
      ) : null}
      <PrimaryActionButton
        variant="confirm"
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
