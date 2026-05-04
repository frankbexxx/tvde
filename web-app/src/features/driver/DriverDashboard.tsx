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
import {
  createDriverZoneSession,
  fetchOpenDriverZoneSession,
  getDriverZoneBudgetToday,
  getDriverZoneCatalog,
  postDriverZoneSessionArrived,
  postDriverZoneSessionCancel,
  postDriverZoneSessionRequestExtension,
  type DriverZoneBudgetToday,
  type DriverZoneCatalogItem,
  type DriverZoneSession,
} from '../../api/driverZones'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { Spinner } from '../../components/ui/Spinner'
import { Toggle } from '../../components/ui/Toggle'
import { RequestCard } from '../../components/cards/RequestCard'
import { TripCard } from '../../components/cards/TripCard'
import { CancellationReasonMuted } from '../../components/trips/CancellationReasonMuted'
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
import {
  driverDocumentLabel,
  driverDocumentsApprovedCount,
  driverDocumentStatusLabel,
  getDriverDocumentsState,
  isDriverDocumentsGateEnabled,
  isDriverDocumentsReady,
  REQUIRED_DRIVER_DOCUMENTS,
  setDriverDocumentsGateEnabled,
  setDriverDocumentsState,
  type DriverDocumentsState,
  type DriverDocumentStatus,
  type DriverRequiredDocument,
} from '../../services/driverDocuments'
import { getStoredSessionDisplayName } from '../../utils/authStorage'
import { isDriverBottomNavEnabled, isDriverHomeTwoStepEnabled } from '../../config/driverHomeFeatures'
import {
  DRIVER_OPEN_ACCOUNT_EVENT,
  DRIVER_OPEN_ACTIVITY_LOG_EVENT,
  DRIVER_OPEN_SETTINGS_EVENT,
} from './driverShellEvents'
import { DriverBottomNav, type DriverShellTab } from './DriverBottomNav'
import { DriverShellTopChips } from './DriverShellTopChips'

const DRIVER_OFFLINE_KEY = 'tvde_driver_offline'
const DRIVER_INCIDENT_TYPES = [
  'Objeto esquecido',
  'Tarifa',
  'Comportamento',
  'Limpeza',
  'Segurança',
  'Outro',
] as const

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

/** §9.4 — barra sob o mapa (barra inferior activa): disponível → toque passa a offline. */
function DriverMapAvailabilityPill({ onGoOffline }: { onGoOffline: () => void }) {
  return (
    <button
      type="button"
      data-testid="driver-map-availability-pill"
      onClick={onGoOffline}
      aria-label="Estás disponível. Toca para ficar offline."
      className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-none border-0 bg-background/90 px-3 py-2 text-center text-xs font-semibold text-foreground shadow-none backdrop-blur-sm touch-manipulation hover:bg-background sm:text-sm"
    >
      <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 ring-2 ring-emerald-400/55" aria-hidden />
      <span className="leading-snug truncate">Disponível — tocar para offline</span>
    </button>
  )
}

/** §9.2 — com barra inferior, mapa em fundo mesmo offline; toque passa a disponível (mesmas regras que o toggle). */
function DriverMapOfflinePill({ onGoOnline }: { onGoOnline: () => void }) {
  return (
    <button
      type="button"
      data-testid="driver-map-offline-pill"
      onClick={onGoOnline}
      aria-label="Estás offline. Toca para ficares disponível."
      className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-none border-0 bg-background/90 px-3 py-2 text-center text-xs font-semibold text-foreground shadow-none backdrop-blur-sm touch-manipulation hover:bg-background sm:text-sm"
    >
      <span className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground/80 ring-2 ring-border" aria-hidden />
      <span className="leading-snug truncate">Offline — tocar para disponível</span>
    </button>
  )
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
  const [driverDocuments, setDriverDocuments] = useState<DriverDocumentsState>(() =>
    getDriverDocumentsState()
  )
  const [driverDocsGateEnabled, setDriverDocsGateEnabled] = useState<boolean>(() =>
    isDriverDocumentsGateEnabled()
  )
  const [menuOpen, setMenuOpen] = useState(false)
  /** Leitura síncrona no bottom nav (evita setDriverShellTab dentro do updater de setMenuOpen). */
  const menuOpenRef = useRef(menuOpen)
  menuOpenRef.current = menuOpen
  const [driverShellTab, setDriverShellTab] = useState<DriverShellTab>('home')
  const driverHomeTwoStep = isDriverHomeTwoStepEnabled()
  const driverBottomNav = isDriverBottomNavEnabled()
  const [driverHomeStep, setDriverHomeStep] = useState<1 | 2>(() =>
    isDriverHomeTwoStepEnabled() ? 1 : 2
  )
  const showDriverHomeStep1 = driverHomeTwoStep && !activeTripId && driverHomeStep === 1
  const [actionTakingLong, setActionTakingLong] = useState(false)
  /** P3: resposta da última ação até o poll alinhar (evita atraso visual). */
  const [driverStatusOverride, setDriverStatusOverride] = useState<string | null>(null)
  /** P25: última informação conhecida se o poll falhar logo após aceitar. */
  const [acceptedDetailFallback, setAcceptedDetailFallback] = useState<TripDetailResponse | null>(null)
  const isOnline = useOnlineStatus()
  const sessionDisplayName = useMemo(() => getStoredSessionDisplayName(), [])

  const handleDriverAvailabilityChange = useCallback(
    (checked: boolean) => {
      if (checked && driverDocsGateEnabled && !isDriverDocumentsReady(driverDocuments)) {
        setToast(
          'Faltam documentos obrigatórios. Completa-os em Menu > Documentos para ficares disponível.'
        )
        addLog('Bloqueado: documentos obrigatórios em falta', 'error')
        return
      }
      setOffline(!checked)
      addLog(checked ? 'Toggle: Disponível' : 'Toggle: Offline', 'info')
      setStatus(checked ? 'Disponível' : 'Offline')
    },
    [addLog, driverDocsGateEnabled, driverDocuments, setStatus]
  )

  const pollEnabled = !!token && !offline

  useEffect(() => {
    if (!menuOpen || driverShellTab === 'home' || driverShellTab === 'menu') return
    const id = driverShellTab === 'earnings' ? 'driver-menu-earnings' : 'driver-menu-inbox'
    // Dois rAF: o painel do menu tem de montar; scroll-margin nas secções alinha com o header.
    const t = window.setTimeout(() => {
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }, 32)
    return () => window.clearTimeout(t)
  }, [menuOpen, driverShellTab])

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
  /** Primeira oferta na categoria: marcadores no mapa sem viagem activa (P6). */
  const availableOfferMapPreview = useMemo(() => {
    if (activeTripId) return null
    const t = filteredAvailable[0]
    if (!t) return null
    return {
      pickup: { lat: t.origin_lat, lng: t.origin_lng },
      dropoff: { lat: t.destination_lat, lng: t.destination_lng },
    }
  }, [activeTripId, filteredAvailable])

  const { setDriverOnAssigned } = useDevToolsCallbacks()
  useEffect(() => {
    const fn = () => {
      refetchHistory()
      refetchAvailable()
    }
    setDriverOnAssigned(fn)
    return () => setDriverOnAssigned(undefined)
  }, [setDriverOnAssigned, refetchHistory, refetchAvailable])

  const prevDriverHomeStepRef = useRef(driverHomeStep)
  useEffect(() => {
    const prev = prevDriverHomeStepRef.current
    prevDriverHomeStepRef.current = driverHomeStep
    if (!driverHomeTwoStep || !token || !pollEnabled) return
    if (prev === 1 && driverHomeStep === 2) {
      void refetchAvailable()
    }
  }, [driverHomeStep, driverHomeTwoStep, token, pollEnabled, refetchAvailable])

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
  /** GPS → última posição servidor → mapa centrado na região (§9.2). */
  const mapDotLatLng = useMemo(() => {
    if (driverLocation) return driverLocation
    if (serverLoc) return { lat: serverLoc.lat, lng: serverLoc.lng }
    return undefined
  }, [driverLocation, serverLoc])
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
    if (activeTripId) setDriverHomeStep(2)
  }, [activeTripId])

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

  const closeDriverMenu = useCallback(() => {
    setMenuOpen(false)
    setDriverShellTab('home')
  }, [])

  const handleBottomNav = useCallback(
    (tab: DriverShellTab) => {
      if (tab === 'home') {
        setDriverShellTab('home')
        setMenuOpen(false)
        if (driverHomeTwoStep && !activeTripId) setDriverHomeStep(2)
        document.getElementById('driver-main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' })
        if (token && pollEnabled) void refetchAvailable()
        return
      }
      if (tab === 'menu') {
        const nextOpen = !menuOpenRef.current
        setMenuOpen(nextOpen)
        setDriverShellTab(nextOpen ? 'menu' : 'home')
        return
      }
      setDriverShellTab(tab)
      setMenuOpen(true)
    },
    [activeTripId, driverHomeTwoStep, pollEnabled, refetchAvailable, token]
  )

  const bottomChrome =
    activeTripId != null ? (
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
                pos != null && isWithinHaversineM(pos, pickup, DRIVER_START_TRIP_MAX_DISTANCE_M)
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
    ) : driverBottomNav ? (
      <DriverBottomNav active={driverShellTab} onSelect={handleBottomNav} />
    ) : undefined

  return (
    <ScreenContainer
      bottomButton={bottomChrome}
      bottomBarVariant={activeTripId ? 'inset' : driverBottomNav ? 'flush' : 'inset'}
      mainScrollId="driver-main-scroll"
    >
      {menuOpen ? (
        <DriverOperationsMenu
          sessionDisplayName={sessionDisplayName}
          history={history}
          navPref={driverNavPref}
          vehicleCategories={vehicleCategories}
          driverDocuments={driverDocuments}
          driverDocsGateEnabled={driverDocsGateEnabled}
          onCloseMenu={closeDriverMenu}
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
          onPatchDriverDocument={(doc, status) => {
            setDriverDocuments((prev) => {
              const docs = { ...prev.docs, [doc]: status }
              const next: DriverDocumentsState = {
                docs,
                onboardingCompleted: prev.onboardingCompleted || REQUIRED_DRIVER_DOCUMENTS.every((k) => docs[k] === 'approved'),
              }
              setDriverDocumentsState(next)
              return next
            })
          }}
          onToggleDriverDocsGate={(enabled) => {
            setDriverDocsGateEnabled(enabled)
            setDriverDocumentsGateEnabled(enabled)
            addLog(
              enabled
                ? 'Gate documentos: bloqueio de disponibilidade ativo'
                : 'Gate documentos: bloqueio de disponibilidade desativado',
              'info'
            )
          }}
          onReportIncident={(tripId) => {
            const typeInput = window.prompt(
              `Tipo de ocorrência:\n\n${DRIVER_INCIDENT_TYPES.map((label, i) => `${i + 1}. ${label}`).join('\n')}\n\nEscreve número (1-${DRIVER_INCIDENT_TYPES.length}) ou texto livre.`
            )
            if (!typeInput || !typeInput.trim()) return
            const parsed = Number.parseInt(typeInput.trim(), 10)
            const type =
              Number.isInteger(parsed) && parsed >= 1 && parsed <= DRIVER_INCIDENT_TYPES.length
                ? DRIVER_INCIDENT_TYPES[parsed - 1]
                : typeInput.trim()
            const note = window.prompt('Descrição curta da ocorrência:')
            if (!note || !note.trim()) return
            sonnerToast.success(`Ocorrência guardada localmente para a viagem ${tripId.slice(0, 8)}…`)
            addLog(`Ocorrência registada para ${tripId} [${type}]: ${note.trim()}`, 'info')
          }}
        />
      ) : showDriverHomeStep1 ? (
        <div
          className="space-y-4 transition-opacity duration-150"
          data-testid="driver-home-step1"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 flex-1 text-xs font-medium text-muted-foreground leading-snug">
              Mapa e disponibilidade primeiro; depois vês pedidos e o ecrã completo.
            </p>
            {!driverBottomNav ? (
              <button
                type="button"
                data-testid="driver-open-menu"
                onClick={() => setMenuOpen((v) => !v)}
                className="min-h-[44px] shrink-0 rounded-xl border border-border px-3 text-sm font-semibold text-foreground hover:bg-muted/50 touch-manipulation"
              >
                {menuOpen ? 'Fechar menu' : 'Menu'}
              </button>
            ) : null}
          </div>
          {driverBottomNav ? (
            <DriverShellTopChips offline={offline} activeTripId={activeTripId} />
          ) : null}
          {!driverBottomNav ? (
            <Toggle
              label="Estado"
              checked={!offline}
              onChange={handleDriverAvailabilityChange}
              onLabel="Disponível"
              offLabel="Offline"
            />
          ) : null}
          {(!offline || driverBottomNav) && (
            <div className="min-h-[min(52vh,24rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-card">
              <MapView
                className="!rounded-none border-0 !shadow-none"
                driverLocation={mapDotLatLng}
                tripPickup={availableOfferMapPreview?.pickup ?? null}
                tripDropoff={availableOfferMapPreview?.dropoff ?? null}
                route={
                  import.meta.env.DEV &&
                  isMockLocationModeEnabled() &&
                  mockStableRouteEndpoints &&
                  activeTripId
                    ? mockStableRouteEndpoints
                    : undefined
                }
                mapVisualWeight={offline && driverBottomNav ? 'subdued' : 'emphasized'}
                compactHeight={false}
              />
              {driverBottomNav ? (
                <div className="border-t border-border bg-muted/35">
                  {offline ? (
                    <DriverMapOfflinePill onGoOnline={() => handleDriverAvailabilityChange(true)} />
                  ) : (
                    <DriverMapAvailabilityPill onGoOffline={() => handleDriverAvailabilityChange(false)} />
                  )}
                </div>
              ) : null}
            </div>
          )}
          {offline && !driverBottomNav && (
            <div className="py-8 text-center rounded-xl border border-border">
              <p className="text-foreground/85 text-base">Estás offline.</p>
              <p className="text-foreground/75 mt-2 text-sm">Activa a disponibilidade para veres o mapa.</p>
            </div>
          )}
          <button
            type="button"
            data-testid="driver-home-step1-continue"
            disabled={offline}
            onClick={() => setDriverHomeStep(2)}
            className="relative w-full min-h-[48px] rounded-xl bg-primary text-primary-foreground font-semibold text-base disabled:opacity-50 touch-manipulation"
          >
            <span className="flex items-center justify-center gap-2 px-1">
              <span>Ver pedidos e mapa completo</span>
              {hasAvailableTrips && !offline ? (
                <span
                  data-testid="driver-home-step1-pending-count"
                  className="min-h-[1.5rem] min-w-[1.5rem] shrink-0 rounded-full bg-primary-foreground/25 px-1.5 text-xs font-bold tabular-nums leading-none inline-flex items-center justify-center"
                  aria-label={`${filteredAvailable.length} pedido(s) em espera`}
                >
                  {filteredAvailable.length > 99 ? '99+' : filteredAvailable.length}
                </span>
              ) : null}
            </span>
          </button>
        </div>
      ) : (
        <>
          <header
            className={`mb-4 flex items-start gap-3 ${driverBottomNav ? 'justify-between' : 'justify-end'}`}
          >
            {driverBottomNav ? (
              <DriverShellTopChips offline={offline} activeTripId={activeTripId} />
            ) : null}
            <div className={`flex flex-col items-end gap-1.5 shrink-0 ${driverBottomNav ? '' : 'ml-auto'}`}>
              {driverHomeTwoStep && !activeTripId && driverHomeStep === 2 ? (
                <button
                  type="button"
                  data-testid="driver-home-map-initial"
                  onClick={() => setDriverHomeStep(1)}
                  className="min-h-[40px] w-full rounded-xl border border-border px-3 text-xs font-semibold text-foreground hover:bg-muted/50 touch-manipulation"
                >
                  Mapa inicial
                </button>
              ) : null}
              {!driverBottomNav ? (
                <button
                  type="button"
                  data-testid="driver-open-menu"
                  onClick={() => {
                    setMenuOpen((v) => {
                      const next = !v
                      return next
                    })
                  }}
                  className="min-h-[44px] shrink-0 rounded-xl border border-border px-3 text-sm font-semibold text-foreground hover:bg-muted/50 touch-manipulation"
                >
                  {menuOpen ? 'Fechar menu' : 'Menu'}
                </button>
              ) : null}
            </div>
          </header>

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
        <details
          className="rounded-lg border border-foreground/10 bg-foreground/[0.03] px-2 py-1.5 text-[11px] text-foreground/75"
          data-testid="driver-gps-upload-details"
        >
          <summary className="cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
            <span>
              GPS envio:{' '}
              {gpsReport.lastError ? (
                <span className="text-destructive font-medium">erro {gpsReport.lastError.status ?? ''}</span>
              ) : (
                <span className="text-foreground/85">{gpsReport.lastOkAt ? 'ok' : 'a iniciar…'}</span>
              )}
            </span>
            <span className="text-foreground/55 shrink-0">Diagnóstico</span>
          </summary>
          <div className="mt-2 space-y-1.5 border-t border-border/50 pt-2 text-[11px] text-foreground/70">
            {gpsReport.lastError ? (
              <>
                <p>{String(gpsReport.lastError.detail ?? 'Pedido de localização foi recusado.')}</p>
                {gpsReport.lastError.request_id ? (
                  <p className="font-mono text-[10px] text-foreground/55">
                    request_id {gpsReport.lastError.request_id}
                  </p>
                ) : null}
              </>
            ) : null}
            {serverLoc ? (
              <p>
                Servidor: {serverLoc.lat.toFixed(5)},{' '}
                {serverLoc.lng.toFixed(5)} (age ~{Math.max(0, Math.round((Date.now() - serverLoc.timestamp) / 1000))}s)
              </p>
            ) : serverLocErr ? (
              <p>
                Servidor: erro {serverLocErr.status ?? ''} {serverLocErr.detail ?? ''}
              </p>
            ) : (
              <p>Servidor: a obter…</p>
            )}
          </div>
        </details>
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
          driverBottomNav ? null : (
            <Toggle
              label="Estado"
              checked={!offline}
              onChange={handleDriverAvailabilityChange}
              onLabel="Disponível"
              offLabel="Offline"
            />
          )
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

        {(!offline || (driverBottomNav && !activeTripId)) && (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <MapView
              className="!rounded-none border-0 !shadow-none"
              driverLocation={mapDotLatLng}
              tripPickup={availableOfferMapPreview?.pickup ?? null}
              tripDropoff={availableOfferMapPreview?.dropoff ?? null}
              route={
                import.meta.env.DEV &&
                isMockLocationModeEnabled() &&
                mockStableRouteEndpoints &&
                activeTripId
                  ? mockStableRouteEndpoints
                  : undefined
              }
              mapVisualWeight={
                offline && driverBottomNav && !activeTripId
                  ? 'subdued'
                  : activeTripId || (available && available.length > 0)
                    ? 'subdued'
                    : 'emphasized'
              }
              compactHeight={compactDriverSurface}
            />
            {driverBottomNav && !activeTripId ? (
              <div className="border-t border-border bg-muted/35">
                {offline ? (
                  <DriverMapOfflinePill onGoOnline={() => handleDriverAvailabilityChange(true)} />
                ) : (
                  <DriverMapAvailabilityPill onGoOffline={() => handleDriverAvailabilityChange(false)} />
                )}
              </div>
            ) : null}
          </div>
        )}

        {offline && !(driverBottomNav && !activeTripId) && (
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
                  className="flex flex-col gap-1 py-2 border-b border-border last:border-0 transition-opacity duration-150"
                >
                  <div className="flex justify-between items-center gap-3">
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
                    <div className="shrink-0 text-right">
                      <p className="font-medium text-foreground">{driverHistoryPriceLabel(t)}</p>
                      {formatMoneyEur(t.driver_payout) ? (
                        <p className="text-[11px] text-muted-foreground">
                          Parte motorista: {formatMoneyEur(t.driver_payout)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <CancellationReasonMuted reason={t.cancellation_reason} className="mt-0" />
                </li>
              ))}
            </ul>
          </section>
        )}

        {token && !driverBottomNav ? <BetaAccountPanel /> : null}
      </div>
        </>
      )}
    </ScreenContainer>
  )
}

function ActiveTripSummary({
  tripId,
  token,
  statusOverride,
  detailFallback,
  onClearStatusOverride,
  onTripCancelled,
}: {
  tripId: string
  token: string
  statusOverride: string | null
  detailFallback: TripDetailResponse | null
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

function formatMoneyEur(n: number | null | undefined): string | null {
  if (n == null || Number.isNaN(Number(n))) return null
  return `${Number(n).toFixed(2)} €`
}

function sumDriverPayoutInRange(
  trips: TripHistoryItem[],
  startInclusive: Date,
  endExclusive: Date | null
): number {
  return trips.reduce((sum, t) => {
    if (t.status !== 'completed' || !t.completed_at) return sum
    const when = new Date(t.completed_at)
    if (when < startInclusive) return sum
    if (endExclusive != null && when >= endExclusive) return sum
    const p = t.driver_payout
    if (p == null || Number.isNaN(Number(p))) return sum
    return sum + Number(p)
  }, 0)
}

function weekHasDriverPayout(
  trips: TripHistoryItem[],
  startInclusive: Date,
  endExclusive: Date | null
): boolean {
  return trips.some((t) => {
    if (t.status !== 'completed' || !t.completed_at || t.driver_payout == null) return false
    const when = new Date(t.completed_at)
    if (when < startInclusive) return false
    if (endExclusive != null && when >= endExclusive) return false
    return !Number.isNaN(Number(t.driver_payout))
  })
}

/** Preço / payout / comissão por linha de histórico (menu motorista). */
function DriverHistoryTripMoney({ t }: { t: TripHistoryItem }) {
  const payout = formatMoneyEur(t.driver_payout)
  const commission = formatMoneyEur(t.commission_amount)
  return (
    <>
      <p className="text-[11px] text-foreground/85">
        {t.status === 'completed' ? 'Preço final' : 'Estimativa'}: {driverHistoryPriceLabel(t)}
      </p>
      {payout ? (
        <p className="text-[11px] text-foreground/75">Parte motorista (payout): {payout}</p>
      ) : null}
      {t.status === 'completed' && commission ? (
        <p className="text-[10px] text-muted-foreground">Comissão plataforma: {commission}</p>
      ) : null}
    </>
  )
}

function formatZoneDeadlineLocal(iso: string, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('pt-PT', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone,
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function DriverOperationsMenu({
  sessionDisplayName,
  history,
  navPref,
  vehicleCategories,
  driverDocuments,
  driverDocsGateEnabled,
  onCloseMenu,
  onSelectNavPref,
  onToggleVehicleCategory,
  onPatchDriverDocument,
  onToggleDriverDocsGate,
  onReportIncident,
}: {
  sessionDisplayName: string | null
  history: TripHistoryItem[] | null
  navPref: DriverNavApp
  vehicleCategories: DriverVehicleCategory[]
  driverDocuments: DriverDocumentsState
  driverDocsGateEnabled: boolean
  onCloseMenu: () => void
  onSelectNavPref: (app: DriverNavApp) => void
  onToggleVehicleCategory: (category: DriverVehicleCategory) => void
  onPatchDriverDocument: (doc: DriverRequiredDocument, status: DriverDocumentStatus) => void
  onToggleDriverDocsGate: (enabled: boolean) => void
  onReportIncident: (tripId: string) => void
}) {
  const { isAdmin, token } = useAuth()
  const [historyVisible, setHistoryVisible] = useState(5)
  const [historyDetailTripId, setHistoryDetailTripId] = useState<string | null>(null)
  const historyDetailTrip = useMemo(
    () => (history ?? []).find((t) => t.trip_id === historyDetailTripId) ?? null,
    [history, historyDetailTripId]
  )

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
  const thisWeekPayoutSum = sumDriverPayoutInRange(completedTrips, startOfThisWeek, null)
  const lastWeekPayoutSum = sumDriverPayoutInRange(completedTrips, startOfLastWeek, startOfThisWeek)
  const showThisWeekPayout = weekHasDriverPayout(completedTrips, startOfThisWeek, null)
  const showLastWeekPayout = weekHasDriverPayout(completedTrips, startOfLastWeek, startOfThisWeek)
  const closedTrips = (history ?? []).filter((t) => t.status === 'completed' || t.status === 'cancelled').length
  const cancelledTrips = (history ?? []).filter((t) => t.status === 'cancelled').length
  const cancelRate = closedTrips > 0 ? Math.round((cancelledTrips / closedTrips) * 100) : 0

  const [zoneBudget, setZoneBudget] = useState<DriverZoneBudgetToday | null>(null)
  const [zoneSession, setZoneSession] = useState<DriverZoneSession | null>(null)
  const [zoneCatalog, setZoneCatalog] = useState<DriverZoneCatalogItem[] | null>(null)
  const [zoneCatalogErr, setZoneCatalogErr] = useState<string | null>(null)
  const [zoneLoadErr, setZoneLoadErr] = useState<string | null>(null)
  const [zoneBusy, setZoneBusy] = useState(false)
  const [zoneRefreshing, setZoneRefreshing] = useState(false)
  const [zoneNewZoneId, setZoneNewZoneId] = useState('portimao')
  const [zoneEtaMinutes, setZoneEtaMinutes] = useState(30)
  const [zoneMarginPct, setZoneMarginPct] = useState(25)
  const [zoneExtensionReason, setZoneExtensionReason] = useState('')

  const reloadZones = useCallback(async (showTapFeedback?: boolean) => {
    if (!token) {
      setZoneBudget(null)
      setZoneSession(null)
      setZoneCatalog(null)
      setZoneCatalogErr(null)
      return
    }
    if (showTapFeedback) setZoneRefreshing(true)
    setZoneLoadErr(null)
    try {
      const [bud, open] = await Promise.all([
        getDriverZoneBudgetToday(token),
        fetchOpenDriverZoneSession(token),
      ])
      setZoneBudget(bud)
      setZoneSession(open)
      try {
        const cat = await getDriverZoneCatalog(token)
        setZoneCatalog(cat.zones)
        setZoneCatalogErr(null)
      } catch {
        setZoneCatalog(null)
        setZoneCatalogErr('Catálogo de zonas indisponível — usa o ID manual se precisares.')
      }
      if (showTapFeedback) {
        sonnerToast.success('Zonas actualizadas.', { duration: 2500 })
      }
    } catch (e) {
      const detail =
        e !== null && typeof e === 'object' && 'detail' in e
          ? String((e as { detail: unknown }).detail)
          : 'Erro ao carregar zonas'
      setZoneLoadErr(detail)
    } finally {
      if (showTapFeedback) setZoneRefreshing(false)
    }
  }, [token])

  useEffect(() => {
    void reloadZones()
  }, [reloadZones])

  useEffect(() => {
    if (!zoneCatalog?.length) return
    if (!zoneCatalog.some((z) => z.zone_id === zoneNewZoneId)) {
      setZoneNewZoneId(zoneCatalog[0].zone_id)
    }
  }, [zoneCatalog, zoneNewZoneId])

  const zoneTz = zoneBudget?.timezone ?? 'Europe/Lisbon'
  const activeZoneLabelPt = useMemo(() => {
    if (!zoneSession) return null
    const hit = zoneCatalog?.find((z) => z.zone_id === zoneSession.zone_id)
    return hit?.label_pt ?? null
  }, [zoneSession, zoneCatalog])
  const activeZoneOpsNotePt = useMemo(() => {
    if (!zoneSession) return null
    const hit = zoneCatalog?.find((z) => z.zone_id === zoneSession.zone_id)
    const raw = hit?.ops_note_pt
    const s = raw != null && typeof raw === 'string' ? raw.trim() : ''
    return s.length > 0 ? s : null
  }, [zoneSession, zoneCatalog])
  const zoneStateLabel =
    zoneSession == null
      ? null
      : zoneSession.status === 'open' && !zoneSession.arrived_at
        ? 'A caminho da zona-alvo'
        : zoneSession.status === 'open' && zoneSession.arrived_at
          ? 'Em zona — o uso conta na 1.ª viagem concluída aqui'
          : zoneSession.status

  const handleCreateZoneSession = async () => {
    if (!token || zoneBusy) return
    const zid = zoneNewZoneId.trim()
    if (!zid) {
      sonnerToast.error('Indica um ID de zona.')
      return
    }
    const etaSec = Math.min(86400 * 2, Math.max(60, Math.round(zoneEtaMinutes * 60)))
    setZoneBusy(true)
    try {
      const s = await createDriverZoneSession(token, {
        zone_id: zid,
        eta_seconds_baseline: etaSec,
        eta_margin_percent: Math.min(200, Math.max(0, Math.round(zoneMarginPct))),
      })
      setZoneSession(s)
      setZoneBudget(await getDriverZoneBudgetToday(token))
      sonnerToast.success('Pedido de mudança de zona registado.')
    } catch (e) {
      const detail =
        e !== null && typeof e === 'object' && 'detail' in e
          ? String((e as { detail: unknown }).detail)
          : 'Erro'
      sonnerToast.error(detail)
    } finally {
      setZoneBusy(false)
    }
  }

  const handleZoneArrived = async () => {
    if (!token || !zoneSession || zoneBusy) return
    setZoneBusy(true)
    try {
      const s = await postDriverZoneSessionArrived(token, zoneSession.id)
      setZoneSession(s)
      sonnerToast.success('Entrada na zona registada.')
    } catch (e) {
      const detail =
        e !== null && typeof e === 'object' && 'detail' in e
          ? String((e as { detail: unknown }).detail)
          : 'Erro'
      sonnerToast.error(detail)
    } finally {
      setZoneBusy(false)
    }
  }

  const handleZoneCancel = async () => {
    if (!token || !zoneSession || zoneBusy) return
    if (!window.confirm('Cancelar este pedido de mudança de zona?')) return
    setZoneBusy(true)
    try {
      await postDriverZoneSessionCancel(token, zoneSession.id, null)
      setZoneSession(null)
      setZoneExtensionReason('')
      setZoneBudget(await getDriverZoneBudgetToday(token))
      sonnerToast.success('Pedido cancelado.')
    } catch (e) {
      const detail =
        e !== null && typeof e === 'object' && 'detail' in e
          ? String((e as { detail: unknown }).detail)
          : 'Erro'
      sonnerToast.error(detail)
    } finally {
      setZoneBusy(false)
    }
  }

  const handleZoneRequestExtension = async () => {
    if (!token || !zoneSession || zoneBusy) return
    const reason = zoneExtensionReason.trim()
    if (reason.length < 3) {
      sonnerToast.error('Explica o motivo em pelo menos 3 caracteres.')
      return
    }
    setZoneBusy(true)
    try {
      const s = await postDriverZoneSessionRequestExtension(token, zoneSession.id, reason)
      setZoneSession(s)
      setZoneExtensionReason('')
      sonnerToast.success('Pedido de mais tempo enviado ao partner.')
    } catch (e) {
      const detail =
        e !== null && typeof e === 'object' && 'detail' in e
          ? String((e as { detail: unknown }).detail)
          : 'Erro'
      sonnerToast.error(detail)
    } finally {
      setZoneBusy(false)
    }
  }

  return (
    <section
      className="mb-2 rounded-2xl border border-border/80 bg-card p-4 space-y-4 shadow-card"
      data-testid="driver-ops-menu"
      aria-label="Menu do motorista"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-foreground">Menu do motorista</h2>
          <p className="text-sm text-foreground/75">
            {sessionDisplayName ?? 'Motorista'} · canceladas após aceitar: {cancelRate}%
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <button
            type="button"
            data-testid="driver-close-menu"
            onClick={() => onCloseMenu()}
            className="min-h-[40px] rounded-xl border border-border px-3 text-sm font-semibold text-foreground hover:bg-muted/50 touch-manipulation"
          >
            Fechar
          </button>
          <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-foreground/75">
            Rating: em breve
          </span>
        </div>
      </div>

      <div
        id="driver-menu-earnings"
        className="scroll-mt-6 rounded-xl border border-border bg-background px-3 py-3 space-y-2"
      >
        <p className="text-sm font-medium text-foreground">Rendimentos</p>
        <p className="text-xs text-muted-foreground leading-snug">
          Soma do <span className="font-medium text-foreground/85">preço final</span> das viagens concluídas na
          semana. A linha «Parte motorista» aparece quando a API envia payout por viagem.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border/70 bg-card px-3 py-2">
            <p className="text-[11px] text-foreground/70">Semana atual</p>
            <p className="text-base font-semibold text-foreground">{thisWeekRevenue.toFixed(2)} €</p>
            {showThisWeekPayout ? (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Parte motorista:{' '}
                <span className="font-medium text-foreground/85">{thisWeekPayoutSum.toFixed(2)} €</span>
              </p>
            ) : null}
          </div>
          <div className="rounded-lg border border-border/70 bg-card px-3 py-2">
            <p className="text-[11px] text-foreground/70">Semana anterior</p>
            <p className="text-base font-semibold text-foreground">{lastWeekRevenue.toFixed(2)} €</p>
            {showLastWeekPayout ? (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Parte motorista:{' '}
                <span className="font-medium text-foreground/85">{lastWeekPayoutSum.toFixed(2)} €</span>
              </p>
            ) : null}
          </div>
        </div>
        {completedTrips.length === 0 ? (
          <p className="text-xs text-muted-foreground leading-snug">
            Sem viagens concluídas a contar para já — os totais actualizam quando concluíres viagens com data
            de fim.
          </p>
        ) : null}
      </div>

      <div id="driver-menu-trips" className="rounded-xl border border-border bg-background px-3 py-3 space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-foreground">Viagens</p>
          {history && history.length > 0 ? (
            <p className="text-[11px] text-muted-foreground shrink-0">
              {Math.min(historyVisible, history.length)} de {history.length}
            </p>
          ) : null}
        </div>
        {history && history.length > 0 ? (
          <>
            <ul className="space-y-2 max-h-[min(50vh,22rem)] overflow-y-auto overscroll-contain pr-0.5">
              {history.slice(0, historyVisible).map((t) => (
                <li key={t.trip_id} className="rounded-lg border border-border/70 bg-card px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-xs font-medium text-foreground truncate">
                        #{t.trip_id.slice(0, 8)} · {passengerTripStatusLabel(t.status)}
                      </p>
                      <p
                        className="text-[11px] text-foreground/75 truncate"
                        title={`${formatPickup(t.origin_lat, t.origin_lng)} → ${formatDestination(t.destination_lat, t.destination_lng)}`}
                      >
                        {formatPickup(t.origin_lat, t.origin_lng)} →{' '}
                        {formatDestination(t.destination_lat, t.destination_lng)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {t.completed_at
                          ? `${t.status === 'completed' ? 'Concluída' : 'Registo'} · ${formatDriverHistoryWhen(t.completed_at)}`
                          : t.status === 'completed'
                            ? 'Data de conclusão indisponível'
                            : 'Viagem ainda não concluída neste resumo'}
                      </p>
                      <DriverHistoryTripMoney t={t} />
                      <CancellationReasonMuted reason={t.cancellation_reason} />
                    </div>
                    <button
                      type="button"
                      onClick={() => onReportIncident(t.trip_id)}
                      className="min-h-[32px] shrink-0 rounded-md border border-border px-2 text-xs font-medium text-foreground hover:bg-muted/50 touch-manipulation"
                    >
                      Reportar
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHistoryDetailTripId(t.trip_id)}
                    className="mt-2 min-h-[32px] rounded-md border border-border px-2 text-xs font-medium text-foreground hover:bg-muted/50 touch-manipulation"
                  >
                    Ver detalhe
                  </button>
                </li>
              ))}
            </ul>
            {history.length > historyVisible ? (
              <button
                type="button"
                className="w-full min-h-[40px] rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-muted/50 touch-manipulation"
                onClick={() => setHistoryVisible((n) => Math.min(n + 5, history.length))}
              >
                Mostrar mais
              </button>
            ) : null}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Sem viagens recentes no histórico.</p>
        )}
      </div>

      <div
        id="driver-menu-inbox"
        className="scroll-mt-6 rounded-xl border border-border bg-background px-3 py-3 space-y-2"
        data-testid="driver-menu-inbox"
      >
        <p className="text-sm font-medium text-foreground">Caixa de entrada</p>
        <p className="text-xs text-muted-foreground leading-snug">
          Ainda sem avisos do partner nesta versão. Quando a operação enviar avisos, aparecem aqui.
        </p>
        <button
          type="button"
          data-testid="driver-menu-open-activity-log"
          onClick={() => {
            onCloseMenu()
            window.dispatchEvent(new CustomEvent(DRIVER_OPEN_ACTIVITY_LOG_EVENT))
          }}
          className="w-full min-h-[44px] rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-muted/50 touch-manipulation"
        >
          Ver registo de atividade
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          data-testid="driver-menu-open-account"
          onClick={() => window.dispatchEvent(new CustomEvent(DRIVER_OPEN_ACCOUNT_EVENT))}
          className="min-h-[44px] rounded-xl border border-border bg-background px-2 text-xs font-semibold text-foreground hover:bg-muted/50 touch-manipulation"
        >
          Conta (perfil)
        </button>
        <button
          type="button"
          data-testid="driver-menu-open-settings"
          onClick={() => window.dispatchEvent(new CustomEvent(DRIVER_OPEN_SETTINGS_EVENT))}
          className="min-h-[44px] rounded-xl border border-border bg-background px-2 text-xs font-semibold text-foreground hover:bg-muted/50 touch-manipulation"
        >
          Definições
        </button>
      </div>

      <details className="rounded-lg border border-border/80 bg-muted/15 px-3 py-2 text-sm">
        <summary className="cursor-pointer font-medium text-foreground select-none">
          Preços nos pedidos (estimativa)
        </summary>
        <p className="mt-2 text-xs text-foreground/85 leading-snug">
          O valor mostrado no pedido é <strong>estimativa</strong>; o passageiro paga o <strong>preço final</strong> no
          fim da viagem.
        </p>
      </details>

      <div className="rounded-xl border border-border bg-background px-3 py-3 space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-foreground">Mudança de zona (v1)</p>
          <button
            type="button"
            data-testid="driver-zones-refresh"
            onClick={() => void reloadZones(true)}
            disabled={!token || zoneBusy || zoneRefreshing}
            aria-busy={zoneRefreshing}
            className="min-h-[32px] shrink-0 rounded-md border border-border px-2 text-xs font-medium text-foreground hover:bg-muted/50 disabled:opacity-50 touch-manipulation"
          >
            {zoneRefreshing ? 'A actualizar…' : 'Atualizar'}
          </button>
        </div>
        <p className="text-xs text-muted-foreground leading-snug">
          Contador diário (meia-noite Lisboa). O uso só desce quando concluíres a primeira viagem na zona-alvo
          depois de confirmares «Cheguei».
        </p>
        {zoneLoadErr ? (
          <p className="text-xs text-destructive">{zoneLoadErr}</p>
        ) : zoneBudget ? (
          <p className="text-sm text-foreground/90">
            Mudanças hoje:{' '}
            <span className="font-semibold">
              {zoneBudget.used_changes}/{zoneBudget.max_changes}
            </span>{' '}
            · restantes {zoneBudget.remaining}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">A carregar orçamento…</p>
        )}
        {zoneSession && zoneStateLabel ? (
          <div className="rounded-lg border border-border/70 bg-card px-3 py-2 space-y-2">
            <p className="text-xs font-medium text-foreground">
              Sessão: <span className="font-mono">{zoneSession.zone_id}</span>
              {activeZoneLabelPt ? (
                <span className="text-muted-foreground font-normal"> — {activeZoneLabelPt}</span>
              ) : null}
            </p>
            <p className="text-xs text-foreground/85">{zoneStateLabel}</p>
            <p className="text-[11px] text-muted-foreground">
              Prazo (local): {formatZoneDeadlineLocal(zoneSession.deadline_at, zoneTz)}
            </p>
            {activeZoneOpsNotePt ? (
              <p
                className="text-[11px] text-foreground/80 leading-snug rounded-md border border-border/80 bg-muted/30 px-2 py-1.5"
                data-testid="driver-zones-ops-note"
              >
                {activeZoneOpsNotePt}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {!zoneSession.arrived_at ? (
                <button
                  type="button"
                  data-testid="driver-zones-arrived"
                  onClick={() => void handleZoneArrived()}
                  disabled={zoneBusy}
                  className="min-h-[40px] rounded-lg border border-info bg-info/10 px-3 text-sm font-semibold text-foreground hover:bg-info/20 disabled:opacity-50 touch-manipulation"
                >
                  Cheguei à zona
                </button>
              ) : null}
              <button
                type="button"
                data-testid="driver-zones-cancel"
                onClick={() => void handleZoneCancel()}
                disabled={zoneBusy}
                className="min-h-[40px] rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-muted/50 disabled:opacity-50 touch-manipulation"
              >
                Cancelar intenção
              </button>
            </div>
            {zoneSession.status === 'open' && zoneSession.extension_seconds_approved == null ? (
              zoneSession.extension_requested ? (
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Pedido de mais tempo enviado ao partner. Quando for aceite, o prazo (acima) actualiza
                  automaticamente.
                </p>
              ) : (
                <div className="space-y-1.5 pt-1 border-t border-border/60">
                  <label className="block text-[11px] text-muted-foreground" htmlFor="driver-zone-ext-reason">
                    Pedir mais tempo (bloqueio, fila, etc.)
                  </label>
                  <textarea
                    id="driver-zone-ext-reason"
                    value={zoneExtensionReason}
                    onChange={(ev) => setZoneExtensionReason(ev.target.value)}
                    rows={2}
                    maxLength={2000}
                    placeholder="Ex.: Acidente na A5; preciso de mais 15 min para chegar."
                    className="w-full min-h-[44px] rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground"
                  />
                  <button
                    type="button"
                    data-testid="driver-zones-request-extension"
                    onClick={() => void handleZoneRequestExtension()}
                    disabled={zoneBusy}
                    className="min-h-[40px] rounded-lg border border-border px-3 text-xs font-semibold text-foreground hover:bg-muted/50 disabled:opacity-50 touch-manipulation"
                  >
                    Pedir mais tempo ao partner
                  </button>
                </div>
              )
            ) : null}
            {zoneSession.extension_seconds_approved != null && zoneSession.extension_seconds_approved > 0 ? (
              <p className="text-[11px] text-foreground/90">
                Partner concedeu +{Math.max(1, Math.round(zoneSession.extension_seconds_approved / 60))} min ao
                prazo de entrada.
              </p>
            ) : null}
          </div>
        ) : zoneBudget && zoneBudget.remaining > 0 ? (
          <div className="rounded-lg border border-border/70 bg-card px-3 py-2 space-y-2">
            <label className="block space-y-1">
              <span className="text-[11px] text-muted-foreground">
                Zona-alvo · catálogo v1 (também podes escrever à mão se o catálogo falhar)
              </span>
              {zoneCatalog && zoneCatalog.length > 0 ? (
                <select
                  value={zoneNewZoneId}
                  onChange={(ev) => setZoneNewZoneId(ev.target.value)}
                  data-testid="driver-zones-zone-select"
                  className="w-full min-h-[40px] rounded-lg border border-border bg-background px-2 text-sm text-foreground"
                >
                  {zoneCatalog.map((z) => (
                    <option key={z.zone_id} value={z.zone_id}>
                      {z.label_pt}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  {zoneCatalogErr ? (
                    <p className="text-[11px] text-warning" data-testid="driver-zones-catalog-fallback-hint">
                      {zoneCatalogErr}
                    </p>
                  ) : null}
                  <input
                    value={zoneNewZoneId}
                    onChange={(ev) => setZoneNewZoneId(ev.target.value)}
                    data-testid="driver-zones-zone-input"
                    className="w-full min-h-[40px] rounded-lg border border-border bg-background px-2 text-sm text-foreground"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="portimao, faro, lisboa, lis…"
                  />
                </>
              )}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block space-y-1">
                <span className="text-[11px] text-muted-foreground">ETA (min)</span>
                <input
                  type="number"
                  min={1}
                  max={2880}
                  value={zoneEtaMinutes}
                  onChange={(ev) => setZoneEtaMinutes(Number(ev.target.value) || 1)}
                  className="w-full min-h-[40px] rounded-lg border border-border bg-background px-2 text-sm text-foreground"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] text-muted-foreground">Margem (%)</span>
                <input
                  type="number"
                  min={0}
                  max={200}
                  value={zoneMarginPct}
                  onChange={(ev) => setZoneMarginPct(Number(ev.target.value) || 0)}
                  className="w-full min-h-[40px] rounded-lg border border-border bg-background px-2 text-sm text-foreground"
                />
              </label>
            </div>
            <button
              type="button"
              data-testid="driver-zones-create"
              onClick={() => void handleCreateZoneSession()}
              disabled={zoneBusy || !token}
              className="w-full min-h-[44px] rounded-lg border border-info bg-info/15 text-sm font-semibold text-foreground hover:bg-info/25 disabled:opacity-50 touch-manipulation"
            >
              Pedir mudança de zona
            </button>
          </div>
        ) : zoneBudget && zoneBudget.remaining <= 0 ? (
          <div
            className="rounded-lg border border-warning/45 bg-warning/10 px-3 py-2.5 space-y-2"
            data-testid="driver-zones-budget-exhausted"
          >
            <p className="text-sm font-semibold text-foreground">Orçamento de mudanças esgotado hoje</p>
            <p className="text-xs text-foreground/85 leading-snug">
              Não é possível abrir um novo pedido automático até ao reset (meia-noite Lisboa) ou até o partner
              autorizar uma excepção. Usa o <strong>canal habitual da operação</strong> se precisares de entrar
              numa zona extra hoje — em breve poderás enviar esse pedido também aqui.
            </p>
            <button
              type="button"
              data-testid="driver-zones-budget-exhausted-activity"
              onClick={() => {
                onCloseMenu()
                window.dispatchEvent(new CustomEvent(DRIVER_OPEN_ACTIVITY_LOG_EVENT))
              }}
              className="w-full min-h-[44px] rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-muted/50 touch-manipulation"
            >
              Abrir registo de atividade
            </button>
          </div>
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
          Primeira entrada: completa os documentos obrigatórios aqui no painel. Depois podes corrigir/atualizar mais
          tarde nas definições do motorista.
        </p>
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-card px-3 py-2">
          <p className="text-xs text-foreground/85">
            Aprovados: {driverDocumentsApprovedCount(driverDocuments)} / {REQUIRED_DRIVER_DOCUMENTS.length}
          </p>
          <span
            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
              isDriverDocumentsReady(driverDocuments)
                ? 'border-success/45 bg-success/15 text-foreground'
                : 'border-warning/45 bg-warning/15 text-foreground'
            }`}
          >
            {isDriverDocumentsReady(driverDocuments) ? 'Pronto para disponibilidade' : 'Documentos em falta'}
          </span>
        </div>
        <div className="space-y-2">
          {REQUIRED_DRIVER_DOCUMENTS.map((doc) => {
            const status = driverDocuments.docs[doc]
            const badgeClass =
              status === 'approved'
                ? 'border-success/45 bg-success/15 text-foreground'
                : status === 'pending_review'
                  ? 'border-warning/45 bg-warning/15 text-foreground'
                  : status === 'rejected' || status === 'expired'
                    ? 'border-destructive/45 bg-destructive/10 text-foreground'
                    : 'border-border bg-card text-foreground/85'
            return (
              <div key={doc} className="rounded-lg border border-border/70 bg-card px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-foreground truncate">{driverDocumentLabel(doc)}</p>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${badgeClass}`}>
                    {driverDocumentStatusLabel(status)}
                  </span>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="min-h-[32px] flex-1 rounded-md border border-warning/50 bg-warning/10 px-2 text-xs font-medium text-foreground hover:bg-warning/20"
                    onClick={() => onPatchDriverDocument(doc, 'pending_review')}
                  >
                    Marcar entregue
                  </button>
                  <button
                    type="button"
                    className="min-h-[32px] flex-1 rounded-md border border-success/50 bg-success/10 px-2 text-xs font-medium text-foreground hover:bg-success/20"
                    onClick={() => onPatchDriverDocument(doc, 'approved')}
                  >
                    Marcar aprovado
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        <div className="rounded-lg border border-border/70 bg-card px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-foreground/85">Bloquear disponibilidade até 4/4 aprovados</p>
            <button
              type="button"
              aria-pressed={driverDocsGateEnabled}
              onClick={() => onToggleDriverDocsGate(!driverDocsGateEnabled)}
              className={`min-h-[30px] rounded-md border px-2 text-[11px] font-medium transition-colors ${
                driverDocsGateEnabled
                  ? 'border-success/50 bg-success/15 text-foreground'
                  : 'border-border bg-background text-foreground/80 hover:bg-muted/50'
              }`}
            >
              {driverDocsGateEnabled ? 'Ligado' : 'Desligado'}
            </button>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Em teste fica normalmente desligado. Ativa só para validar o bloqueio antes de aceitares viagens.
          </p>
        </div>
        {isAdmin ? (
          <Button type="button" variant="outline" className="w-full min-h-[40px] text-sm font-medium" asChild>
            <Link to="/admin" onClick={() => onCloseMenu()}>
              Abrir painel admin
            </Link>
          </Button>
        ) : null}
      </div>

      <Dialog
        open={Boolean(historyDetailTrip)}
        onOpenChange={(next) => {
          if (!next) setHistoryDetailTripId(null)
        }}
      >
        <DialogContent className="max-w-[min(100vw-1.5rem,520px)] max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhe da viagem</DialogTitle>
            <DialogDescription>
              Resumo operacional para referência rápida no menu do motorista.
            </DialogDescription>
          </DialogHeader>
          {historyDetailTrip ? (
            <div className="space-y-2 text-sm">
              <p className="text-foreground/85">
                <span className="font-medium text-foreground">ID:</span> #{historyDetailTrip.trip_id}
              </p>
              <p className="text-foreground/85">
                <span className="font-medium text-foreground">Estado:</span>{' '}
                {passengerTripStatusLabel(historyDetailTrip.status)}
              </p>
              <p className="text-foreground/85">
                <span className="font-medium text-foreground">Recolha:</span>{' '}
                {formatPickup(historyDetailTrip.origin_lat, historyDetailTrip.origin_lng)}
              </p>
              <p className="text-foreground/85">
                <span className="font-medium text-foreground">Destino:</span>{' '}
                {formatDestination(historyDetailTrip.destination_lat, historyDetailTrip.destination_lng)}
              </p>
              <p className="text-foreground/85">
                <span className="font-medium text-foreground">Data:</span>{' '}
                {historyDetailTrip.completed_at
                  ? formatDriverHistoryWhen(historyDetailTrip.completed_at)
                  : 'Sem data de conclusão'}
              </p>
              <div className="space-y-1 text-foreground/85">
                <DriverHistoryTripMoney t={historyDetailTrip} />
              </div>
              <CancellationReasonMuted reason={historyDetailTrip.cancellation_reason} className="text-sm" />
              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => onReportIncident(historyDetailTrip.trip_id)}
                >
                  Reportar ocorrência desta viagem
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  )
}
