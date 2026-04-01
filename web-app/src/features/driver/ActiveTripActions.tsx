import { useCallback, useEffect, useState } from 'react'
import { getDriverTripDetail } from '../../api/trips'
import { isTimeoutLikeError } from '../../api/client'
import { usePolling } from '../../hooks/usePolling'
import { mergeDriverPolledWithOverride, tripStateRank, driverActiveTripUi } from '../../constants/tripStatus'
import { PrimaryActionButton } from '../../components/layout/PrimaryActionButton'
import { toast as sonnerToast } from 'sonner'
import {
  driverPerformAccept,
  driverPerformCancel,
  driverPerformComplete,
  driverPerformStartFromAccepted,
  driverPerformStartFromArriving,
} from './driverTripActions'

export interface ActiveTripActionsProps {
  tripId: string
  token: string
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

  return (
    <div className="space-y-2">
      {loadingLong ? (
        <p className="text-center text-sm text-foreground/70 px-1" aria-live="polite">
          Ainda a processar… Se demorar muito, verifica a ligação.
        </p>
      ) : null}
      <PrimaryActionButton
        onClick={() => {
          void run(buttonConfig.action, buttonConfig.label)
        }}
        disabled={loading}
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
