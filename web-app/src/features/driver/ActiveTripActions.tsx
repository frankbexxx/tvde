import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { TripDetailResponse } from '../../api/trips'
import { isTimeoutLikeError } from '../../api/client'
import { mergeDriverPolledWithOverride, tripStateRank, driverActiveTripUi } from '../../constants/tripStatus'
import { PrimaryActionButton } from '../../components/layout/PrimaryActionButton'
import { HintLine } from '../../components/layout/HintLine'
import { MapActionRow } from '../../components/layout/MapActionRow'
import {
  BTN_DANGER_OUTLINE,
  BTN_SECONDARY,
  BTN_SECONDARY_RADIUS,
  BTN_SUCCESS_OUTLINE,
  INFO_BOX_MAP_HINT,
} from '../../components/layout/infoBoxTemplate'
import { toast as sonnerToast } from 'sonner'
import { DRIVER_START_TRIP_MAX_DISTANCE_M, haversineKm } from '../../utils/geo'
import { usePollStallHint } from '../../hooks/usePollStallHint'
import {
  driverPerformAccept,
  driverPerformCancel,
  driverPerformComplete,
  driverPerformMarkArriving,
  driverPerformStartFromAccepted,
  driverPerformStartFromArriving,
} from './driverTripActions'
import { canDriverStartTripNearPickup } from './driverPickupGate'
import { openDriverExternalNav, driverNavAppLabel } from '../../utils/openDriverExternalNav'
import {
  DRIVER_TRIP_CANCEL_PRESETS,
  TRIP_CANCEL_SELECT_OTHER,
  tripCancelReasonForApi,
} from '../../constants/tripCancelReasons'
import type { DriverActiveTripPollState } from './useDriverActiveTripPoll'
import { useDriverActiveTripPoll } from './useDriverActiveTripPoll'

export interface ActiveTripActionsProps {
  tripId: string
  token: string
  /**
   * Último detalhe conhecido (ex.: logo após aceitar) enquanto o poll deste bloco ainda não devolveu `trip`.
   * O `ActiveTripSummary` já usa o mesmo fallback; sem isto o gate de distância fica invisível entre polls.
   */
  tripDetailFallback?: TripDetailResponse | null
  /** Poll partilhado (D4) — quando omitido, este componente faz poll próprio. */
  sharedPoll?: DriverActiveTripPollState
  /** Posição actual do motorista (real ou simulada); necessária para o gate de «Iniciar viagem». */
  driverLocation: { lat: number; lng: number } | null
  addLog: (msg: string, type?: 'info' | 'success' | 'error' | 'action') => void
  setStatus: (msg: string) => void
  statusOverride: string | null
  onClearStatusOverride: () => void
  onTripActionSuccess: (status: string) => void
  onComplete: () => void
  /** Chamado quando a viagem passa a `completed` (pai pode libertar o ecrã após resumo). */
  onTripCompleted?: () => void
  onError: (s: string) => void
}

export function ActiveTripActions({
  tripId,
  token,
  tripDetailFallback = null,
  sharedPoll,
  driverLocation,
  addLog,
  setStatus,
  statusOverride,
  onClearStatusOverride,
  onTripActionSuccess,
  onComplete,
  onTripCompleted,
  onError,
}: ActiveTripActionsProps) {
  const internalPoll = useDriverActiveTripPoll(
    sharedPoll ? null : tripId,
    sharedPoll ? null : token,
    !sharedPoll && !!tripId && !!token
  )
  const pollBundle = sharedPoll ?? internalPoll
  const trip = pollBundle.poll?.trip ?? null
  const tripRefreshing = pollBundle.isRefreshing
  const tripLastSuccessAt = pollBundle.lastSuccessAt
  const tripPollFault = pollBundle.pollFault

  /** Evita janela sem dados quando `trip` e `tripDetailFallback` estão ambos null entre polls. */
  const lastCoordsRef = useRef<TripDetailResponse | null>(null)
  useEffect(() => {
    lastCoordsRef.current = null
  }, [tripId])
  const rawCoords = trip ?? tripDetailFallback
  useEffect(() => {
    if (rawCoords) lastCoordsRef.current = rawCoords
  }, [rawCoords])
  const coordsSource = rawCoords ?? lastCoordsRef.current
  const displayStatus = mergeDriverPolledWithOverride(coordsSource?.status, statusOverride, 'accepted')
  const pickupCoords = useMemo(
    () =>
      coordsSource != null ? { lat: coordsSource.origin_lat, lng: coordsSource.origin_lng } : null,
    [coordsSource]
  )
  const destinationCoords = useMemo(
    () =>
      coordsSource != null
        ? { lat: coordsSource.destination_lat, lng: coordsSource.destination_lng }
        : null,
    [coordsSource]
  )
  const nearPickup = canDriverStartTripNearPickup(displayStatus, driverLocation, pickupCoords)
  const startTripAllowed =
    displayStatus === 'accepted' ? nearPickup : canDriverStartTripNearPickup(displayStatus, driverLocation, pickupCoords)

  useEffect(() => {
    if (!statusOverride || !trip?.status) return
    if (tripStateRank(trip.status) >= tripStateRank(statusOverride)) {
      onClearStatusOverride()
    }
  }, [trip?.status, statusOverride, onClearStatusOverride])

  const [loading, setLoading] = useState(false)
  const [loadingLong, setLoadingLong] = useState(false)
  const [cancelPanelOpen, setCancelPanelOpen] = useState(false)
  const [cancelPreset, setCancelPreset] = useState('')
  const [cancelOtherDetail, setCancelOtherDetail] = useState('')
  const navOpenedForOngoingRef = useRef(false)

  useEffect(() => {
    setCancelPanelOpen(false)
    setCancelPreset('')
    setCancelOtherDetail('')
    navOpenedForOngoingRef.current = false
  }, [tripId])

  const hasTripContext = Boolean(coordsSource)
  const tripPollStalled = usePollStallHint(
    tripLastSuccessAt,
    tripRefreshing,
    Boolean(tripId && token && trip)
  )

  const tripPollHint = tripPollFault
    ? 'Não foi possível atualizar agora. Mantemos a última informação e tentamos de novo.'
    : trip
      ? tripRefreshing
        ? 'A atualizar estado…'
        : tripPollStalled
          ? 'Sem novidades há instantes — a última informação mantém-se válida.'
          : null
      : null

  useEffect(() => {
    if (!loading) {
      setLoadingLong(false)
      return
    }
    const id = window.setTimeout(() => setLoadingLong(true), 12_000)
    return () => window.clearTimeout(id)
  }, [loading])

  const openNavForPhase = useCallback(() => {
    const target =
      displayStatus === 'ongoing' ? destinationCoords : pickupCoords
    if (!target) return
    openDriverExternalNav(target.lat, target.lng)
    const phaseLabel = displayStatus === 'ongoing' ? 'destino' : 'recolha'
    sonnerToast.message(`A abrir ${driverNavAppLabel()} (${phaseLabel})`, { duration: 3000 })
  }, [destinationCoords, displayStatus, pickupCoords])

  const run = async (
    action: () => Promise<{ status: string }>,
    actionName: string,
    opts?: { skipStartGate?: boolean }
  ): Promise<boolean> => {
    if (loading) return false
    if (
      actionName === 'Iniciar viagem' &&
      !opts?.skipStartGate &&
      !canDriverStartTripNearPickup(displayStatus, driverLocation, pickupCoords)
    ) {
      const msg = `Aproxima-te do ponto de recolha (até ~${DRIVER_START_TRIP_MAX_DISTANCE_M} m) para iniciar.`
      onError(msg)
      setStatus('Erro')
      addLog(`Bloqueado: ${actionName} — longe do pickup`, 'error')
      return false
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
      if (res.status === 'ongoing' && !navOpenedForOngoingRef.current) {
        navOpenedForOngoingRef.current = true
        sonnerToast.success('Viagem iniciada')
        if (destinationCoords) {
          openDriverExternalNav(destinationCoords.lat, destinationCoords.lng)
          sonnerToast.message(`A abrir ${driverNavAppLabel()} (destino)`, { duration: 3000 })
        }
      }
      if (res.status === 'arriving') {
        sonnerToast.success('Chegada confirmada')
      }
      if (res.status === 'completed') {
        sonnerToast.success('Viagem concluída')
        onTripCompleted?.()
      }
      if (res.status === 'cancelled') onComplete()
      return true
    } catch (err: unknown) {
      const e = err as { status?: number; detail?: string }
      const msg = isTimeoutLikeError(err) || e?.status === 0
        ? 'Sem ligação ou o pedido demorou demasiado. Verifica a rede e tenta de novo.'
        : String(e?.detail ?? 'Erro')
      onError(msg)
      setStatus('Erro')
      addLog(`Erro ${actionName}: ${msg}`, 'error')
      return false
    } finally {
      setLoading(false)
    }
  }

  if (displayStatus === 'completed' || displayStatus === 'cancelled') return null
  if (!hasTripContext && !statusOverride) {
    return (
      <div className={`${INFO_BOX_MAP_HINT} px-4 py-3 text-center text-sm text-foreground/75`}>
        A sincronizar estado da viagem… Se persistir, recarrega a página.
      </div>
    )
  }

  const buttonConfig =
    displayStatus === 'assigned'
      ? { label: 'Aceitar', action: () => driverPerformAccept(tripId, token) }
      : displayStatus === 'accepted'
        ? nearPickup
          ? { label: 'Iniciar viagem', action: () => driverPerformStartFromAccepted(tripId, token) }
          : { label: 'Cheguei', action: () => driverPerformMarkArriving(tripId, token), skipStartGate: true }
        : displayStatus === 'arriving'
          ? { label: 'Iniciar viagem', action: () => driverPerformStartFromArriving(tripId, token) }
          : displayStatus === 'ongoing'
            ? { label: 'Terminar viagem', action: () => driverPerformComplete(tripId, token) }
            : null

  if (!buttonConfig) {
    return (
      <div className={`${INFO_BOX_MAP_HINT} px-4 py-3 text-center text-sm text-foreground/75`}>
        A sincronizar estado da viagem… Se persistir, recarrega a página.
      </div>
    )
  }

  const showCancel =
    displayStatus === 'assigned' ||
    displayStatus === 'accepted' ||
    displayStatus === 'arriving'
  const showNavButton =
    displayStatus === 'accepted' ||
    displayStatus === 'arriving' ||
    displayStatus === 'ongoing'
  const compactTripActions = showNavButton && showCancel && !cancelPanelOpen
  const navBtnClass = compactTripActions ? `${BTN_SECONDARY} flex-[2] min-w-0 px-2 text-xs` : BTN_SECONDARY
  const cancelBtnClass = compactTripActions
    ? `${BTN_DANGER_OUTLINE} flex-1 min-w-0 px-1 text-xs`
    : BTN_DANGER_OUTLINE
  const successBtnClass = compactTripActions
    ? `${BTN_SUCCESS_OUTLINE} flex-[2] min-w-0 px-2 text-xs`
    : BTN_SUCCESS_OUTLINE

  const nextStepHint =
    displayStatus === 'assigned'
      ? 'Aceita para começar a aproximação ao passageiro.'
      : displayStatus === 'accepted' && !nearPickup
        ? 'Confirma «Cheguei» quando estiveres no ponto de recolha.'
        : displayStatus === 'accepted' || displayStatus === 'arriving'
          ? 'Inicia a viagem quando o passageiro estiver contigo.'
          : displayStatus === 'ongoing'
            ? 'Segue para o destino e termina a viagem no fim.'
            : null

  const startTripGateActive =
    (displayStatus === 'accepted' && nearPickup) || displayStatus === 'arriving'

  const distanceToPickupM =
    startTripGateActive && driverLocation && pickupCoords
      ? Math.max(0, Math.round(Math.abs(haversineKm(driverLocation, pickupCoords) * 1000)))
      : null

  return (
    <div className="space-y-2">
      {loadingLong ? (
        <HintLine>Ainda a processar… Se demorar muito, verifica a ligação.</HintLine>
      ) : null}
      {tripPollHint ? (
        <HintLine className="-mt-1" testId="driver-trip-poll-hint">
          {tripPollHint}
        </HintLine>
      ) : null}
      {nextStepHint && displayStatus !== 'ongoing' ? (
        <HintLine className="-mt-1 text-foreground/75 text-xs" testId="driver-next-step-hint">
          {nextStepHint}
        </HintLine>
      ) : null}
      {startTripGateActive && !startTripAllowed ? (
        <div className="text-center text-sm text-foreground/75 px-1 leading-snug" aria-live="polite">
          <p>Aproxima-te do ponto de recolha (~{DRIVER_START_TRIP_MAX_DISTANCE_M} m) para iniciar a viagem.</p>
          {distanceToPickupM != null ? (
            <p className="mt-1 font-medium">Distância ao pickup: ~{distanceToPickupM} m</p>
          ) : null}
        </div>
      ) : null}
      <MapActionRow testId="driver-trip-action-stack">
        {showNavButton ? (
          <button
            type="button"
            data-testid="driver-open-nav"
            className={navBtnClass}
            onClick={openNavForPhase}
            disabled={loading}
          >
            Abrir navegação
          </button>
        ) : null}
        {displayStatus === 'ongoing' ? (
          <button
            type="button"
            className={successBtnClass}
            onClick={() => {
              void run(buttonConfig.action, buttonConfig.label)
            }}
            disabled={loading}
          >
            {loading ? 'A processar…' : buttonConfig.label}
          </button>
        ) : (
          <PrimaryActionButton
            variant="confirm"
            size="compact"
            className={compactTripActions ? 'flex-[2] min-w-0 text-xs' : 'flex-1 min-w-0'}
            onClick={() => {
              void run(buttonConfig.action, buttonConfig.label, {
                skipStartGate: buttonConfig.skipStartGate,
              })
            }}
            disabled={loading || (startTripGateActive && !startTripAllowed)}
            loading={loading}
          >
            {buttonConfig.label}
          </PrimaryActionButton>
        )}
        {showCancel && !cancelPanelOpen ? (
          <button
            type="button"
            data-testid="driver-trip-cancel-open"
            onClick={() => setCancelPanelOpen(true)}
            disabled={loading}
            className={cancelBtnClass}
          >
            Cancelar
          </button>
        ) : null}
      </MapActionRow>
      {showCancel && cancelPanelOpen ? (
        <div
          className={`${BTN_SECONDARY_RADIUS} border border-destructive/35 bg-destructive/5 px-3 py-3 space-y-3`}
          data-testid="driver-trip-cancel-panel"
        >
          <p className="text-sm font-medium text-foreground">Motivo do cancelamento</p>
          <label className="block text-xs text-muted-foreground" htmlFor="driver-cancel-preset">
            Escolha rápida
          </label>
          <select
            id="driver-cancel-preset"
            data-testid="driver-cancel-preset"
            className={`w-full min-h-[44px] ${BTN_SECONDARY_RADIUS} border border-border bg-background px-2 text-sm text-foreground`}
            value={cancelPreset}
            onChange={(e) => setCancelPreset(e.target.value)}
            disabled={loading}
          >
            {DRIVER_TRIP_CANCEL_PRESETS.map((o) => (
              <option key={o.value || 'none'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {cancelPreset === TRIP_CANCEL_SELECT_OTHER ? (
            <textarea
              data-testid="driver-cancel-other"
              className={`w-full min-h-[72px] ${BTN_SECONDARY_RADIUS} border border-border bg-background px-2 py-2 text-sm text-foreground`}
              placeholder="Descreve em poucas palavras (opcional)."
              maxLength={280}
              value={cancelOtherDetail}
              onChange={(e) => setCancelOtherDetail(e.target.value)}
              disabled={loading}
            />
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button
              type="button"
              data-testid="driver-trip-cancel-confirm"
              onClick={() => {
                void (async () => {
                  const reason = tripCancelReasonForApi(cancelPreset, cancelOtherDetail)
                  const ok = await run(
                    () => driverPerformCancel(tripId, token, reason),
                    'Cancelar viagem',
                    { skipStartGate: true }
                  )
                  if (ok) {
                    setCancelPanelOpen(false)
                    setCancelPreset('')
                    setCancelOtherDetail('')
                  }
                })()
              }}
              disabled={loading}
              className={`min-h-[44px] flex-1 ${BTN_SECONDARY_RADIUS} bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 disabled:opacity-50 touch-manipulation`}
            >
              Confirmar cancelamento
            </button>
            <button
              type="button"
              data-testid="driver-trip-cancel-back"
              onClick={() => {
                setCancelPanelOpen(false)
                setCancelPreset('')
                setCancelOtherDetail('')
              }}
              disabled={loading}
              className={`min-h-[44px] flex-1 ${BTN_SECONDARY}`}
            >
              Voltar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
