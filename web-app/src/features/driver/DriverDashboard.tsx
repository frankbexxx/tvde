import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useActivityLog } from '../../context/ActivityLogContext'
import { useActiveTrip } from '../../context/ActiveTripContext'
import {
  getAvailableTrips,
  getDriverTripHistory,
  getDriverTripDetail,
  acceptTrip,
  markArriving,
  startTrip,
  completeTrip,
  cancelTripByDriver,
  setDriverOnline,
  setDriverOffline,
} from '../../api/trips'
import type { TripAvailableItem, TripHistoryItem } from '../../api/trips'
import { usePolling } from '../../hooks/usePolling'
import { useGeolocation } from '../../hooks/useGeolocation'
import { ScreenContainer } from '../../components/layout/ScreenContainer'
import { StatusHeader } from '../../components/layout/StatusHeader'
import { PrimaryActionButton } from '../../components/layout/PrimaryActionButton'
import { Toggle } from '../../components/ui/Toggle'
import { RequestCard } from '../../components/cards/RequestCard'
import { TripCard } from '../../components/cards/TripCard'
import { formatPickup, formatDestination } from '../../utils/format'
import { DevTools } from '../shared/DevTools'
import { MapView } from '../../maps/MapView'
import { sendDriverLocation } from '../../services/locationService'
import { toast as sonnerToast } from 'sonner'

const DRIVER_OFFLINE_KEY = 'tvde_driver_offline'

function getStoredOffline(): boolean {
  try {
    return localStorage.getItem(DRIVER_OFFLINE_KEY) === '1'
  } catch {
    return false
  }
}

function setStoredOffline(offline: boolean) {
  try {
    localStorage.setItem(DRIVER_OFFLINE_KEY, offline ? '1' : '0')
  } catch {
    /* ignore */
  }
}

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: import('../../components/layout/StatusHeader').StatusVariant }
> = {
  accepted: { label: 'A caminho do passageiro', variant: 'accepted' },
  arriving: { label: 'A chegar', variant: 'arriving' },
  ongoing: { label: 'Em viagem', variant: 'ongoing' },
  completed: { label: 'Viagem concluída', variant: 'completed' },
}

export function DriverDashboard() {
  const { token } = useAuth()
  const { addLog, setStatus } = useActivityLog()
  const { driverActiveTripId, setDriverActiveTripId } = useActiveTrip()
  const activeTripId = driverActiveTripId
  const { position: driverLocation, usedFallback: geolocationUsedFallback } = useGeolocation()
  const [offline, setOffline] = useState(getStoredOffline)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const pollEnabled = !!token && !offline

  const { data: available, refetch: refetchAvailable } = usePolling(
    () => getAvailableTrips(token!),
    [token],
    pollEnabled,
    3000
  )
  const { data: history, refetch: refetchHistory } = usePolling(
    () => getDriverTripHistory(token!),
    [token],
    !!token,
    10000
  )

  // Send driver location immediately when available, then every 3s (A006 geo stability).
  // Only send when we have a token — prevents 401 "Not authenticated" on cold load.
  useEffect(() => {
    if (offline || !driverLocation || !token) return

    let cancelled = false

    // Immediate first send — no driver should be online without at least one location in DB.
    void sendDriverLocation(driverLocation.lat, driverLocation.lng).catch((err) => {
      if (!cancelled) console.warn('Failed to send driver location (first)', err)
    })

    const interval = setInterval(() => {
      if (cancelled || !driverLocation || !token) return
      void sendDriverLocation(driverLocation.lat, driverLocation.lng).catch((err) => {
        if (!cancelled) console.warn('Failed to send driver location', err)
      })
    }, 3000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [offline, driverLocation, token])

  useEffect(() => {
    setStoredOffline(offline)
  }, [offline])

  // Sync backend status when token becomes available (ensures backend is_available matches frontend)
  useEffect(() => {
    if (!token) return
    if (offline) {
      void setDriverOffline(token).catch(() => {})
    } else {
      void setDriverOnline(token).catch(() => {})
    }
  }, [token, offline])

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(t)
    }
  }, [toast])

  const runAction = async (
    action: () => Promise<{ status: string }>,
    tripId: string,
    actionName: string,
    onSuccess?: () => void
  ) => {
    setError(null)
    setActionLoading(tripId)
    setStatus(`A executar: ${actionName}...`)
    addLog(`Clique: ${actionName}`, 'action')
    try {
      const res = await action()
      setDriverActiveTripId(tripId)
      setStatus(STATUS_CONFIG[res.status]?.label ?? res.status)
      addLog(`${actionName} concluído (${res.status})`, 'success')
      if (actionName === 'ACEITAR') sonnerToast.success('Viagem aceite')
      onSuccess?.()
      refetchHistory()
      refetchAvailable()
    } catch (err: unknown) {
      const e = err as { status?: number; detail?: string }
      if (e?.status === 409) {
        setToast('Viagem já foi aceite por outro motorista.')
        addLog('409: Viagem já aceite por outro motorista', 'error')
        refetchAvailable()
      } else {
        setError(e?.detail ?? 'Erro')
        setStatus('Erro')
        addLog(`Erro ${actionName}: ${e?.detail ?? 'Erro'}`, 'error')
      }
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <ScreenContainer
      bottomButton={
        activeTripId ? (
          <ActiveTripActions
            tripId={activeTripId}
            token={token!}
            addLog={addLog}
            setStatus={setStatus}
            onComplete={() => {
              setDriverActiveTripId(null)
              setStatus('Pronto')
              refetchHistory()
              refetchAvailable()
            }}
            onError={setError}
          />
        ) : undefined
      }
    >
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Motorista</h1>
        <p className="text-foreground/80 mt-1 text-base">
          O valor mostrado no pedido é <strong>estimativa</strong>; o passageiro paga o <strong>preço final</strong>{' '}
          no fim.
        </p>
      </header>

      <DevTools lastCreatedTripId={null} onAssigned={refetchAvailable} mode="driver" />

      {geolocationUsedFallback && (
        <div className="rounded-lg bg-warning/20 border border-warning/50 px-3 py-2 text-sm text-warning">
          A usar Oeiras (localização indisponível). Para não pedir permissão no próximo carregamento, ativa{' '}
          <strong>Demo Oeiras</strong> em ▶ Dev.
        </div>
      )}

      <div className="space-y-6 transition-opacity duration-150">
        <Toggle
          label="Estado"
          checked={!offline}
          onChange={(checked) => {
            setOffline(!checked)
            addLog(checked ? 'Toggle: Disponível' : 'Toggle: Offline', 'info')
            setStatus(checked ? 'Disponível' : 'Offline')
          }}
          onLabel="Disponível"
          offLabel="Offline"
        />

        {toast && (
          <div className="rounded-xl bg-warning/30 border border-warning/50 px-4 py-3 text-warning text-base animate-toast-enter">
            {toast}
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-destructive text-base">
            {error}
          </div>
        )}

        {!offline && (
          <MapView
            driverLocation={driverLocation ?? undefined}
            mapVisualWeight={
              activeTripId || (available && available.length > 0) ? 'subdued' : 'emphasized'
            }
          />
        )}

        {offline && (
          <div className="py-12 text-center">
            <p className="text-foreground/85 text-lg">Está offline.</p>
            <p className="text-foreground/75 mt-2">Ative para receber viagens.</p>
          </div>
        )}

        {!offline && !activeTripId && (
          <>
            <StatusHeader
              label={
                available && available.length > 0
                  ? `${available.length} viagem(ns) disponível(eis)`
                  : 'À espera de viagens'
              }
              variant="idle"
              emphasis={available && available.length > 0 ? 'subdued' : 'primary'}
            />
            {available && available.length > 0 ? (
              <ul className="space-y-4">
                {available.map((t: TripAvailableItem) => (
                  <li key={t.trip_id}>
                    <RequestCard
                      pickup={formatPickup(t.origin_lat, t.origin_lng)}
                      estimatedPrice={t.estimated_price}
                      onAccept={() =>
                        runAction(
                          () => acceptTrip(t.trip_id, token!),
                          t.trip_id,
                          'ACEITAR',
                          () => setDriverActiveTripId(t.trip_id)
                        )
                      }
                      loading={actionLoading === t.trip_id}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-8 text-center text-foreground/80">
                <p className="text-base">Nenhuma viagem disponível.</p>
                <p className="text-sm mt-1">Ative para receber novas viagens.</p>
              </div>
            )}
          </>
        )}

        {activeTripId && (
          <ActiveTripSummary
            tripId={activeTripId}
            token={token!}
            onTripCancelled={() => {
              setDriverActiveTripId(null)
              setStatus('Pronto')
              refetchAvailable()
              refetchHistory()
            }}
          />
        )}

        {history && history.length > 0 && (
          <section className="pt-6 mt-6 border-t border-border">
            <h2 className="text-base font-medium text-foreground/75 mb-3">Histórico</h2>
            <ul className="space-y-2">
              {history.slice(0, 5).map((t: TripHistoryItem) => (
                <li
                  key={t.trip_id}
                  className="flex justify-between items-center py-2 border-b border-border last:border-0 transition-opacity duration-150"
                >
                  <span className="text-base text-foreground/85">
                    {formatPickup(t.origin_lat, t.origin_lng)} →{' '}
                    {formatDestination(t.destination_lat, t.destination_lng)}
                  </span>
                  <span className="font-medium text-foreground">
                    {t.final_price != null ? `${t.final_price} €` : '—'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </ScreenContainer>
  )
}

function ActiveTripSummary({
  tripId,
  token,
  onTripCancelled,
}: {
  tripId: string
  token: string
  onTripCancelled: () => void
}) {
  const fetchTrip = useCallback(() => getDriverTripDetail(tripId, token), [tripId, token])
  const { data: trip } = usePolling(
    fetchTrip,
    [tripId, token],
    !!tripId && !!token,
    2000
  )
  const status = trip?.status ?? 'accepted'

  useEffect(() => {
    if (trip?.status === 'cancelled') {
      onTripCancelled()
    }
  }, [trip?.status, onTripCancelled])

  const config = STATUS_CONFIG[status] ?? { label: status, variant: 'idle' as const }

  return (
    <div className="space-y-4 px-4 py-4 rounded-2xl border border-border bg-card shadow-card transition-all duration-200 ease-out">
      <StatusHeader label={config.label} variant={config.variant} emphasis="primary" />
      {trip && (
        <TripCard
          pickup={formatPickup(trip.origin_lat, trip.origin_lng)}
          destination={formatDestination(trip.destination_lat, trip.destination_lng)}
          price={trip.final_price ?? trip.estimated_price ?? 0}
          estimateFallback="4–6"
          priceCaption={
            trip.status === 'completed' && trip.final_price != null
              ? 'Preço final'
              : 'Estimativa (indicativa)'
          }
        />
      )}
    </div>
  )
}

function ActiveTripActions({
  tripId,
  token,
  addLog,
  setStatus,
  onComplete,
  onError,
}: {
  tripId: string
  token: string
  addLog: (msg: string, type?: 'info' | 'success' | 'error' | 'action') => void
  setStatus: (msg: string) => void
  onComplete: () => void
  onError: (s: string) => void
}) {
  const fetchTrip = useCallback(() => getDriverTripDetail(tripId, token), [tripId, token])
  const { data: trip } = usePolling(
    fetchTrip,
    [tripId, token],
    !!tripId && !!token,
    2000
  )
  const status = trip?.status ?? 'accepted'
  const [loading, setLoading] = useState(false)

  const run = async (
    action: () => Promise<{ status: string }>,
    actionName: string
  ) => {
    setLoading(true)
    onError('')
    setStatus(`A executar: ${actionName}...`)
    addLog(`Clique: ${actionName}`, 'action')
    try {
      const res = await action()
      setStatus(STATUS_CONFIG[res.status]?.label ?? res.status)
      addLog(`${actionName} concluído (${res.status})`, 'success')
      if (res.status === 'completed') sonnerToast.success('Viagem concluída')
      if (res.status === 'completed' || res.status === 'cancelled') onComplete()
    } catch (err: unknown) {
      const msg = (err as { detail?: string })?.detail ?? 'Erro'
      onError(String(msg))
      setStatus('Erro')
      addLog(`Erro ${actionName}: ${msg}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'completed' || status === 'cancelled') return null

  const buttonConfig =
    status === 'accepted'
      ? { label: 'Cheguei', action: () => markArriving(tripId, token) }
      : status === 'arriving'
        ? { label: 'Iniciar viagem', action: () => startTrip(tripId, token) }
        : status === 'ongoing'
          ? { label: 'Concluir viagem', action: () => completeTrip(tripId, token) }
          : null

  if (!buttonConfig) return null

  const showCancel = status === 'accepted' || status === 'arriving'

  return (
    <div className="space-y-2">
      <PrimaryActionButton
        onClick={() => run(buttonConfig.action, buttonConfig.label)}
        disabled={loading}
        loading={loading}
      >
        {buttonConfig.label}
      </PrimaryActionButton>
      {showCancel && (
        <button
          type="button"
          onClick={() => run(() => cancelTripByDriver(tripId, token), 'Cancelar viagem')}
          disabled={loading}
          className="w-full text-muted-foreground text-base py-3 hover:text-destructive"
        >
          Cancelar viagem
        </button>
      )}
    </div>
  )
}
