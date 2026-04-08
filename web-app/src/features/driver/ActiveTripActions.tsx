import { useCallback, useEffect, useState } from 'react'
import { getDriverTripDetail } from '../../api/trips'
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

export interface ActiveTripActionsProps {
  tripId: string
  token: string
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
  const displayStatus = mergeDriverPolledWithOverride(trip?.status, statusOverride, 'accepted')
  const pickupCoords =
    trip != null ? { lat: trip.origin_lat, lng: trip.origin_lng } : null
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

  const [loading, setLoading] = useState(false)
  const [loadingLong, setLoadingLong] = useState(false)

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
        <div className="text-center text-xs text-foreground/65 px-1" aria-live="polite">
          <p>Aproxima-te do ponto de recolha (~{DRIVER_START_TRIP_MAX_DISTANCE_M} m) para iniciar a viagem.</p>
          {distanceToPickupM != null ? (
            <p className="mt-1">Distância ao pickup: ~{distanceToPickupM} m</p>
          ) : null}
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
          className="w-full text-muted-foreground text-base py-3 hover:text-destructive"
        >
          Cancelar viagem
        </button>
      )}
    </div>
  )
}
