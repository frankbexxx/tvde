import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useActivityLog } from '../../context/ActivityLogContext'
import { useActiveTrip } from '../../context/ActiveTripContext'
import { useDevToolsCallbacks } from '../../context/DevToolsCallbackContext'
import {
  getAvailableTrips,
  getDriverTripHistory,
  getDriverTripDetail,
  acceptTrip,
  rejectDriverOffer,
  getDriverVehicleCategories as getDriverVehicleCategoriesApi,
  patchDriverVehicleCategories as patchDriverVehicleCategoriesApi,
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
  historyStatusDotColor,
} from '../../constants/tripStatus'
import { passengerTripStatusLabel, paymentStatusLabel } from '../../constants/tripStatusLabels'
import { buildMockDriverApproachPath } from '../../dev/buildMockApproachPath'
import { isMockLocationModeEnabled } from '../../dev/mockLocation'
import { MOCK_DRIVER_START } from '../../dev/mockPositions'
import { startTripSimulation } from '../../dev/tripSimulation'
import { useGeolocation } from '../../hooks/useGeolocation'
import { useDriverLocationReporter } from '../../hooks/useDriverLocationReporter'
import {
  fetchDriverLastServerLocation,
  sendDriverLocation,
} from '../../services/locationService'
import { getRoute } from '../../services/routingService'
import { ScreenContainer } from '../../components/layout/ScreenContainer'
import { StatusHeader } from '../../components/layout/StatusHeader'
import { Button } from '../../components/ui/button'
import { Spinner } from '../../components/ui/Spinner'
import { Toggle } from '../../components/ui/Toggle'
import { RequestCard } from '../../components/cards/RequestCard'
import { TripCard } from '../../components/cards/TripCard'
import { ActiveTripActions } from './ActiveTripActions'
import { formatPickup, formatDestination } from '../../utils/format'
import {
  DRIVER_START_TRIP_MAX_DISTANCE_M,
  isWithinHaversineM,
} from '../../utils/geo'
import { MapView } from '../../maps/MapView'
import { toast as sonnerToast } from 'sonner'
import { BetaAccountPanel } from '../account/BetaAccountPanel'
import {
  getDriverNavApp,
  setDriverNavApp,
  type DriverNavApp,
} from '../../services/driverNavPreference'
import {
  getDriverVehicleCategories,
  setDriverVehicleCategories,
  normalizeDriverVehicleCategory,
  driverVehicleCategoryLabel,
  type DriverVehicleCategory,
} from '../../services/driverVehicleCategories'
import { getStoredSessionDisplayName } from '../../utils/authStorage'

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
  const {
    position: geoDriverPosition,
    usedFallback: geolocationUsedFallback,
    retry: retryGeolocation,
  } = useGeolocation({
    mockRole: 'driver',
  })
  const [mockSimulatedPosition, setMockSimulatedPosition] = useState<{
    lat: number
    lng: number
  } | null>(null)
  const [mockStableRouteEndpoints, setMockStableRouteEndpoints] = useState<{
    from: { lat: number; lng: number }
    to: { lat: number; lng: number }
  } | null>(null)
  const tripSimStopRef = useRef<(() => void) | null>(null)
  /** Invalida `getRoute` / arranque da simulação se a viagem terminar ou for cancelada antes do async acabar. */
  const mockApproachGenRef = useRef(0)
  /** Pickup + destino da viagem aceite (para fase 2 mock pickup→destino). */
  const acceptedTripGeoRef = useRef<{
    pickup: { lat: number; lng: number }
    destination: { lat: number; lng: number }
  } | null>(null)

  const driverLocation = mockSimulatedPosition ?? geoDriverPosition
  const driverLocationRef = useRef(driverLocation ?? null)
  useEffect(() => {
    driverLocationRef.current = driverLocation ?? null
  }, [driverLocation])
  const [offline, setOffline] = useState(getStoredOffline)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [driverNavPref, setDriverNavPref] = useState<DriverNavApp>(() => getDriverNavApp())
  const [vehicleCategories, setVehicleCategories] = useState<DriverVehicleCategory[]>(() =>
    getDriverVehicleCategories()
  )
  const [menuOpen, setMenuOpen] = useState(false)
  const [actionTakingLong, setActionTakingLong] = useState(false)
  /** P3: resposta da última ação até o poll alinhar (evita atraso visual). */
  const [driverStatusOverride, setDriverStatusOverride] = useState<string | null>(null)
  /** P25: última informação conhecida se o poll falhar logo após aceitar. */
  const [acceptedDetailFallback, setAcceptedDetailFallback] = useState<TripDetailResponse | null>(null)
  const isOnline = useOnlineStatus()
  const sessionDisplayName = useMemo(() => getStoredSessionDisplayName(), [])

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
  const availableWithCategoryMeta = useMemo(() => {
    return (available ?? []).map((trip) => {
      const raw = Array.isArray(trip.vehicle_categories) && trip.vehicle_categories.length > 0
        ? trip.vehicle_categories
        : trip.vehicle_category
          ? [trip.vehicle_category]
          : []
      const normalized = raw
        .map((c) => normalizeDriverVehicleCategory(c))
        .filter((c): c is DriverVehicleCategory => c != null)
      return {
        trip,
        categories: normalized,
      }
    })
  }, [available])

  const hasAnyCategoryAwareOffer = availableWithCategoryMeta.some((x) => x.categories.length > 0)
  const filteredAvailable = useMemo(() => {
    return availableWithCategoryMeta
      .filter(({ categories }) => categories.length === 0 || categories.some((c) => vehicleCategories.includes(c)))
      .map((x) => x.trip)
  }, [availableWithCategoryMeta, vehicleCategories])
  const filteredOutCount = Math.max(0, (available?.length ?? 0) - filteredAvailable.length)
  const hasAvailableTrips = filteredAvailable.length > 0
  const compactDriverSurface = !activeTripId && !offline && hasAvailableTrips

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

  const gpsReport = useDriverLocationReporter({
    enabled: !offline && !!token && !!driverLocation,
    accessToken: token,
    lat: driverLocation?.lat,
    lng: driverLocation?.lng,
    hasActiveTrip: !!activeTripId,
  })

  const [serverLoc, setServerLoc] = useState<{ lat: number; lng: number; timestamp: number } | null>(null)
  const [serverLocErr, setServerLocErr] = useState<{ status?: number; detail?: string } | null>(null)
  useEffect(() => {
    if (offline || !token) return
    let cancelled = false
    const tick = () => {
      void fetchDriverLastServerLocation(token)
        .then((loc) => {
          if (cancelled) return
          setServerLoc(loc)
          setServerLocErr(null)
        })
        .catch((e: unknown) => {
          if (cancelled) return
          const err = e as { status?: number; detail?: string }
          setServerLocErr({ status: err?.status, detail: String(err?.detail ?? 'Erro') })
        })
    }
    tick()
    const id = window.setInterval(tick, 4000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [offline, token])

  useEffect(() => {
    return () => {
      tripSimStopRef.current?.()
      tripSimStopRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!activeTripId) {
      mockApproachGenRef.current += 1
      tripSimStopRef.current?.()
      tripSimStopRef.current = null
      setMockSimulatedPosition(null)
      setMockStableRouteEndpoints(null)
      acceptedTripGeoRef.current = null
    }
  }, [activeTripId])

  /** Fase 1 (approach) e fase 2 (pickup→destino): mesmo pipeline OSRM + buildMockDriverApproachPath + startTripSimulation. */
  const startMockOsrmLeg = useCallback((from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
    if (!isMockLocationModeEnabled()) return
    tripSimStopRef.current?.()
    tripSimStopRef.current = null
    mockApproachGenRef.current += 1
    const gen = mockApproachGenRef.current
    void (async () => {
      try {
        const osrm = await getRoute(from, to)
        if (gen !== mockApproachGenRef.current) return
        const path = buildMockDriverApproachPath(from, to, osrm)
        if (gen !== mockApproachGenRef.current) return
        setMockStableRouteEndpoints({ from, to })
        if (gen !== mockApproachGenRef.current) return
        tripSimStopRef.current = startTripSimulation({
          route: path,
          intervalMs: 1000,
          onUpdate: (pos) => {
            setMockSimulatedPosition(pos)
            void sendDriverLocation(pos.lat, pos.lng, token!)
          },
        })
      } catch {
        /* OSRM opcional; sem rota não arrancamos movimento */
      }
    })()
  }, [token])

  useEffect(() => {
    setStoredOffline(offline)
  }, [offline])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    void getDriverVehicleCategoriesApi(token)
      .then((res) => {
        if (cancelled) return
        const next = res.categories
          .map((c) => normalizeDriverVehicleCategory(c))
          .filter((c): c is DriverVehicleCategory => c != null)
        if (next.length === 0) return
        setVehicleCategories(next)
        setDriverVehicleCategories(next)
      })
      .catch(() => {
        /* fallback local */
      })
    return () => {
      cancelled = true
    }
  }, [token])

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
    const optimisticAccept = actionName === 'ACEITAR'
    if (optimisticAccept) {
      setDriverActiveTripId(tripId)
      if (availableForFallback) {
        setAcceptedDetailFallback(
          tripDetailFallbackFromAccept(availableForFallback, 'accepted')
        )
      }
      setDriverStatusOverride('accepted')
    }
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
      if (actionName === 'ACEITAR' && availableForFallback) {
        acceptedTripGeoRef.current = {
          pickup: {
            lat: availableForFallback.origin_lat,
            lng: availableForFallback.origin_lng,
          },
          destination: {
            lat: availableForFallback.destination_lat,
            lng: availableForFallback.destination_lng,
          },
        }
      }
      // Fase 1 mock: MOCK_DRIVER_START → pickup (só DEV + mock, após ACEITAR).
      if (
        actionName === 'ACEITAR' &&
        isMockLocationModeEnabled() &&
        availableForFallback
      ) {
        const pickup = {
          lat: availableForFallback.origin_lat,
          lng: availableForFallback.origin_lng,
        }
        startMockOsrmLeg({ lat: MOCK_DRIVER_START.lat, lng: MOCK_DRIVER_START.lng }, pickup)
      }
      onSuccess?.()
      refetchHistory()
      refetchAvailable()
    } catch (err: unknown) {
      const e = err as { status?: number; detail?: string }
      if (optimisticAccept) {
        setDriverActiveTripId(null)
        setAcceptedDetailFallback(null)
        setDriverStatusOverride(null)
      }
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

  const runRejectOffer = async (offerId: string, tripId: string) => {
    if (actionLoading != null || !token) return
    if (!window.confirm('Recusar esta oferta? A viagem pode ser atribuída a outro motorista.')) return
    setError(null)
    setActionLoading(`reject:${tripId}`)
    setStatus('A recusar oferta…')
    addLog('Clique: REJEITAR', 'action')
    try {
      await rejectDriverOffer(offerId, token)
      sonnerToast.success('Oferta recusada')
      addLog('REJEITAR concluído', 'success')
      refetchAvailable()
      setStatus('Pronto')
    } catch (err: unknown) {
      const e = err as { status?: number; detail?: string }
      const msg = isTimeoutLikeError(err) || e?.status === 0
        ? 'Sem ligação ou o pedido demorou demasiado. Verifica a rede e tenta de novo.'
        : String(e?.detail ?? 'Erro')
      setError(msg)
      setStatus('Erro')
      addLog(`Erro REJEITAR: ${msg}`, 'error')
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
            tripDetailFallback={acceptedDetailFallback}
            driverLocation={driverLocation ?? null}
            addLog={addLog}
            setStatus={setStatus}
            statusOverride={driverStatusOverride}
            onClearStatusOverride={() => setDriverStatusOverride(null)}
            onTripActionSuccess={(s) => {
              setDriverStatusOverride(s)
              // Fase 2 mock: pickup → destino (após «Iniciar viagem» → ongoing). Mesmo motor que fase 1.
              if (s === 'ongoing' && isMockLocationModeEnabled()) {
                const beginPickupToDest = (
                  pickup: { lat: number; lng: number },
                  destination: { lat: number; lng: number }
                ) => {
                  tripSimStopRef.current?.()
                  tripSimStopRef.current = null
                  const pos = driverLocationRef.current
                  const nearPickup =
                    pos != null &&
                    isWithinHaversineM(pos, pickup, DRIVER_START_TRIP_MAX_DISTANCE_M)
                  if (!nearPickup) {
                    setMockSimulatedPosition(pickup)
                    void sendDriverLocation(pickup.lat, pickup.lng, token!)
                  }
                  const routeFrom = nearPickup && pos ? pos : pickup
                  window.setTimeout(() => {
                    startMockOsrmLeg(routeFrom, destination)
                  }, 200)
                }
                const legs = acceptedTripGeoRef.current
                if (legs) {
                  beginPickupToDest(legs.pickup, legs.destination)
                } else if (token && activeTripId) {
                  const genSnapshot = mockApproachGenRef.current
                  void (async () => {
                    try {
                      const d = await getDriverTripDetail(activeTripId, token)
                      if (genSnapshot !== mockApproachGenRef.current) return
                      beginPickupToDest(
                        { lat: d.origin_lat, lng: d.origin_lng },
                        { lat: d.destination_lat, lng: d.destination_lng }
                      )
                    } catch {
                      /* sem detalhe não há fase 2 */
                    }
                  })()
                }
              }
            }}
            onComplete={() => {
              tripSimStopRef.current?.()
              tripSimStopRef.current = null
              setMockSimulatedPosition(null)
              setMockStableRouteEndpoints(null)
              acceptedTripGeoRef.current = null
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
      <header className="mb-4 flex items-start justify-between gap-3">
        <p className="text-foreground/80 text-sm leading-snug">
          O valor mostrado no pedido é <strong>estimativa</strong>; o passageiro paga o <strong>preço final</strong>{' '}
          no fim.
        </p>
        <button
          type="button"
          data-testid="driver-open-menu"
          onClick={() => setMenuOpen((v) => !v)}
          className="min-h-[44px] shrink-0 rounded-xl border border-border px-3 text-sm font-semibold text-foreground hover:bg-muted/50 touch-manipulation"
        >
          {menuOpen ? 'Fechar menu' : 'Menu'}
        </button>
      </header>

      {menuOpen ? (
        <DriverOperationsMenu
          sessionDisplayName={sessionDisplayName}
          history={history}
          navPref={driverNavPref}
          vehicleCategories={vehicleCategories}
          onCloseMenu={() => setMenuOpen(false)}
          onSelectNavPref={(app) => {
            setDriverNavApp(app)
            setDriverNavPref(app)
            addLog(
              app === 'waze' ? 'Preferência navegação: Waze' : 'Preferência navegação: Google Maps',
              'info'
            )
          }}
          onToggleVehicleCategory={(category) => {
            setVehicleCategories((prev) => {
              const exists = prev.includes(category)
              // Garantimos que o motorista mantém sempre pelo menos 1 categoria ativa.
              const next = exists
                ? prev.filter((c) => c !== category)
                : [...prev, category]
              const safe = next.length > 0 ? next : prev
              setDriverVehicleCategories(safe)
              if (token) {
                void patchDriverVehicleCategoriesApi(token, safe).catch(() => {
                  /* keep local preference even if backend fails */
                })
              }
              return safe
            })
          }}
          onReportIncident={(tripId) => {
            const note = window.prompt(
              'Reportar ocorrência (texto curto):\n\nEx.: objeto esquecido, comportamento, tarifa.'
            )
            if (!note || !note.trim()) return
            sonnerToast.success(`Ocorrência guardada localmente para a viagem ${tripId.slice(0, 8)}…`)
            addLog(`Ocorrência registada para ${tripId}: ${note.trim()}`, 'info')
          }}
        />
      ) : null}

      {import.meta.env.DEV && isMockLocationModeEnabled() && !(hasAvailableTrips && !activeTripId) ? (
        <div className="rounded-xl bg-violet-100 dark:bg-violet-500/15 border border-violet-300 dark:border-violet-400/40 px-3 py-2 text-sm text-violet-800 dark:text-violet-200">
          <span aria-hidden>🧪</span> Simulação — após aceitar: até à recolha; após «Iniciar viagem»: até ao destino (OSRM, 1&nbsp;s por ponto).
        </div>
      ) : null}

      {geolocationUsedFallback && (
        <div
          className="rounded-xl bg-warning/20 border border-warning/50 border-l-4 px-3 py-2 text-sm text-warning"
          style={{ borderLeftColor: 'hsl(var(--color-flag-yellow, 42 100% 54%))' }}
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Localização indisponível — a usar posição aproximada.</span>
            <button
              type="button"
              onClick={retryGeolocation}
              className="inline-flex items-center min-h-[28px] px-2.5 rounded-md border border-warning/50 bg-warning/10 hover:bg-warning/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning/60 focus-visible:ring-offset-2 text-warning font-medium text-xs touch-manipulation transition-colors"
            >
              Tentar outra vez
            </button>
          </div>
          {import.meta.env.DEV ? (
            <div className="mt-1">
              Para testar sem permissão de localização, ativa <strong>Demo Oeiras</strong> em{' '}
              <strong>Configuração</strong> (ícone de engrenagem).
            </div>
          ) : null}
        </div>
      )}

      {!offline && !!token && !!driverLocation && (
        <div className="rounded-xl bg-foreground/5 border border-foreground/15 px-3 py-2 text-xs text-foreground/75">
          {gpsReport.lastError ? (
            <div className="flex flex-col gap-1.5">
              <p className="font-medium text-foreground/90">
                GPS upload: erro {gpsReport.lastError.status ?? ''}
              </p>
              <p>{String(gpsReport.lastError.detail ?? 'Pedido de localização foi recusado.')}</p>
              {gpsReport.lastError.request_id ? (
                <p className="font-mono text-[11px] text-foreground/60">
                  request_id {gpsReport.lastError.request_id}
                </p>
              ) : null}
            </div>
          ) : (
            <p>
              GPS upload: {gpsReport.lastOkAt ? 'ok' : 'a iniciar…'}
            </p>
          )}
          <details className="mt-1">
            <summary className="cursor-pointer select-none text-[11px] text-foreground/65">
              Diagnóstico técnico
            </summary>
            {serverLoc ? (
              <p className="mt-1 text-[11px] text-foreground/65">
                Servidor: {serverLoc.lat.toFixed(5)},{' '}
                {serverLoc.lng.toFixed(5)} (age ~{Math.max(0, Math.round((Date.now() - serverLoc.timestamp) / 1000))}s)
              </p>
            ) : serverLocErr ? (
              <p className="mt-1 text-[11px] text-foreground/65">
                Servidor: erro {serverLocErr.status ?? ''} {serverLocErr.detail ?? ''}
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-foreground/65">Servidor: a obter…</p>
            )}
          </details>
        </div>
      )}

      {!isOnline && (
        <div className="rounded-xl bg-warning/15 border border-warning/40 px-3 py-2 text-sm text-foreground">
          <p className="font-medium text-foreground">Sem ligação à internet</p>
          <p className="text-foreground/80 mt-1">
            Quando voltares a ficar online, a app volta a atualizar. Podes recarregar a página se precisares.
          </p>
        </div>
      )}

      {pollEnabled && availablePollFault && (
        <div className="rounded-xl bg-warning/15 border border-warning/40 px-3 py-2 text-sm text-foreground">
          Não foi possível atualizar a lista de viagens. A última informação mantém-se; voltamos a tentar
          automaticamente — verifica a ligação se persistir.
        </div>
      )}

      <div className="space-y-4 transition-opacity duration-150">
        {!activeTripId ? (
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
        ) : null}

        {toast && (
          <div className="relative rounded-xl bg-warning/30 border border-warning/50 px-4 py-3 pr-14 text-warning text-base animate-toast-enter touch-manipulation">
            <button
              type="button"
              className="absolute right-2 top-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg border border-warning/50 bg-background/80 text-warning text-xl font-medium leading-none hover:bg-background touch-manipulation"
              aria-label="Fechar aviso"
              onClick={() => setToast(null)}
            >
              ×
            </button>
            <p className="leading-snug">{toast}</p>
          </div>
        )}

        {error && (
          <div className="relative rounded-xl bg-destructive/10 border border-destructive/30 border-l-4 border-l-destructive px-4 py-3 pr-14 text-destructive text-base touch-manipulation">
            <button
              type="button"
              className="absolute right-2 top-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg border border-destructive/40 bg-background/80 text-destructive text-xl font-medium leading-none hover:bg-background touch-manipulation"
              aria-label="Fechar mensagem de erro"
              onClick={() => setError(null)}
            >
              ×
            </button>
            <p className="leading-snug">{error}</p>
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
            route={
              import.meta.env.DEV &&
              isMockLocationModeEnabled() &&
              mockStableRouteEndpoints &&
              activeTripId
                ? mockStableRouteEndpoints
                : undefined
            }
            mapVisualWeight={
              activeTripId || (available && available.length > 0) ? 'subdued' : 'emphasized'
            }
            compactHeight={compactDriverSurface}
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
                hasAvailableTrips
                  ? `${filteredAvailable.length} viagem(ns) disponível(eis)`
                  : 'À espera de viagens'
              }
              variant="idle"
              emphasis={hasAvailableTrips ? 'subdued' : 'primary'}
            />
            {pollEnabled && availableLoading && available == null ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-foreground/80">
                <Spinner size="md" />
                <p className="text-sm">A carregar viagens…</p>
              </div>
            ) : hasAvailableTrips ? (
              <ul className="space-y-4">
                {filteredAvailable.map((t: TripAvailableItem) => (
                  <li key={t.trip_id}>
                    <RequestCard
                      contextHint={DRIVER_NEW_TRIP_LIST_HINT}
                      pickup={formatPickup(t.origin_lat, t.origin_lng)}
                      destination={formatDestination(t.destination_lat, t.destination_lng)}
                      statusLabel={DRIVER_AVAILABLE_TRIP_STATUS_LABEL}
                      vehicleCategoryLabel={(() => {
                        const one = normalizeDriverVehicleCategory(t.vehicle_category ?? undefined)
                        return one ? driverVehicleCategoryLabel(one) : null
                      })()}
                      estimatedPrice={t.estimated_price}
                      offerId={t.offer_id ?? null}
                      onReject={
                        t.offer_id
                          ? () => void runRejectOffer(t.offer_id!, t.trip_id)
                          : undefined
                      }
                      acceptButtonTestId={`driver-accept-${t.trip_id}`}
                      rejectButtonTestId={`driver-reject-${t.trip_id}`}
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
                      rejectLoading={actionLoading === `reject:${t.trip_id}`}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-8 text-center text-foreground/80">
                <p className="text-base">Sem viagens disponíveis.</p>
                <p className="text-sm mt-1">
                  {hasAnyCategoryAwareOffer && filteredOutCount > 0
                    ? `Existem ${filteredOutCount} viagem(ns) fora das tuas categorias ativas.`
                    : 'Fica disponível para receberes novos pedidos.'}
                </p>
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
              tripSimStopRef.current?.()
              tripSimStopRef.current = null
              setMockSimulatedPosition(null)
              setMockStableRouteEndpoints(null)
              acceptedTripGeoRef.current = null
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

        {!hasAvailableTrips && history && history.length > 0 && (
          <section className="pt-6 mt-6 border-t border-border">
            <h2 className="text-base font-medium text-foreground/75 mb-3">Histórico</h2>
            <ul className="space-y-2">
              {history.slice(0, 5).map((t: TripHistoryItem) => (
                <li
                  key={t.trip_id}
                  className="flex justify-between items-center gap-3 py-2 border-b border-border last:border-0 transition-opacity duration-150"
                >
                  <span className="flex items-center gap-2 text-base text-foreground/85 min-w-0">
                    <span
                      aria-hidden="true"
                      className={`h-2 w-2 rounded-full shrink-0 ${historyStatusDotColor(t.status)}`}
                    />
                    <span className="truncate">
                      {formatPickup(t.origin_lat, t.origin_lng)} →{' '}
                      {formatDestination(t.destination_lat, t.destination_lng)}
                    </span>
                  </span>
                  <span className="font-medium text-foreground shrink-0">
                    {t.final_price != null ? `${t.final_price} €` : '—'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {token ? <BetaAccountPanel /> : null}
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
        <span className="inline-block rounded-full bg-primary text-primary-foreground text-xs font-semibold px-3 py-1">
          {driverTripBadgeShort(displayStatus)}
        </span>
      </p>
      {(tripPollFootnote || fallbackFootnote) ? (
        <p className="text-center text-sm text-foreground/75 -mt-3 mb-1 min-h-[1.25rem]" aria-live="polite">
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

function formatDriverHistoryWhen(iso: string | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('pt-PT', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function driverHistoryPriceLabel(t: TripHistoryItem): string {
  const v = t.final_price ?? t.estimated_price
  if (v == null || Number.isNaN(Number(v))) return '—'
  return `${Number(v).toFixed(2)} €`
}

function DriverOperationsMenu({
  sessionDisplayName,
  history,
  navPref,
  vehicleCategories,
  onCloseMenu,
  onSelectNavPref,
  onToggleVehicleCategory,
  onReportIncident,
}: {
  sessionDisplayName: string | null
  history: TripHistoryItem[] | null
  navPref: DriverNavApp
  vehicleCategories: DriverVehicleCategory[]
  onCloseMenu: () => void
  onSelectNavPref: (app: DriverNavApp) => void
  onToggleVehicleCategory: (category: DriverVehicleCategory) => void
  onReportIncident: (tripId: string) => void
}) {
  const { isAdmin } = useAuth()
  const now = new Date()
  const startOfThisWeek = new Date(now)
  const day = startOfThisWeek.getDay()
  const shift = day === 0 ? 6 : day - 1
  startOfThisWeek.setDate(startOfThisWeek.getDate() - shift)
  startOfThisWeek.setHours(0, 0, 0, 0)
  const startOfLastWeek = new Date(startOfThisWeek)
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7)

  const completedTrips = (history ?? []).filter((t) => t.status === 'completed' && t.completed_at)
  const thisWeekRevenue = completedTrips.reduce((sum, t) => {
    const when = t.completed_at ? new Date(t.completed_at) : null
    if (!when || when < startOfThisWeek) return sum
    return sum + (t.final_price ?? t.estimated_price ?? 0)
  }, 0)
  const lastWeekRevenue = completedTrips.reduce((sum, t) => {
    const when = t.completed_at ? new Date(t.completed_at) : null
    if (!when || when < startOfLastWeek || when >= startOfThisWeek) return sum
    return sum + (t.final_price ?? t.estimated_price ?? 0)
  }, 0)
  const closedTrips = (history ?? []).filter((t) => t.status === 'completed' || t.status === 'cancelled').length
  const cancelledTrips = (history ?? []).filter((t) => t.status === 'cancelled').length
  const cancelRate = closedTrips > 0 ? Math.round((cancelledTrips / closedTrips) * 100) : 0

  return (
    <section
      className="mb-2 rounded-2xl border border-border/80 bg-card p-4 space-y-4 shadow-card"
      data-testid="driver-ops-menu"
      aria-label="Menu do motorista"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Menu do motorista</h2>
          <p className="text-sm text-foreground/75">
            {sessionDisplayName ?? 'Motorista'} · canceladas após aceitar: {cancelRate}%
          </p>
        </div>
        <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-foreground/75">
          Rating: em breve
        </span>
      </div>

      <div className="rounded-xl border border-border bg-background px-3 py-3 space-y-2">
        <p className="text-sm font-medium text-foreground">Rendimentos</p>
        <p className="text-xs text-muted-foreground">Totais operacionais (estimativa) por semana.</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border/70 bg-card px-3 py-2">
            <p className="text-[11px] text-foreground/70">Semana atual</p>
            <p className="text-base font-semibold text-foreground">{thisWeekRevenue.toFixed(2)} €</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-card px-3 py-2">
            <p className="text-[11px] text-foreground/70">Semana anterior</p>
            <p className="text-base font-semibold text-foreground">{lastWeekRevenue.toFixed(2)} €</p>
          </div>
        </div>
        {completedTrips.length === 0 ? (
          <p className="text-xs text-muted-foreground leading-snug">
            Sem viagens concluídas a contar para já — os totais actualizam quando concluíres viagens com data
            de fim.
          </p>
        ) : null}
      </div>

      <div className="rounded-xl border border-border bg-background px-3 py-3 space-y-2">
        <p className="text-sm font-medium text-foreground">Navegação (preferência)</p>
        <p className="text-xs text-muted-foreground">
          Os botões «Recolha / Destino» usam primeiro esta app; o segundo botão abre a alternativa.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            data-testid="driver-nav-pref-waze"
            onClick={() => onSelectNavPref('waze')}
            className={`min-h-[44px] flex-1 rounded-lg border px-2 text-sm font-semibold touch-manipulation transition-colors ${
              navPref === 'waze'
                ? 'border-info bg-info/15 text-foreground'
                : 'border-border bg-background text-foreground/80 hover:bg-muted/50'
            }`}
          >
            Waze
          </button>
          <button
            type="button"
            data-testid="driver-nav-pref-google"
            onClick={() => onSelectNavPref('google_maps')}
            className={`min-h-[44px] flex-1 rounded-lg border px-2 text-sm font-semibold touch-manipulation transition-colors ${
              navPref === 'google_maps'
                ? 'border-info bg-info/15 text-foreground'
                : 'border-border bg-background text-foreground/80 hover:bg-muted/50'
            }`}
          >
            Google Maps
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background px-3 py-3 space-y-2">
        <p className="text-sm font-medium text-foreground">Categorias de veículo</p>
        <p className="text-xs text-muted-foreground leading-snug">
          Sincroniza com o servidor e filtra os pedidos que vês na lista. Mantém pelo menos uma categoria
          activa.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['x', 'X'],
              ['xl', 'XL'],
              ['pet', 'Pet'],
              ['comfort', 'Comfort'],
              ['black', 'Black'],
              ['electric', 'Elétrico'],
              ['van', 'Van'],
            ] as Array<[DriverVehicleCategory, string]>
          ).map(([key, label]) => {
            const active = vehicleCategories.includes(key)
            return (
              <button
                key={key}
                type="button"
                data-testid={`driver-category-${key}`}
                aria-pressed={active}
                onClick={() => onToggleVehicleCategory(key)}
                className={`min-h-[40px] rounded-lg border px-2 text-xs font-semibold touch-manipulation transition-colors ${
                  active
                    ? 'border-info bg-info/15 text-foreground'
                    : 'border-border bg-background text-foreground/80 hover:bg-muted/50'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background px-3 py-3 space-y-2">
        <p className="text-sm font-medium text-foreground">Documentos e licenças</p>
        <p className="text-xs text-muted-foreground leading-snug">
          Validades e ficheiros oficiais gerem-se no painel da operação (admin). Esta app não duplica documentos
          sensíveis.
        </p>
        {isAdmin ? (
          <Button type="button" variant="outline" className="w-full min-h-[40px] text-sm font-medium" asChild>
            <Link to="/admin" onClick={() => onCloseMenu()}>
              Abrir painel admin
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="rounded-xl border border-border bg-background px-3 py-3 space-y-2">
        <p className="text-sm font-medium text-foreground">Histórico de viagens</p>
        {history && history.length > 0 ? (
          <ul className="space-y-2">
            {history.slice(0, 3).map((t) => (
              <li key={t.trip_id} className="rounded-lg border border-border/70 bg-card px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-xs font-medium text-foreground truncate">
                      #{t.trip_id.slice(0, 8)} · {passengerTripStatusLabel(t.status)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {t.completed_at
                        ? `${t.status === 'completed' ? 'Concluída' : 'Registo'} · ${formatDriverHistoryWhen(t.completed_at)}`
                        : t.status === 'completed'
                          ? 'Data de conclusão indisponível'
                          : 'Viagem ainda não concluída neste resumo'}
                    </p>
                    <p className="text-[11px] text-foreground/85">
                      {t.status === 'completed' ? 'Preço final' : 'Estimativa'}: {driverHistoryPriceLabel(t)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onReportIncident(t.trip_id)}
                    className="min-h-[32px] shrink-0 rounded-md border border-border px-2 text-xs font-medium text-foreground hover:bg-muted/50 touch-manipulation"
                  >
                    Reportar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">Sem viagens recentes no histórico.</p>
        )}
      </div>
    </section>
  )
}
