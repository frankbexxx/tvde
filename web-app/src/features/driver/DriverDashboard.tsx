import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useActivityLog } from '../../context/ActivityLogContext'
import { useActiveTrip } from '../../context/ActiveTripContext'
import { useDevToolsCallbacks } from '../../context/DevToolsCallbackContext'
import {
  getAvailableTrips,
  getDriverTripHistory,
  getDriverTripDetail,
  acceptTrip,
  setDriverOnline,
  setDriverOffline,
} from '../../api/trips'
import type {
  TripAvailableItem,
  TripDetailResponse,
  TripHistoryItem,
  TripStatus,
} from '../../api/trips'
import { isTimeoutLikeError } from '../../api/client'
import { usePolling } from '../../hooks/usePolling'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { usePollStallHint } from '../../hooks/usePollStallHint'
import {
  mergeDriverPolledWithOverride,
  tripStateRank,
  DRIVER_AVAILABLE_TRIP_STATUS_LABEL,
  DRIVER_NEW_TRIP_LIST_HINT,
  driverActiveTripUi,
  driverTripBadgeShort,
} from '../../constants/tripStatus'
import { paymentStatusLabel } from '../../constants/tripStatusLabels'
import { isMockLocationModeEnabled } from '../../dev/mockLocation'
import { useGeolocation } from '../../hooks/useGeolocation'
import { useDriverLocationReporter } from '../../hooks/useDriverLocationReporter'
import { ScreenContainer } from '../../components/layout/ScreenContainer'
import { StatusHeader } from '../../components/layout/StatusHeader'
import { Spinner } from '../../components/ui/Spinner'
import { Toggle } from '../../components/ui/Toggle'
import { RequestCard } from '../../components/cards/RequestCard'
import { TripCard } from '../../components/cards/TripCard'
import { ActiveTripActions } from './ActiveTripActions'
import { formatPickup, formatDestination } from '../../utils/format'
import { MapView } from '../../maps/MapView'
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

/** P25: detalhe mínimo até o GET /driver/trips/:id alinhar após aceitar. */
function tripDetailFallbackFromAccept(item: TripAvailableItem, status: TripStatus): TripDetailResponse {
  const now = new Date().toISOString()
  return {
    trip_id: item.trip_id,
    status,
    passenger_id: '',
    origin_lat: item.origin_lat,
    origin_lng: item.origin_lng,
    destination_lat: item.destination_lat,
    destination_lng: item.destination_lng,
    estimated_price: item.estimated_price,
    created_at: now,
    updated_at: now,
  }
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
  const [actionTakingLong, setActionTakingLong] = useState(false)
  /** P3: resposta da última ação até o poll alinhar (evita atraso visual). */
  const [driverStatusOverride, setDriverStatusOverride] = useState<string | null>(null)
  /** P25: última informação conhecida se o poll falhar logo após aceitar. */
  const [acceptedDetailFallback, setAcceptedDetailFallback] = useState<TripDetailResponse | null>(null)
  const isOnline = useOnlineStatus()

  const pollEnabled = !!token && !offline

  const {
    data: available,
    refetch: refetchAvailable,
    pollFault: availablePollFault,
    isLoading: availableLoading,
  } = usePolling(
    () => getAvailableTrips(token!),
    [token],
    pollEnabled,
    4000
  )
  const { data: history, refetch: refetchHistory, pollFault: historyPollFault } = usePolling(
    () => getDriverTripHistory(token!),
    [token],
    !!token,
    10000
  )

  const { setDriverOnAssigned } = useDevToolsCallbacks()
  useEffect(() => {
    const fn = () => {
      refetchHistory()
      refetchAvailable()
    }
    setDriverOnAssigned(fn)
    return () => setDriverOnAssigned(undefined)
  }, [setDriverOnAssigned, refetchHistory, refetchAvailable])

  useEffect(() => {
    if (!actionLoading) {
      setActionTakingLong(false)
      return
    }
    const id = window.setTimeout(() => setActionTakingLong(true), 12_000)
    return () => window.clearTimeout(id)
  }, [actionLoading])

  useDriverLocationReporter({
    enabled: !offline && !!token && !!driverLocation,
    lat: driverLocation?.lat,
    lng: driverLocation?.lng,
    hasActiveTrip: !!activeTripId,
  })

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
    onSuccess?: () => void,
    availableForFallback?: TripAvailableItem
  ) => {
    if (actionLoading != null) return
    setError(null)
    setActionLoading(tripId)
    setStatus(`A executar: ${actionName}...`)
    addLog(`Clique: ${actionName}`, 'action')
    try {
      const res = await action()
      setDriverActiveTripId(tripId)
      if (actionName === 'ACEITAR' && availableForFallback) {
        setAcceptedDetailFallback(
          tripDetailFallbackFromAccept(availableForFallback, res.status as TripStatus)
        )
      }
      setDriverStatusOverride(res.status)
      setStatus(driverActiveTripUi(res.status).label)
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
        const msg = isTimeoutLikeError(err) || e?.status === 0
          ? 'Sem ligação ou o pedido demorou demasiado. Verifica a rede e tenta de novo.'
          : String(e?.detail ?? 'Erro')
        setError(msg)
        setStatus('Erro')
        addLog(`Erro ${actionName}: ${msg}`, 'error')
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
            statusOverride={driverStatusOverride}
            onClearStatusOverride={() => setDriverStatusOverride(null)}
            onTripActionSuccess={(s) => setDriverStatusOverride(s)}
            onComplete={() => {
              setDriverStatusOverride(null)
              setAcceptedDetailFallback(null)
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

      {import.meta.env.DEV && isMockLocationModeEnabled() ? (
        <div className="rounded-lg bg-violet-100 dark:bg-violet-500/15 border border-violet-300 dark:border-violet-400/40 px-3 py-2 text-sm text-violet-800 dark:text-violet-200">
          <span aria-hidden>🧪</span> Simulação — posição mock (intervalo 1&nbsp;s). Rota de teste em Lisboa.
        </div>
      ) : null}

      {geolocationUsedFallback && (
        <div className="rounded-lg bg-warning/20 border border-warning/50 px-3 py-2 text-sm text-warning">
          A usar Oeiras (localização indisponível).
          {import.meta.env.DEV ? (
            <>
              {' '}
              Para testar sem permissão de localização, ativa <strong>Demo Oeiras</strong> em{' '}
              <strong>Configuração</strong> (ícone de engrenagem).
            </>
          ) : null}
        </div>
      )}

      {!isOnline && (
        <div className="rounded-lg bg-warning/15 border border-warning/40 px-3 py-2 text-sm text-foreground">
          <p className="font-medium text-foreground">Sem ligação à internet</p>
          <p className="text-foreground/80 mt-1">
            Quando voltares a ficar online, a app volta a atualizar. Podes recarregar a página se precisares.
          </p>
        </div>
      )}

      {pollEnabled && availablePollFault && (
        <div className="rounded-lg bg-warning/15 border border-warning/40 px-3 py-2 text-sm text-foreground">
          Não foi possível atualizar a lista de viagens. A última informação mantém-se; voltamos a tentar
          automaticamente — verifica a ligação se persistir.
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

        {actionLoading && actionTakingLong && (
          <p className="text-center text-sm text-foreground/70" aria-live="polite">
            Ainda a processar… Se demorar muito, verifica a ligação.
          </p>
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
            <p className="text-foreground/85 text-lg">Estás offline.</p>
            <p className="text-foreground/75 mt-2">Ativa a disponibilidade para receber viagens.</p>
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
            {pollEnabled && availableLoading && available == null ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-foreground/80">
                <Spinner size="md" />
                <p className="text-sm">A carregar viagens…</p>
              </div>
            ) : available && available.length > 0 ? (
              <ul className="space-y-4">
                {available.map((t: TripAvailableItem) => (
                  <li key={t.trip_id}>
                    <RequestCard
                      contextHint={DRIVER_NEW_TRIP_LIST_HINT}
                      pickup={formatPickup(t.origin_lat, t.origin_lng)}
                      destination={formatDestination(t.destination_lat, t.destination_lng)}
                      statusLabel={DRIVER_AVAILABLE_TRIP_STATUS_LABEL}
                      estimatedPrice={t.estimated_price}
                      onAccept={() =>
                        runAction(
                          () => acceptTrip(t.trip_id, token!),
                          t.trip_id,
                          'ACEITAR',
                          () => setDriverActiveTripId(t.trip_id),
                          t
                        )
                      }
                      loading={actionLoading === t.trip_id}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-8 text-center text-foreground/80">
                <p className="text-base">Sem viagens disponíveis.</p>
                <p className="text-sm mt-1">Fica disponível para receberes novos pedidos.</p>
              </div>
            )}
          </>
        )}

        {activeTripId && (
          <ActiveTripSummary
            tripId={activeTripId}
            token={token!}
            statusOverride={driverStatusOverride}
            detailFallback={acceptedDetailFallback}
            onDetailPollSuccess={() => setAcceptedDetailFallback(null)}
            onClearStatusOverride={() => setDriverStatusOverride(null)}
            onTripCancelled={() => {
              setDriverStatusOverride(null)
              setAcceptedDetailFallback(null)
              setDriverActiveTripId(null)
              setStatus('Pronto')
              refetchAvailable()
              refetchHistory()
            }}
          />
        )}

        {historyPollFault && (
          <div className="rounded-lg bg-warning/15 border border-warning/40 px-3 py-2 text-sm text-foreground">
            Não foi possível atualizar o histórico. Voltamos a tentar — verifica a ligação se o aviso persistir.
          </div>
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
  statusOverride,
  detailFallback,
  onDetailPollSuccess,
  onClearStatusOverride,
  onTripCancelled,
}: {
  tripId: string
  token: string
  statusOverride: string | null
  detailFallback: TripDetailResponse | null
  onDetailPollSuccess: () => void
  onClearStatusOverride: () => void
  onTripCancelled: () => void
}) {
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
  const fallbackConsumedRef = useRef(false)
  useEffect(() => {
    fallbackConsumedRef.current = false
  }, [tripId])

  useEffect(() => {
    if (trip && detailFallback && !fallbackConsumedRef.current) {
      fallbackConsumedRef.current = true
      onDetailPollSuccess()
    }
  }, [trip, detailFallback, onDetailPollSuccess])

  const effectiveTrip = trip ?? detailFallback
  const displayStatus = mergeDriverPolledWithOverride(
    effectiveTrip?.status,
    statusOverride,
    'accepted'
  )

  useEffect(() => {
    if (!statusOverride || !trip?.status) return
    if (tripStateRank(trip.status) >= tripStateRank(statusOverride)) {
      onClearStatusOverride()
    }
  }, [trip?.status, statusOverride, onClearStatusOverride])

  const tripPollStalled = usePollStallHint(
    tripLastSuccessAt,
    tripRefreshing,
    Boolean(tripId && token && trip)
  )
  const tripPollFootnote = tripPollFault
    ? 'Não foi possível atualizar agora. Verifica a ligação — voltamos a tentar de seguida.'
    : trip
      ? tripRefreshing
        ? 'A atualizar estado…'
        : tripPollStalled
          ? 'Sem novidades há instantes — a última informação mantém-se válida.'
          : null
      : null

  const fallbackFootnote =
    !trip && detailFallback
      ? 'A sincronizar com o servidor… A informação abaixo é a última que temos.'
      : null

  useEffect(() => {
    if (trip?.status === 'cancelled') {
      onTripCancelled()
    }
  }, [trip?.status, onTripCancelled])

  const config = driverActiveTripUi(displayStatus)

  if (!effectiveTrip && tripId && token) {
    return (
      <div className="space-y-4 px-4 py-4 rounded-2xl border border-border bg-card shadow-card">
        <StatusHeader label="A carregar viagem…" variant="idle" emphasis="primary" />
        <p className="text-center text-sm text-foreground/70">A obter detalhes atualizados.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 px-4 py-4 rounded-2xl border border-border bg-card shadow-card transition-all duration-200 ease-out">
      <StatusHeader label={config.label} variant={config.variant} emphasis="primary" />
      <p className="text-center -mt-2 mb-1">
        <span className="inline-block rounded-full bg-primary/15 text-primary text-xs font-semibold px-3 py-1">
          {driverTripBadgeShort(displayStatus)}
        </span>
      </p>
      {(tripPollFootnote || fallbackFootnote) ? (
        <p className="text-center text-xs text-foreground/55 -mt-3 mb-1 min-h-[1.25rem]" aria-live="polite">
          {tripPollFootnote ?? fallbackFootnote}
        </p>
      ) : null}
      {trip?.payment_status === 'failed' ? (
        <p className="text-sm text-destructive text-center px-2">
          Pagamento do passageiro recusado. Segue as instruções da plataforma ou do suporte.
        </p>
      ) : null}
      {displayStatus === 'completed' && trip?.payment_status && trip.payment_status !== 'failed' ? (
        <p className="text-sm text-foreground/80 text-center px-2">
          Pagamento do passageiro: {paymentStatusLabel(trip.payment_status)}
        </p>
      ) : null}
      {effectiveTrip && (
        <TripCard
          pickup={formatPickup(effectiveTrip.origin_lat, effectiveTrip.origin_lng)}
          destination={formatDestination(
            effectiveTrip.destination_lat,
            effectiveTrip.destination_lng
          )}
          price={effectiveTrip.final_price ?? effectiveTrip.estimated_price ?? 0}
          estimateFallback="4–6"
          priceCaption={
            displayStatus === 'completed' && effectiveTrip.final_price != null
              ? 'Preço final'
              : 'Estimativa (indicativa)'
          }
        />
      )}
    </div>
  )
}
