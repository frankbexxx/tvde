import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth, type Role } from '../../context/AuthContext'
import { useActivityLog } from '../../context/ActivityLogContext'
import { useActiveTrip } from '../../context/ActiveTripContext'
import { useDevToolsCallbacks } from '../../context/DevToolsCallbackContext'
import {
  getAvailableTrips,
  getDriverTripHistory,
  getDriverTripDetail,
  acceptTrip,
  getDriverVehicleCategories as getDriverVehicleCategoriesApi,
  patchDriverVehicleCategories as patchDriverVehicleCategoriesApi,
  setDriverOnline,
  setDriverOffline,
  getDriverDrivingHoursCompliance,
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
  deleteDriverZoneCustomZone,
  fetchOpenDriverZoneSession,
  getDriverZoneBudgetToday,
  getDriverZoneCatalog,
  getDriverZoneCustomZones,
  postDriverZoneEtaEstimate,
  postDriverZoneCustomZone,
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
import { passengerTripStatusLabel } from '../../constants/tripStatusLabels'
import { buildMockDriverApproachPath } from '../../dev/buildMockApproachPath'
import { isMockLocationModeEnabled } from '../../dev/mockLocation'
import { MOCK_DRIVER_START } from '../../dev/mockPositions'
import { startTripSimulation } from '../../dev/tripSimulation'
import { isDemoLocationEnabled, useGeolocation } from '../../hooks/useGeolocation'
import { useDriverLocationReporter } from '../../hooks/useDriverLocationReporter'
import {
  fetchDriverLastServerLocation,
  sendDriverLocation,
} from '../../services/locationService'
import { getOsrmRouteMeta, getRoute } from '../../services/routingService'
import { ScreenContainer } from '../../components/layout/ScreenContainer'
import { StatusHeader } from '../../components/layout/StatusHeader'
import { HintLine } from '../../components/layout/HintLine'
import { ActionPanel } from '../../components/layout/ActionPanel'
import { MapStage } from '../../components/layout/MapStage'
import { TripCompletedOverlay } from '../../components/layout/TripSummary'
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
import { uploadDriverDocument } from '../../api/driverMessages'
import { ActiveTripActions } from './ActiveTripActions'
import { DriverInboxPanel } from './DriverInboxPanel'
import { useDriverActiveTripPoll } from './useDriverActiveTripPoll'
import {
  isDriverOfferExpired,
  persistDismissedOfferTripIds,
  readDismissedOfferTripIds,
} from './driverOfferDismiss'
import { DriverSideMenu, type DriverMenuScreen } from './DriverSideMenu'
import { useScreenWakeLock } from '../../hooks/useScreenWakeLock'
import { useDia23LayoutProbe } from '../../hooks/useDia23LayoutProbe'
import { useDriverOfferSounds } from '../../hooks/useDriverOfferSounds'
import {
  fetchDriverDocuments,
  mergeServerDriverDocuments,
  patchDriverDocuments,
} from '../../api/driverDocuments'
import { formatPickup, formatDestination } from '../../utils/format'
import {
  DRIVER_START_TRIP_MAX_DISTANCE_M,
  haversineKm,
  isWithinHaversineM,
} from '../../utils/geo'
import { openDriverExternalNav, driverNavAppLabel, warmDriverNavSessionIfNeeded } from '../../utils/openDriverExternalNav'
import { MapBottomSheet } from '../../components/layout/MapBottomSheet'
import {
  BTN_DRIVER_STEP1,
  BTN_SECONDARY_FULL_SM,
  BTN_SECONDARY_MD,
  BTN_SECONDARY_RADIUS,
  BTN_SECONDARY_SM,
  INFO_BOX_DRIVER_COMPACT,
  INFO_BOX_DRIVER_MENU,
  INFO_BOX_BODY_COMPACT,
  INFO_BOX_MAP_HINT,
  MAP_BANNER_STACK,
  MAP_CARD_FRAME,
  MAP_CHIP_OVERLAY,
  MAP_CHIP_OVERLAY_FLAT,
  MAP_DISMISS_BTN_ERROR,
  MAP_DISMISS_BTN_WARNING,
  MAP_EMPTY_STATE,
  MAP_HINT_WARNING,
  MAP_HINT_WARNING_SM,
  MAP_IDLE_PLACEHOLDER,
  MAP_SHEET_CLASS,
  MAP_SHEET_MAX_H_OFFER,
  MAP_SHEET_MAX_H_TRIP,
  MAP_SHEET_MAX_H_WAIT,
  MAP_STEP1_LIST,
  MAP_TOAST_ERROR,
  MAP_TOAST_WARNING,
  MAP_WARNING_BANNER,
  MENU_BTN,
  MENU_BTN_SM,
  MENU_CARD,
  MENU_PANEL,
  INNER_RADIUS,
  SURFACE_RADIUS,
} from '../../components/layout/infoBoxTemplate'
import { MapView } from '../../maps/MapView'
import { toast as sonnerToast } from 'sonner'
import { BetaAccountPanel } from '../account/BetaAccountPanel'
import { forwardGeocodeSearch } from '../../services/geocoding'
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
  driverDocumentsExpiryAttention,
  driverDocumentStatusLabel,
  formatDriverDocExpiresLine,
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
import { DriverMapAvailabilityMicroToggle } from './DriverMapAvailabilityMicroToggle'
import { ProfileButton } from '@/design-system/components/app/ProfileButton'
import { SettingsButton } from '@/design-system/components/app/SettingsButton'

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

/** Com `mapTapGoesOnline`, o único CTA táctil no mapa fica o toque no mapa; pill só em mock/demo. */
function DriverShellAvailabilityInner({
  mapTapGoesOnline,
  offline,
  onGoOnline,
  onGoOffline,
}: {
  mapTapGoesOnline: boolean
  offline: boolean
  onGoOnline: () => void
  onGoOffline: () => void
}) {
  if (!offline) {
    return <DriverMapAvailabilityPill onGoOffline={onGoOffline} />
  }
  if (mapTapGoesOnline) {
    return (
      <div
        className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-none border-0 bg-background/90 px-3 py-2 text-center text-xs font-semibold text-muted-foreground shadow-none backdrop-blur-sm sm:text-sm"
        role="status"
        aria-live="polite"
      >
        <span className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground/80 ring-2 ring-border" aria-hidden />
        <span className="leading-snug">
          Offline — toca no mapa para ficares disponível.
          <span className="sr-only"> Alternativa: Menu → «Ficar disponível».</span>
        </span>
      </div>
    )
  }
  return <DriverMapOfflinePill onGoOnline={onGoOnline} />
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

function formatDrivingDurationShort(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h <= 0) return `${m} min`
  if (m <= 0) return `${h} h`
  return `${h} h ${m} min`
}

export function DriverDashboard() {
  useDia23LayoutProbe('driver')
  const { token, sessionRole } = useAuth()
  const { addLog, setStatus } = useActivityLog()
  const { driverActiveTripId, setDriverActiveTripId } = useActiveTrip()
  const activeTripId = driverActiveTripId

  const driverHomeTwoStep = isDriverHomeTwoStepEnabled()
  const driverBottomNav = isDriverBottomNavEnabled()
  const [offline, setOffline] = useState(getStoredOffline)
  useScreenWakeLock(
    sessionRole === 'driver' &&
    Boolean(token) &&
    (!offline || Boolean(activeTripId)),
  )

  /** GPS activo em disponível ou com viagem; offline poupa bateria e prompts. */
  const geoWatchEnabled =
    isMockLocationModeEnabled() ||
    isDemoLocationEnabled() ||
    !driverBottomNav ||
    Boolean(activeTripId) ||
    !offline

  const {
    position: geoDriverPosition,
    usedFallback: geolocationUsedFallback,
    retry: retryGeolocation,
  } = useGeolocation({
    mockRole: 'driver',
    watchEnabled: geoWatchEnabled,
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
  const [driverAcceptSoundTick, setDriverAcceptSoundTick] = useState(0)
  const [driverCompleteSoundTick, setDriverCompleteSoundTick] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  /** Ecrã activo no menu lateral (controlado — deep link Rendimentos/Caixa; sem setState em useEffect). */
  const [driverMenuScreen, setDriverMenuScreen] = useState<DriverMenuScreen>('root')
  /** Leitura síncrona no bottom nav (evita setDriverShellTab dentro do updater de setMenuOpen). */
  const menuOpenRef = useRef(menuOpen)
  menuOpenRef.current = menuOpen
  const [driverShellTab, setDriverShellTab] = useState<DriverShellTab>('home')
  const [driverHomeStep, setDriverHomeStep] = useState<1 | 2>(() =>
    isDriverHomeTwoStepEnabled() ? 1 : 2
  )
  const showDriverHomeStep1 = driverHomeTwoStep && !activeTripId && driverHomeStep === 1
  /** Shell Manel: mapa em fundo (flex-1); sem scroll longo no início. */
  const driverMapStageLayout = Boolean(driverBottomNav && !showDriverHomeStep1)
  const [selectedOfferTripId, setSelectedOfferTripId] = useState<string | null>(null)
  const mapTapGoesOnline =
    driverBottomNav &&
    !activeTripId &&
    !isMockLocationModeEnabled() &&
    !isDemoLocationEnabled()
  const driverMapTapOnlineHint = mapTapGoesOnline && offline
  const [actionTakingLong, setActionTakingLong] = useState(false)
  /** P3: resposta da última ação até o poll alinhar (evita atraso visual). */
  const [driverStatusOverride, setDriverStatusOverride] = useState<string | null>(null)
  /** P25: última informação conhecida se o poll falhar logo após aceitar. */
  const [acceptedDetailFallback, setAcceptedDetailFallback] = useState<TripDetailResponse | null>(null)
  const [dismissedOfferTripIds, setDismissedOfferTripIds] = useState<Set<string>>(() =>
    readDismissedOfferTripIds()
  )
  const dismissOffer = useCallback((tripId: string) => {
    setDismissedOfferTripIds((prev) => {
      const next = new Set(prev)
      next.add(tripId)
      persistDismissedOfferTripIds(next)
      return next
    })
    setSelectedOfferTripId((prev) => (prev === tripId ? null : prev))
  }, [])
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
      if (checked) warmDriverNavSessionIfNeeded()
      addLog(checked ? 'Toggle: Disponível' : 'Toggle: Offline', 'info')
      setStatus(checked ? 'Disponível' : 'Offline')
    },
    [addLog, driverDocsGateEnabled, driverDocuments, setStatus]
  )

  /** Toque no mapa: ficar disponível (mesmas regras que a pill). */
  const onDriverHomeMapInteraction = useCallback(() => {
    if (!mapTapGoesOnline || !offline) return
    handleDriverAvailabilityChange(true)
  }, [mapTapGoesOnline, offline, handleDriverAvailabilityChange])

  const pollEnabled = !!token && !offline

  const driverActiveTripPoll = useDriverActiveTripPoll(
    activeTripId,
    token,
    Boolean(activeTripId && token)
  )

  const compliancePollEnabled = Boolean(token && sessionRole === 'driver')
  const { data: drivingCompliance } = usePolling(
    () => getDriverDrivingHoursCompliance(token!),
    [token],
    compliancePollEnabled,
    30_000
  )

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
      .filter((t) => !dismissedOfferTripIds.has(t.trip_id))
      .filter((t) => !isDriverOfferExpired(t.expires_at))
  }, [availableWithCategoryMeta, vehicleCategories, dismissedOfferTripIds])
  const filteredOutCount = Math.max(0, (available?.length ?? 0) - filteredAvailable.length)
  const hasAvailableTrips = filteredAvailable.length > 0
  const compactDriverSurface = !activeTripId && !offline && hasAvailableTrips
  const pendingOfferPickupsForMap = useMemo(() => {
    if (activeTripId || filteredAvailable.length === 0) return null
    return filteredAvailable.slice(0, 8).map((t, i) => ({
      lat: t.origin_lat,
      lng: t.origin_lng,
      label: String(i + 1),
      tripId: t.trip_id,
    }))
  }, [activeTripId, filteredAvailable])

  const selectedAvailableTrip = useMemo(
    () =>
      selectedOfferTripId
        ? (filteredAvailable.find((t) => t.trip_id === selectedOfferTripId) ?? null)
        : null,
    [filteredAvailable, selectedOfferTripId]
  )

  const selectedOfferMapPreview = useMemo(() => {
    if (!selectedAvailableTrip) return null
    const t = selectedAvailableTrip
    return {
      pickup: { lat: t.origin_lat, lng: t.origin_lng },
      dropoff: { lat: t.destination_lat, lng: t.destination_lng },
    }
  }, [selectedAvailableTrip])

  const activeTripMapGeo = useMemo(() => {
    if (!activeTripId || !acceptedDetailFallback) return null
    const d = acceptedDetailFallback
    return {
      pickup: { lat: d.origin_lat, lng: d.origin_lng },
      dropoff: { lat: d.destination_lat, lng: d.destination_lng },
    }
  }, [activeTripId, acceptedDetailFallback])

  const driverMapStageRoute = useMemo(() => {
    if (
      import.meta.env.DEV &&
      isMockLocationModeEnabled() &&
      mockStableRouteEndpoints &&
      activeTripId
    ) {
      return mockStableRouteEndpoints
    }
    const geo = activeTripId ? activeTripMapGeo : selectedOfferMapPreview
    if (!geo) return undefined
    return { from: geo.pickup, to: geo.dropoff }
  }, [activeTripId, activeTripMapGeo, selectedOfferMapPreview, mockStableRouteEndpoints])

  const mapStageTripPickup = activeTripId
    ? (activeTripMapGeo?.pickup ?? null)
    : (selectedOfferMapPreview?.pickup ?? null)
  const mapStageTripDropoff = activeTripId
    ? (activeTripMapGeo?.dropoff ?? null)
    : (selectedOfferMapPreview?.dropoff ?? null)
  const mapStagePendingOffers = activeTripId ? null : pendingOfferPickupsForMap

  const onPendingOfferPickupClick = useCallback((tripId: string) => {
    setSelectedOfferTripId(tripId)
  }, [])

  const offerIdsFingerprint = useMemo(
    () => [...filteredAvailable].map((t) => t.trip_id).sort().join('|'),
    [filteredAvailable]
  )

  useEffect(() => {
    setSelectedOfferTripId((prev) => {
      if (!prev) return null
      return filteredAvailable.some((t) => t.trip_id === prev) ? prev : null
    })
  }, [offerIdsFingerprint, filteredAvailable])
  useDriverOfferSounds({
    enabled: sessionRole === 'driver' && Boolean(token) && !offline,
    offerIdsFingerprint,
    acceptSignal: driverAcceptSoundTick,
    completeSignal: driverCompleteSoundTick,
  })

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

  useEffect(() => {
    if (!token || sessionRole !== 'driver') return
    let cancelled = false
    void fetchDriverDocuments(token)
      .then((server) => {
        if (cancelled) return
        setDriverDocuments((prev) => {
          const merged = mergeServerDriverDocuments(prev, server)
          setDriverDocumentsState(merged)
          return merged
        })
      })
      .catch(() => {
        /* API antiga ou offline */
      })
    return () => {
      cancelled = true
    }
  }, [token, sessionRole])

  // Sync backend when token/offline changes; não forçar /online com viagem activa (repor is_available).
  useEffect(() => {
    if (!token) return
    if (offline) {
      void setDriverOffline(token).catch(() => { })
      return
    }
    if (activeTripId) return
    void setDriverOnline(token).catch((err: unknown) => {
      const e = err as { status?: number; detail?: unknown }
      if (e?.status === 409 && e?.detail === 'driving_hours_blocked') {
        setOffline(true)
        setToast(
          'Limite de tempo de condução ou repouso legal: não foi possível ficar disponível. Ver o aviso de horas no ecrã.'
        )
        addLog('Bloqueio: horas de condução / repouso', 'error')
      }
    })
  }, [token, offline, activeTripId, addLog])

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
    // Não definir activeTripId antes do POST: o poll GET pode 404 até o accept persistir driver_id.
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
      if (actionName === 'ACEITAR') {
        setSelectedOfferTripId(null)
        sonnerToast.success('Viagem aceite')
        setDriverAcceptSoundTick((n) => n + 1)
      }
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
        openDriverExternalNav(availableForFallback.origin_lat, availableForFallback.origin_lng)
        sonnerToast.message(`A abrir ${driverNavAppLabel()} (recolha)`, { duration: 3000 })
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
      if (e?.status === 409) {
        if (e?.detail === 'driving_hours_blocked') {
          setOffline(true)
          setError(
            'Não podes aceitar novas viagens: limite de tempo de condução neste dia civil ou período de repouso obrigatório (informação genérica — validar quadro legal com apoio jurídico).'
          )
          addLog('409: Bloqueio horas de condução ao aceitar', 'error')
          refetchAvailable()
        } else {
          setToast('Viagem já foi aceite por outro motorista.')
          addLog('409: Viagem já aceite por outro motorista', 'error')
          refetchAvailable()
        }
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

  const closeDriverMenu = useCallback(() => {
    setMenuOpen(false)
    setDriverMenuScreen('root')
    setDriverShellTab('home')
  }, [])

  const handleBottomNav = useCallback(
    (tab: DriverShellTab) => {
      if (tab === 'home') {
        setDriverShellTab('home')
        setMenuOpen(false)
        setDriverMenuScreen('root')
        if (driverHomeTwoStep && !activeTripId) setDriverHomeStep(2)
        document.getElementById('driver-main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' })
        if (token && pollEnabled) void refetchAvailable()
        return
      }
      if (tab === 'menu') {
        const nextOpen = !menuOpenRef.current
        if (nextOpen) setDriverMenuScreen('root')
        setMenuOpen(nextOpen)
        setDriverShellTab(nextOpen ? 'menu' : 'home')
        return
      }
      setDriverMenuScreen(tab === 'earnings' ? 'earnings' : 'inbox')
      setDriverShellTab(tab)
      setMenuOpen(true)
    },
    [activeTripId, driverHomeTwoStep, pollEnabled, refetchAvailable, token]
  )

  const clearDriverActiveTripUi = useCallback(() => {
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
  }, [refetchAvailable, refetchHistory, setDriverActiveTripId, setStatus])

  const onActiveTripCancelled = useCallback(() => {
    clearDriverActiveTripUi()
  }, [clearDriverActiveTripUi])

  const onActiveTripNotFound = useCallback(() => {
    clearDriverActiveTripUi()
    sonnerToast.info('Esta viagem já não está disponível na tua sessão.')
  }, [clearDriverActiveTripUi])

  const driverTripPartialAfterComplete = useCallback(() => {
    setDriverCompleteSoundTick((n) => n + 1)
    tripSimStopRef.current?.()
    tripSimStopRef.current = null
    setMockSimulatedPosition(null)
    setMockStableRouteEndpoints(null)
    acceptedTripGeoRef.current = null
    setDriverStatusOverride(null)
    setStatus('Pronto')
    refetchHistory()
    refetchAvailable()
  }, [refetchAvailable, refetchHistory, setStatus])

  const driverActiveTripPanel =
    activeTripId != null && token ? (
      <div className="space-y-2">
        <ActiveTripSummary
          compact
          tripId={activeTripId}
          token={token}
          statusOverride={driverStatusOverride}
          detailFallback={acceptedDetailFallback}
          sharedPoll={driverActiveTripPoll}
          sessionRole={sessionRole}
          onClearStatusOverride={() => setDriverStatusOverride(null)}
          onTripCancelled={onActiveTripCancelled}
          onTripNotFound={onActiveTripNotFound}
          onDismissCompletedTrip={clearDriverActiveTripUi}
        />
        <ActiveTripActions
          tripId={activeTripId}
          token={token}
          tripDetailFallback={acceptedDetailFallback}
          sharedPoll={driverActiveTripPoll}
          driverLocation={mapDotLatLng ?? null}
          addLog={addLog}
          setStatus={setStatus}
          statusOverride={driverStatusOverride}
          onClearStatusOverride={() => setDriverStatusOverride(null)}
          onTripActionSuccess={(s) => {
            setDriverStatusOverride(s)
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
                  void sendDriverLocation(pickup.lat, pickup.lng, token)
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
          onComplete={clearDriverActiveTripUi}
          onTripCompleted={driverTripPartialAfterComplete}
          onError={setError}
        />
      </div>
    ) : null

  const bottomChrome =
    driverBottomNav && showDriverHomeStep1 && activeTripId == null ? (
      <div className="w-full border-t border-border bg-background/95 backdrop-blur-sm">
        <div className="border-b border-border bg-muted/35">
          <DriverShellAvailabilityInner
            mapTapGoesOnline={mapTapGoesOnline}
            offline={offline}
            onGoOnline={() => handleDriverAvailabilityChange(true)}
            onGoOffline={() => handleDriverAvailabilityChange(false)}
          />
        </div>
        <div className="px-4 py-2">
          <button
            type="button"
            data-testid="driver-home-step1-continue-fixed"
            disabled={offline}
            onClick={() => setDriverHomeStep(2)}
            className={BTN_DRIVER_STEP1}
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
        <DriverBottomNav active={driverShellTab} onSelect={handleBottomNav} />
      </div>
    ) : activeTripId != null ? (
      driverMapStageLayout ? (
        !menuOpen ? <DriverBottomNav active={driverShellTab} onSelect={handleBottomNav} /> : undefined
      ) : (
        <div className="w-full border-t border-border bg-background shadow-[0_-4px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.35)]">
          <div className="px-4 pt-2 pb-1">{driverActiveTripPanel}</div>
          {!menuOpen ? <DriverBottomNav active={driverShellTab} onSelect={handleBottomNav} /> : null}
        </div>
      )
    ) : driverBottomNav ? (
      <DriverBottomNav active={driverShellTab} onSelect={handleBottomNav} />
    ) : undefined

  return (
    <div
      className={
        driverMapStageLayout
          ? 'flex h-0 min-h-0 min-w-0 flex-1 flex-col'
          : 'contents'
      }
    >
      <div className="fixed bottom-0 right-0 z-[60] h-0 w-0 overflow-hidden opacity-0" aria-hidden>
        <ProfileButton />
        <SettingsButton />
      </div>
      <ScreenContainer
        fullBleed
        contentVariant={driverMapStageLayout ? 'driverImmersive' : 'default'}
        bottomButton={bottomChrome}
        bottomBarVariant={activeTripId ? 'inset' : driverBottomNav ? 'flush' : 'inset'}
        mainScrollId="driver-main-scroll"
        mainScrollable={!driverMapStageLayout}
      >
        <DriverSideMenu
          open={menuOpen}
          onOpenChange={(v) => {
            setMenuOpen(v)
            if (!v) setDriverMenuScreen('root')
          }}
          screen={driverMenuScreen}
          onScreenChange={setDriverMenuScreen}
          sessionDisplayName={sessionDisplayName}
          history={history}
          driverLocationForZones={mapDotLatLng ?? null}
          navPref={driverNavPref}
          vehicleCategories={vehicleCategories}
          driverDocuments={driverDocuments}
          driverDocsGateEnabled={driverDocsGateEnabled}
          onSelectNavPref={(app) => {
            setDriverNavApp(app)
            setDriverNavPref(app)
            addLog(app === 'waze' ? 'Preferência navegação: Waze' : 'Preferência navegação: Google Maps', 'info')
          }}
          onToggleVehicleCategory={(category) => {
            setVehicleCategories((prev) => {
              const exists = prev.includes(category)
              const next = exists ? prev.filter((c) => c !== category) : [...prev, category]
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
                docDetails: prev.docDetails,
                onboardingCompleted:
                  prev.onboardingCompleted || REQUIRED_DRIVER_DOCUMENTS.every((k) => docs[k] === 'approved'),
              }
              setDriverDocumentsState(next)
              if (token) {
                void patchDriverDocuments(token, { [doc]: { status } })
                  .then((server) => {
                    setDriverDocuments((p) => {
                      const merged = mergeServerDriverDocuments(p, server)
                      setDriverDocumentsState(merged)
                      return merged
                    })
                  })
                  .catch(() => { })
              }
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
          renderLegacyMenu={(section) => (
            <div className={INFO_BOX_DRIVER_MENU}>
              <DriverOperationsMenu
                section={section}
                hideHeader
                hideCloseButton
                sessionDisplayName={sessionDisplayName}
                history={history}
                driverLocationForZones={mapDotLatLng ?? null}
                navPref={driverNavPref}
                vehicleCategories={vehicleCategories}
                driverDocuments={driverDocuments}
                driverDocsGateEnabled={driverDocsGateEnabled}
                onCloseMenu={closeDriverMenu}
                onSelectNavPref={(app) => {
                  setDriverNavApp(app)
                  setDriverNavPref(app)
                  addLog(app === 'waze' ? 'Preferência navegação: Waze' : 'Preferência navegação: Google Maps', 'info')
                }}
                onToggleVehicleCategory={(category) => {
                  setVehicleCategories((prev) => {
                    const exists = prev.includes(category)
                    const next = exists ? prev.filter((c) => c !== category) : [...prev, category]
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
                      docDetails: prev.docDetails,
                      onboardingCompleted:
                        prev.onboardingCompleted || REQUIRED_DRIVER_DOCUMENTS.every((k) => docs[k] === 'approved'),
                    }
                    setDriverDocumentsState(next)
                    if (token) {
                      void patchDriverDocuments(token, { [doc]: { status } })
                        .then((server) => {
                          setDriverDocuments((p) => {
                            const merged = mergeServerDriverDocuments(p, server)
                            setDriverDocumentsState(merged)
                            return merged
                          })
                        })
                        .catch(() => { })
                    }
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
              />
            </div>
          )}
          shellOffline={offline}
          activeTripId={activeTripId}
          onRequestGoAvailable={() => handleDriverAvailabilityChange(true)}
        />

        {showDriverHomeStep1 ? (
          <div
            className="space-y-4 transition-opacity duration-150"
            data-testid="driver-home-step1"
          >
            {(!offline || driverBottomNav) && (
              <>
                <div className="relative flex min-h-[min(40vh,20rem)] flex-1 overflow-hidden">
                  <MapView
                    className="!rounded-none border-0 !shadow-none absolute inset-0"
                    driverLocation={mapDotLatLng}
                    tripPickup={mapStageTripPickup}
                    tripDropoff={mapStageTripDropoff}
                    pendingOfferPickups={mapStagePendingOffers}
                    onPendingOfferPickupClick={onPendingOfferPickupClick}
                    route={driverMapStageRoute}
                    mapVisualWeight={offline && driverBottomNav ? 'subdued' : 'emphasized'}
                    compactHeight={false}
                    tallStage={driverBottomNav && !activeTripId}
                    onUserMapInteraction={mapTapGoesOnline ? onDriverHomeMapInteraction : undefined}
                  />
                  <div className="pointer-events-none absolute inset-0 z-[5] flex min-h-0 flex-col gap-2 p-2">
                    <div className={`${MAP_BANNER_STACK} pointer-events-auto`}>
                      {geolocationUsedFallback && (
                        <div
                          className={MAP_WARNING_BANNER}
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
                        </div>
                      )}
                      {drivingCompliance?.enabled && (drivingCompliance.warning || drivingCompliance.blocked) ? (
                        <div
                          className={`${BTN_SECONDARY_RADIUS} border px-3 py-2 text-sm ${drivingCompliance.blocked
                            ? 'bg-destructive/10 border-destructive/35 text-destructive'
                            : 'bg-warning/15 border-warning/40 text-foreground'
                            }`}
                          data-testid="driver-driving-hours-banner"
                        >
                          {drivingCompliance.blocked ? (
                            <>
                              <p className="font-semibold leading-snug">Tempo de condução / repouso</p>
                              <p className="mt-1 text-foreground/90 leading-snug">
                                [PLACEHOLDER] Não podes ficar disponível nem aceitar novas viagens até cumprires o
                                período de repouso ou o limite diário deixar de aplicar (dia civil, Lisboa). Texto
                                genérico — substituir após validação do diploma e articulados aplicáveis
                                (acompanhamento jurídico).
                              </p>
                              {drivingCompliance.rest_until ? (
                                <p className="mt-1 text-xs opacity-90">
                                  Repouso até:{' '}
                                  {new Date(drivingCompliance.rest_until).toLocaleString('pt-PT', {
                                    timeZone: 'Europe/Lisbon',
                                  })}
                                </p>
                              ) : null}
                            </>
                          ) : (
                            <>
                              <p className="font-medium leading-snug">Aviso de tempo de condução</p>
                              <p className="mt-1 text-foreground/85 leading-snug">
                                [PLACEHOLDER] Hoje levaste cerca de{' '}
                                <strong>{formatDrivingDurationShort(drivingCompliance.active_seconds_today)}</strong>{' '}
                                em viagem activa (máx. referência{' '}
                                {formatDrivingDurationShort(drivingCompliance.max_seconds)} / dia civil, Lisboa). Evita
                                aceitar serviços se estiveres perto do limite — quadro legal a substituir após
                                validação normativa.
                              </p>
                            </>
                          )}
                        </div>
                      ) : null}
                      {(import.meta.env.DEV || gpsReport.lastError) &&
                        !offline &&
                        !!token &&
                        !!driverLocation ? (
                        <details
                          className={MAP_CHIP_OVERLAY}
                          data-testid="driver-gps-upload-details"
                        >
                          <summary className="cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                            <span>
                              GPS envio:{' '}
                              {gpsReport.lastError ? (
                                <span className="text-destructive font-medium">
                                  erro {gpsReport.lastError.status ?? ''}
                                </span>
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
                                {serverLoc.lng.toFixed(5)} (age ~
                                {Math.max(0, Math.round((Date.now() - serverLoc.timestamp) / 1000))}s)
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
                      ) : null}
                      {!isOnline && (
                        <div className={MAP_HINT_WARNING}>
                          <p className="font-medium text-foreground">Sem ligação à internet</p>
                          <p className="text-foreground/80 mt-1">
                            Quando voltares a ficar online, a app volta a actualizar. Podes recarregar a página se
                            precisares.
                          </p>
                        </div>
                      )}
                      {pollEnabled && availablePollFault && (
                        <div className={MAP_HINT_WARNING}>
                          Não foi possível actualizar a lista de viagens. A última informação mantém-se; voltamos a
                          tentar automaticamente — verifica a ligação se persistir.
                        </div>
                      )}
                      {historyPollFault && (
                        <div className={MAP_HINT_WARNING_SM}>
                          Não foi possível actualizar o histórico. Voltamos a tentar — verifica a ligação se o aviso
                          persistir.
                        </div>
                      )}
                      {toast && (
                        <div className={MAP_TOAST_WARNING}>
                          <button
                            type="button"
                            className={MAP_DISMISS_BTN_WARNING}
                            aria-label="Fechar aviso"
                            onClick={() => setToast(null)}
                          >
                            ×
                          </button>
                          <p className="leading-snug">{toast}</p>
                        </div>
                      )}
                      {error && (
                        <div className={MAP_TOAST_ERROR}>
                          <button
                            type="button"
                            className={MAP_DISMISS_BTN_ERROR}
                            aria-label="Fechar mensagem de erro"
                            onClick={() => setError(null)}
                          >
                            ×
                          </button>
                          <p className="leading-snug">{error}</p>
                        </div>
                      )}
                      {actionLoading && actionTakingLong ? (
                        <p className="text-center text-sm text-foreground/70" aria-live="polite">
                          Ainda a processar… Se demorar muito, verifica a ligação.
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {driverMapTapOnlineHint ? (
                    <div
                      className="pointer-events-none absolute inset-x-0 bottom-14 z-[3] flex justify-center px-3"
                      aria-hidden
                    >
                      <span className="rounded-full border border-border bg-background/92 px-3 py-1.5 text-center text-xs font-medium text-foreground shadow-sm backdrop-blur-sm">
                        Toca no mapa para ficares disponível e activar o GPS
                      </span>
                    </div>
                  ) : null}
                </div>
                {!offline && !activeTripId ? (
                  pollEnabled && availableLoading && available == null ? (
                    <div className={MAP_IDLE_PLACEHOLDER}>
                      <Spinner size="md" />
                      <p className="text-xs text-foreground/80">A carregar viagens…</p>
                    </div>
                  ) : hasAvailableTrips ? (
                    <div
                      id="driver-main-scroll"
                      className={MAP_STEP1_LIST}
                    >
                      <StatusHeader
                        label={
                          filteredAvailable.length === 1
                            ? '1 viagem disponível'
                            : `${filteredAvailable.length} viagens disponíveis`
                        }
                        variant="idle"
                        emphasis="subdued"
                        compact
                      />
                      <ul className="mt-2 space-y-3 pb-1">
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
                              expiresAt={t.expires_at ?? null}
                              dismissButtonTestId={`driver-dismiss-${t.trip_id}`}
                              onDismiss={() => dismissOffer(t.trip_id)}
                              acceptButtonTestId={`driver-accept-${t.trip_id}`}
                              acceptVariant="slide"
                              onAccept={() =>
                                runAction(
                                  () => acceptTrip(t.trip_id, token!),
                                  t.trip_id,
                                  'ACEITAR',
                                  undefined,
                                  t
                                )
                              }
                              loading={actionLoading === t.trip_id}
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div
                      id="driver-main-scroll"
                      className="rounded-md border border-border/60 bg-muted/15 px-2 py-1.5 text-center"
                    >
                      <p className="text-xs font-medium text-foreground/90">À espera de viagens</p>
                      <p className="mt-0.5 text-[11px] leading-snug text-foreground/65">
                        {hasAnyCategoryAwareOffer && filteredOutCount > 0
                          ? `Existem ${filteredOutCount} viagem(ns) fora das tuas categorias activas.`
                          : 'Sem pedidos. Histórico em Menu → Viagens.'}
                      </p>
                    </div>
                  )
                ) : null}
              </>
            )}
            {offline && !driverBottomNav && (
              <div className={MAP_EMPTY_STATE}>
                <p className="text-foreground/85 text-base">Estás offline.</p>
                <p className="text-foreground/75 mt-2 text-sm">Activa a disponibilidade para veres o mapa.</p>
              </div>
            )}
            {!driverBottomNav ? (
              <button
                type="button"
                data-testid="driver-home-step1-continue"
                disabled={offline}
                onClick={() => setDriverHomeStep(2)}
                className={BTN_DRIVER_STEP1}
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
            ) : null}
          </div>
        ) : (
          <div
            className={driverMapStageLayout ? 'flex min-h-0 w-full flex-1 flex-col overflow-hidden' : 'contents'}
          >
            {(!driverMapStageLayout ||
              (driverHomeTwoStep && !activeTripId && driverHomeStep === 2)) && (
                <header
                  className={`${driverMapStageLayout ? 'shrink-0 px-4 mb-1' : 'mb-4'} flex items-start gap-3 justify-end`}
                >
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {driverHomeTwoStep && !activeTripId && driverHomeStep === 2 ? (
                      <button
                        type="button"
                        data-testid="driver-home-map-initial"
                        onClick={() => setDriverHomeStep(1)}
                        className={BTN_SECONDARY_FULL_SM}
                      >
                        Vista compacta
                      </button>
                    ) : null}
                    {!driverBottomNav ? (
                      <button
                        type="button"
                        data-testid="driver-open-menu"
                        onClick={() => {
                          setMenuOpen((v) => {
                            const next = !v
                            if (next) setDriverMenuScreen('root')
                            return next
                          })
                        }}
                        className={BTN_SECONDARY_MD}
                      >
                        {menuOpen ? 'Fechar menu' : 'Menu'}
                      </button>
                    ) : null}
                  </div>
                </header>
              )}

            {driverMapStageLayout && (!offline || driverBottomNav) && (
              <MapStage
                testId="driver-map-stage"
                map={{
                  driverLocation: mapDotLatLng,
                  tripPickup: mapStageTripPickup,
                  tripDropoff: mapStageTripDropoff,
                  pendingOfferPickups: mapStagePendingOffers,
                  onPendingOfferPickupClick: activeTripId ? undefined : onPendingOfferPickupClick,
                  route: driverMapStageRoute,
                  mapVisualWeight: 'emphasized',
                  compactHeight: false,
                  tallStage: false,
                  onUserMapInteraction: mapTapGoesOnline ? onDriverHomeMapInteraction : undefined,
                }}
                floating={
                  <>
                    {driverBottomNav && !activeTripId ? (
                      <DriverMapAvailabilityMicroToggle
                        offline={offline}
                        mapTapGoesOnline={mapTapGoesOnline}
                        onGoOnline={() => handleDriverAvailabilityChange(true)}
                        onGoOffline={() => handleDriverAvailabilityChange(false)}
                      />
                    ) : null}
                  </>
                }
              >
                <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col gap-2 p-2 pb-20 pointer-events-none">
                  <div className={`${MAP_BANNER_STACK} pointer-events-auto`}>
                    {geolocationUsedFallback && (
                      <div
                        className={MAP_WARNING_BANNER}
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
                      </div>
                    )}
                    {drivingCompliance?.enabled && (drivingCompliance.warning || drivingCompliance.blocked) ? (
                      <div
                        className={`${BTN_SECONDARY_RADIUS} border px-3 py-2 text-sm ${drivingCompliance.blocked
                          ? 'bg-destructive/10 border-destructive/35 text-destructive'
                          : 'bg-warning/15 border-warning/40 text-foreground'
                          }`}
                        data-testid="driver-driving-hours-banner"
                      >
                        {drivingCompliance.blocked ? (
                          <>
                            <p className="font-semibold leading-snug">Tempo de condução / repouso</p>
                            <p className="mt-1 text-foreground/90 leading-snug">
                              Não podes ficar disponível nem aceitar novas viagens até terminar o período de
                              repouso ou o limite do dia (referência Lisboa) deixar de bloquear.
                            </p>
                            {drivingCompliance.rest_until ? (
                              <p className="mt-1 text-xs opacity-90">
                                Repouso até:{' '}
                                {new Date(drivingCompliance.rest_until).toLocaleString('pt-PT', {
                                  timeZone: 'Europe/Lisbon',
                                })}
                              </p>
                            ) : null}
                          </>
                        ) : (
                          <>
                            <p className="font-medium leading-snug">Aviso de tempo de condução</p>
                            <p className="mt-1 text-foreground/85 leading-snug">
                              Hoje: <strong>{formatDrivingDurationShort(drivingCompliance.active_seconds_today)}</strong>{' '}
                              em viagem activa (tecto referência{' '}
                              {formatDrivingDurationShort(drivingCompliance.max_seconds)} / dia, Lisboa). Se estiveres
                              perto do limite, evita novas aceitações.
                            </p>
                          </>
                        )}
                      </div>
                    ) : null}
                    {!offline && !!token && !!driverLocation && (import.meta.env.DEV || gpsReport.lastError) ? (
                      <details
                        className={MAP_CHIP_OVERLAY}
                        data-testid="driver-gps-upload-details"
                      >
                        <summary className="cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                          <span>
                            GPS envio:{' '}
                            {gpsReport.lastError ? (
                              <span className="text-destructive font-medium">
                                erro {gpsReport.lastError.status ?? ''}
                              </span>
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
                              {serverLoc.lng.toFixed(5)} (age ~
                              {Math.max(0, Math.round((Date.now() - serverLoc.timestamp) / 1000))}s)
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
                    ) : null}
                    {!isOnline && (
                      <div className={MAP_HINT_WARNING}>
                        <p className="font-medium text-foreground">Sem ligação à internet</p>
                        <p className="text-foreground/80 mt-1">
                          Quando voltares a ficar online, a app volta a atualizar. Podes recarregar a página se
                          precisares.
                        </p>
                      </div>
                    )}
                    {pollEnabled && availablePollFault && (
                      <div className={MAP_HINT_WARNING}>
                        Não foi possível actualizar a lista de viagens. A última informação mantém-se; voltamos a
                        tentar automaticamente — verifica a ligação se persistir.
                      </div>
                    )}
                    {historyPollFault && (
                      <div className={MAP_HINT_WARNING_SM}>
                        Não foi possível actualizar o histórico. Voltamos a tentar — verifica a ligação se o aviso
                        persistir.
                      </div>
                    )}
                    {toast && (
                      <div className={MAP_TOAST_WARNING}>
                        <button
                          type="button"
                          className={MAP_DISMISS_BTN_WARNING}
                          aria-label="Fechar aviso"
                          onClick={() => setToast(null)}
                        >
                          ×
                        </button>
                        <p className="leading-snug">{toast}</p>
                      </div>
                    )}
                    {error && (
                      <div className={MAP_TOAST_ERROR}>
                        <button
                          type="button"
                          className={MAP_DISMISS_BTN_ERROR}
                          aria-label="Fechar mensagem de erro"
                          onClick={() => setError(null)}
                        >
                          ×
                        </button>
                        <p className="leading-snug">{error}</p>
                      </div>
                    )}
                    {actionLoading && actionTakingLong ? (
                      <p className="text-center text-sm text-foreground/70" aria-live="polite">
                        Ainda a processar… Se demorar muito, verifica a ligação.
                      </p>
                    ) : null}
                  </div>
                  {activeTripId ? (
                    <MapBottomSheet className={`pointer-events-auto ${MAP_SHEET_CLASS} ${MAP_SHEET_MAX_H_TRIP}`}>
                      {driverActiveTripPanel}
                    </MapBottomSheet>
                  ) : !offline ? (
                    <MapBottomSheet
                      id="driver-main-scroll"
                      className={`${MAP_SHEET_CLASS} ${selectedAvailableTrip
                        ? MAP_SHEET_MAX_H_OFFER
                        : hasAvailableTrips
                          ? MAP_SHEET_MAX_H_WAIT
                          : pollEnabled && availableLoading && available == null
                            ? 'max-h-[min(22dvh,160px)]'
                            : MAP_SHEET_MAX_H_WAIT
                        }`}
                    >
                      {selectedAvailableTrip ? (
                        <ActionPanel
                          closeVariant="icon"
                          closeTestId="driver-offer-panel-close"
                          onClose={() => setSelectedOfferTripId(null)}
                        >
                          <RequestCard
                            contextHint={DRIVER_NEW_TRIP_LIST_HINT}
                            pickup={formatPickup(
                              selectedAvailableTrip.origin_lat,
                              selectedAvailableTrip.origin_lng
                            )}
                            destination={formatDestination(
                              selectedAvailableTrip.destination_lat,
                              selectedAvailableTrip.destination_lng
                            )}
                            statusLabel={DRIVER_AVAILABLE_TRIP_STATUS_LABEL}
                            vehicleCategoryLabel={(() => {
                              const one = normalizeDriverVehicleCategory(
                                selectedAvailableTrip.vehicle_category ?? undefined
                              )
                              return one ? driverVehicleCategoryLabel(one) : null
                            })()}
                            estimatedPrice={selectedAvailableTrip.estimated_price}
                            offerId={selectedAvailableTrip.offer_id ?? null}
                            expiresAt={selectedAvailableTrip.expires_at ?? null}
                            dismissButtonTestId={`driver-dismiss-${selectedAvailableTrip.trip_id}`}
                            onDismiss={() => dismissOffer(selectedAvailableTrip.trip_id)}
                            acceptButtonTestId={`driver-accept-${selectedAvailableTrip.trip_id}`}
                            acceptVariant="slide"
                            onAccept={() =>
                              runAction(
                                () => acceptTrip(selectedAvailableTrip.trip_id, token!),
                                selectedAvailableTrip.trip_id,
                                'ACEITAR',
                                undefined,
                                selectedAvailableTrip
                              )
                            }
                            loading={actionLoading === selectedAvailableTrip.trip_id}
                          />
                        </ActionPanel>
                      ) : hasAvailableTrips ? (
                        <div className={`${INFO_BOX_MAP_HINT} px-2 py-2 text-center space-y-1`}>
                          <p className="text-xs font-medium text-foreground/90">
                            {filteredAvailable.length === 1
                              ? '1 viagem no mapa'
                              : `${filteredAvailable.length} viagens no mapa`}
                          </p>
                          <HintLine
                            className="text-[11px] text-foreground/65"
                            testId="driver-map-offer-hint"
                          >
                            Toca no marcador no mapa para ver o pedido e aceitar.
                          </HintLine>
                        </div>
                      ) : pollEnabled && availableLoading && available == null ? (
                        <div className={`${INFO_BOX_MAP_HINT} px-2 py-1.5 text-center`}>
                          <div className="flex flex-col items-center justify-center gap-1.5 py-1 text-foreground/80">
                            <Spinner size="md" />
                            <p className="text-xs">A carregar viagens…</p>
                          </div>
                        </div>
                      ) : (
                        <div className={`${INFO_BOX_MAP_HINT} px-2 py-1.5 text-center`}>
                          <p className="text-xs font-medium text-foreground/90">À espera de viagens</p>
                          <p className="mt-0.5 text-[11px] leading-snug text-foreground/65">
                            {hasAnyCategoryAwareOffer && filteredOutCount > 0
                              ? `Existem ${filteredOutCount} viagem(ns) fora das tuas categorias activas.`
                              : (
                                <>
                                  Sem viagens disponíveis. Histórico em Menu → Viagens.
                                </>
                              )}
                          </p>
                        </div>
                      )}
                    </MapBottomSheet>
                  ) : null}
                </div>
                {driverMapTapOnlineHint ? (
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-[4.75rem] z-[20] flex justify-center px-3"
                    aria-hidden
                  >
                    <span className="rounded-full border border-border bg-background/92 px-3 py-1.5 text-center text-xs font-medium text-foreground shadow-sm backdrop-blur-sm">
                      Toca no mapa para ficares disponível
                    </span>
                  </div>
                ) : null}
                {driverBottomNav && !activeTripId && !driverMapStageLayout ? (
                  <div className="relative z-10 shrink-0 border-t border-border bg-muted/35">
                    <DriverShellAvailabilityInner
                      mapTapGoesOnline={mapTapGoesOnline}
                      offline={offline}
                      onGoOnline={() => handleDriverAvailabilityChange(true)}
                      onGoOffline={() => handleDriverAvailabilityChange(false)}
                    />
                  </div>
                ) : null}
              </MapStage>
            )}

            <div
              className={driverMapStageLayout ? 'hidden' : 'flex min-h-0 flex-1 flex-col overflow-y-auto'}
              id={driverMapStageLayout ? undefined : 'driver-main-scroll'}
            >
              {geolocationUsedFallback && (
                <div
                  className={MAP_WARNING_BANNER}
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

              {drivingCompliance?.enabled && (drivingCompliance.warning || drivingCompliance.blocked) ? (
                <div
                  className={`${BTN_SECONDARY_RADIUS} border px-3 py-2 text-sm ${drivingCompliance.blocked
                    ? 'bg-destructive/10 border-destructive/35 text-destructive'
                    : 'bg-warning/15 border-warning/40 text-foreground'
                    }`}
                  data-testid="driver-driving-hours-banner"
                >
                  {drivingCompliance.blocked ? (
                    <>
                      <p className="font-semibold leading-snug">Tempo de condução / repouso</p>
                      <p className="mt-1 text-foreground/90 leading-snug">
                        [PLACEHOLDER] Não podes ficar disponível nem aceitar novas viagens até cumprires o período de
                        repouso ou o limite diário deixar de aplicar (dia civil, Lisboa). Texto genérico — substituir
                        após validação do diploma e articulados aplicáveis (acompanhamento jurídico).
                      </p>
                      {drivingCompliance.rest_until ? (
                        <p className="mt-1 text-xs opacity-90">
                          Repouso até:{' '}
                          {new Date(drivingCompliance.rest_until).toLocaleString('pt-PT', {
                            timeZone: 'Europe/Lisbon',
                          })}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <p className="font-medium leading-snug">Aviso de tempo de condução</p>
                      <p className="mt-1 text-foreground/85 leading-snug">
                        [PLACEHOLDER] Hoje levaste cerca de{' '}
                        <strong>{formatDrivingDurationShort(drivingCompliance.active_seconds_today)}</strong> em
                        viagem activa (máx. referência {formatDrivingDurationShort(drivingCompliance.max_seconds)} /
                        dia civil, Lisboa). Evita aceitar serviços se estiveres perto do limite — quadro legal a
                        substituir após validação normativa.
                      </p>
                    </>
                  )}
                </div>
              ) : null}

              {!offline && !!token && !!driverLocation && (
                <details
                  className={MAP_CHIP_OVERLAY_FLAT}
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
                <div className={MAP_HINT_WARNING}>
                  <p className="font-medium text-foreground">Sem ligação à internet</p>
                  <p className="text-foreground/80 mt-1">
                    Quando voltares a ficar online, a app volta a atualizar. Podes recarregar a página se precisares.
                  </p>
                </div>
              )}

              {pollEnabled && availablePollFault && (
                <div className={MAP_HINT_WARNING}>
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
                  <div className={MAP_TOAST_WARNING}>
                    <button
                      type="button"
                      className={MAP_DISMISS_BTN_WARNING}
                      aria-label="Fechar aviso"
                      onClick={() => setToast(null)}
                    >
                      ×
                    </button>
                    <p className="leading-snug">{toast}</p>
                  </div>
                )}

                {error && (
                  <div className={MAP_TOAST_ERROR}>
                    <button
                      type="button"
                      className={MAP_DISMISS_BTN_ERROR}
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

                {!driverMapStageLayout && (!offline || (driverBottomNav && !activeTripId)) && (
                  <div className={MAP_CARD_FRAME}>
                    <MapView
                      className="!rounded-none border-0 !shadow-none"
                      driverLocation={mapDotLatLng}
                      tripPickup={mapStageTripPickup}
                      tripDropoff={mapStageTripDropoff}
                      pendingOfferPickups={mapStagePendingOffers}
                      onPendingOfferPickupClick={activeTripId ? undefined : onPendingOfferPickupClick}
                      route={driverMapStageRoute}
                      mapVisualWeight={
                        offline && driverBottomNav && !activeTripId
                          ? 'subdued'
                          : activeTripId || (available && available.length > 0)
                            ? 'subdued'
                            : 'emphasized'
                      }
                      compactHeight={compactDriverSurface}
                      tallStage={driverBottomNav && !activeTripId}
                      onUserMapInteraction={mapTapGoesOnline ? onDriverHomeMapInteraction : undefined}
                    />
                    {driverMapTapOnlineHint ? (
                      <div
                        className="pointer-events-none absolute inset-x-0 bottom-14 z-[3] flex justify-center px-3"
                        aria-hidden
                      >
                        <span className="rounded-full border border-border bg-background/92 px-3 py-1.5 text-center text-xs font-medium text-foreground shadow-sm backdrop-blur-sm">
                          Toca no mapa para ficares disponível e activar o GPS
                        </span>
                      </div>
                    ) : null}
                    {driverBottomNav && !activeTripId ? (
                      <div className="border-t border-border bg-muted/35">
                        <DriverShellAvailabilityInner
                          mapTapGoesOnline={mapTapGoesOnline}
                          offline={offline}
                          onGoOnline={() => handleDriverAvailabilityChange(true)}
                          onGoOffline={() => handleDriverAvailabilityChange(false)}
                        />
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

                {!offline && !activeTripId && !driverMapStageLayout && (
                  <>
                    {hasAvailableTrips ? (
                      <>
                        <StatusHeader
                          label={
                            filteredAvailable.length === 1
                              ? '1 viagem disponível'
                              : `${filteredAvailable.length} viagens disponíveis`
                          }
                          variant="idle"
                          emphasis="subdued"
                          compact
                        />
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
                                expiresAt={t.expires_at ?? null}
                                dismissButtonTestId={`driver-dismiss-${t.trip_id}`}
                                onDismiss={() => dismissOffer(t.trip_id)}
                                acceptButtonTestId={`driver-accept-${t.trip_id}`}
                                acceptVariant="slide"
                                onAccept={() =>
                                  runAction(
                                    () => acceptTrip(t.trip_id, token!),
                                    t.trip_id,
                                    'ACEITAR',
                                    undefined,
                                    t
                                  )
                                }
                                loading={actionLoading === t.trip_id}
                              />
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : pollEnabled && availableLoading && available == null ? (
                      <>
                        <StatusHeader
                          label="À espera de viagens"
                          variant="idle"
                          emphasis="subdued"
                          compact
                        />
                        <div className="flex flex-col items-center justify-center gap-2 py-6 text-foreground/80">
                          <Spinner size="md" />
                          <p className="text-xs">A carregar viagens…</p>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-md border border-border/60 bg-muted/15 px-2 py-1.5 text-center">
                        <p className="text-xs font-medium text-foreground/90">À espera de viagens</p>
                        <p className="mt-0.5 text-[11px] leading-snug text-foreground/65">
                          {hasAnyCategoryAwareOffer && filteredOutCount > 0
                            ? `Existem ${filteredOutCount} viagem(ns) fora das tuas categorias ativas.`
                            : 'Sem viagens disponíveis. Fica disponível para receberes novos pedidos.'}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {historyPollFault && (
                  <div className={MAP_HINT_WARNING_SM}>
                    Não foi possível atualizar o histórico. Voltamos a tentar — verifica a ligação se o aviso persistir.
                  </div>
                )}

                {!hasAvailableTrips && history && history.length > 0 && !driverMapStageLayout && (
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
            </div>
          </div>
        )}
      </ScreenContainer>
    </div>
  )
}

function ActiveTripSummary({
  tripId,
  token,
  statusOverride,
  detailFallback,
  sharedPoll,
  sessionRole,
  onClearStatusOverride,
  onTripCancelled,
  onTripNotFound,
  onDismissCompletedTrip,
  compact = false,
}: {
  tripId: string
  token: string
  statusOverride: string | null
  detailFallback: TripDetailResponse | null
  sharedPoll?: ReturnType<typeof useDriverActiveTripPoll>
  sessionRole: Role
  onClearStatusOverride: () => void
  onTripCancelled: () => void
  onTripNotFound: () => void
  /** Libertar viagem concluída após avaliar / saltar / já avaliado. */
  onDismissCompletedTrip: () => void
  /** Resumo fino por cima do mapa cheio (FIX-007). */
  compact?: boolean
}) {
  const internalPoll = useDriverActiveTripPoll(
    sharedPoll ? null : tripId,
    sharedPoll ? null : token,
    !sharedPoll && !!tripId && !!token
  )
  const pollBundle = sharedPoll ?? internalPoll
  const poll = pollBundle.poll
  const trip = poll?.trip ?? null
  const pollNotFound = poll?.notFound ?? false
  const tripRefreshing = pollBundle.isRefreshing
  const tripLastSuccessAt = pollBundle.lastSuccessAt
  const tripPollFault = pollBundle.pollFault
  const effectiveTrip = pollNotFound ? null : (trip ?? detailFallback)
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

  useEffect(() => {
    if (!pollNotFound) return
    onTripNotFound()
  }, [pollNotFound, onTripNotFound])

  const config = driverActiveTripUi(displayStatus)

  if (!effectiveTrip && tripId && token && !pollNotFound) {
    return (
      <div
        className={
          compact
            ? `${INFO_BOX_DRIVER_COMPACT} space-y-1 px-2 py-1.5`
            : `space-y-4 px-4 py-4 ${SURFACE_RADIUS} border border-border bg-card shadow-card`
        }
      >
        <StatusHeader
          label="A carregar viagem…"
          variant="idle"
          emphasis={compact ? 'subdued' : 'primary'}
          compact={compact}
        />
        <p className="text-center text-sm text-foreground/70">A obter detalhes atualizados.</p>
      </div>
    )
  }

  return (
    <div
      className={
        compact
          ? `${INFO_BOX_DRIVER_COMPACT} space-y-1 px-2 py-1.5`
          : `space-y-4 px-4 py-4 ${SURFACE_RADIUS} border border-border bg-card shadow-card transition-all duration-200 ease-out`
      }
    >
      {!compact ? (
        <StatusHeader
          label={config.label}
          variant={config.variant}
          emphasis="primary"
          compact={false}
        />
      ) : (
        <p className="text-sm font-semibold text-foreground leading-snug">{config.label}</p>
      )}
      {!compact ? (
        <p className="text-center -mt-2 mb-1">
          <span className="inline-block rounded-full bg-primary text-primary-foreground text-xs font-semibold px-3 py-1">
            {driverTripBadgeShort(displayStatus)}
          </span>
        </p>
      ) : null}
      {!compact && (tripPollFootnote || fallbackFootnote) ? (
        <p className="text-center text-sm text-foreground/75 -mt-3 mb-1 min-h-[1.25rem]" aria-live="polite">
          {tripPollFootnote ?? fallbackFootnote}
        </p>
      ) : null}
      {displayStatus === 'completed' && sessionRole === 'driver' ? (
        <TripCompletedOverlay
          compact
          paymentStatus={trip?.payment_status}
          onContinue={onDismissCompletedTrip}
          continueTestId="driver-trip-completed-continue"
        />
      ) : trip?.payment_status === 'failed' ? (
        <p className={`${INFO_BOX_BODY_COMPACT} text-destructive text-center`}>
          Pagamento recusado — segue instruções da plataforma.
        </p>
      ) : null}
      {effectiveTrip && !compact ? (
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
      ) : effectiveTrip && compact ? (
        <p className={`${INFO_BOX_BODY_COMPACT} text-center leading-snug`}>
          {formatPickup(effectiveTrip.origin_lat, effectiveTrip.origin_lng)} →{' '}
          {formatDestination(effectiveTrip.destination_lat, effectiveTrip.destination_lng)}
          {' · '}
          {(effectiveTrip.final_price ?? effectiveTrip.estimated_price ?? 0).toFixed(2)} €
        </p>
      ) : null}
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

function zoneArrivedErrorMessagePt(detail: string): string {
  if (detail === 'driver_location_required_for_zone_arrived') {
    return 'Sem posição GPS recente no servidor — espera uns segundos ou abre o mapa e tenta outra vez.'
  }
  if (detail === 'driver_outside_zone_for_arrived') {
    return 'A tua posição está longe da zona seleccionada. Aproxima-te ou cancela e corrige o pedido.'
  }
  return detail
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

function normalizeZoneIdInput(raw: string): string {
  return raw.replace(/\s+/g, '').toLowerCase()
}

function DriverOperationsMenu({
  sessionDisplayName,
  history,
  driverLocationForZones,
  navPref,
  vehicleCategories,
  driverDocuments,
  driverDocsGateEnabled,
  section = 'all',
  hideHeader = false,
  hideCloseButton = false,
  onCloseMenu,
  onSelectNavPref,
  onToggleVehicleCategory,
  onPatchDriverDocument,
  onToggleDriverDocsGate,
}: {
  sessionDisplayName: string | null
  history: TripHistoryItem[] | null
  driverLocationForZones: { lat: number; lng: number } | null
  navPref: DriverNavApp
  vehicleCategories: DriverVehicleCategory[]
  driverDocuments: DriverDocumentsState
  driverDocsGateEnabled: boolean
  section?: DriverMenuScreen
  hideHeader?: boolean
  hideCloseButton?: boolean
  onCloseMenu: () => void
  onSelectNavPref: (app: DriverNavApp) => void
  onToggleVehicleCategory: (category: DriverVehicleCategory) => void
  onPatchDriverDocument: (doc: DriverRequiredDocument, status: DriverDocumentStatus) => void
  onToggleDriverDocsGate: (enabled: boolean) => void
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
  const [zoneNewZoneFocused, setZoneNewZoneFocused] = useState(false)
  const [zoneCustomIds, setZoneCustomIds] = useState<string[]>([])
  const [zoneEtaAutoBusy, setZoneEtaAutoBusy] = useState(false)
  const [zoneEtaManuallyEdited, setZoneEtaManuallyEdited] = useState(false)
  const [zoneEtaHint, setZoneEtaHint] = useState<string | null>(null)
  const [zoneEtaMinutes, setZoneEtaMinutes] = useState(30)
  const [zoneMarginPct, setZoneMarginPct] = useState(25)
  const [zoneExtensionReason, setZoneExtensionReason] = useState('')

  const reloadZones = useCallback(async (showTapFeedback?: boolean) => {
    if (!token) {
      setZoneBudget(null)
      setZoneSession(null)
      setZoneCatalog(null)
      setZoneCustomIds([])
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
      try {
        const custom = await getDriverZoneCustomZones(token)
        setZoneCustomIds(custom.map((z) => z.zone_id))
      } catch {
        setZoneCustomIds([])
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
    if (zoneNewZoneFocused) return
    if (zoneNewZoneId.trim().length > 0) return
    setZoneNewZoneId(zoneCatalog[0].zone_id)
  }, [zoneCatalog, zoneNewZoneFocused, zoneNewZoneId])

  const zoneCatalogIds = useMemo(() => {
    return new Set((zoneCatalog ?? []).map((z) => z.zone_id.trim().toLowerCase()))
  }, [zoneCatalog])

  const zoneSelectableItems = useMemo(() => {
    const items = (zoneCatalog ?? []).map((z) => ({
      id: z.zone_id.trim(),
      label: z.label_pt,
      custom: false,
    }))
    for (const raw of zoneCustomIds) {
      const id = raw.trim()
      if (!id) continue
      if (zoneCatalogIds.has(id.toLowerCase())) continue
      items.push({
        id,
        label: `${id} (custom)`,
        custom: true,
      })
    }
    return items
  }, [zoneCatalog, zoneCustomIds, zoneCatalogIds])

  const selectedZoneCatalogItem = useMemo(() => {
    const zid = zoneNewZoneId.trim().toLowerCase()
    if (!zid) return null
    return (zoneCatalog ?? []).find((z) => z.zone_id.trim().toLowerCase() === zid) ?? null
  }, [zoneCatalog, zoneNewZoneId])

  const handleAddCustomZone = () => {
    if (!token) return
    const zid = zoneNewZoneId.trim().toLowerCase()
    if (!zid) {
      sonnerToast.error('Indica um ID de zona para guardar.')
      return
    }
    if (zoneCatalogIds.has(zid)) {
      sonnerToast.error('Essa zona já existe no catálogo.')
      return
    }
    if (zoneCustomIds.includes(zid)) {
      sonnerToast.error('Essa zona custom já está guardada.')
      return
    }
    setZoneBusy(true)
    void postDriverZoneCustomZone(token, zid)
      .then(() => {
        setZoneCustomIds((prev) => Array.from(new Set([...prev, zid])).slice(0, 30))
        sonnerToast.success(`Zona custom «${zid}» guardada.`)
      })
      .catch((e: unknown) => {
        const detail =
          e !== null && typeof e === 'object' && 'detail' in e
            ? String((e as { detail: unknown }).detail)
            : ''
        if (detail === 'custom_zone_conflicts_catalog') {
          sonnerToast.error('Essa zona já existe no catálogo oficial.')
          return
        }
        if (detail === 'custom_zone_limit_reached') {
          sonnerToast.error('Atingiste o limite de 30 zonas custom.')
          return
        }
        sonnerToast.error('Não foi possível guardar a zona custom.')
      })
      .finally(() => setZoneBusy(false))
  }

  const handleRemoveCustomZone = () => {
    if (!token) return
    const zid = zoneNewZoneId.trim().toLowerCase()
    if (!zid || !zoneCustomIds.includes(zid)) {
      sonnerToast.error('A zona actual não é custom guardada.')
      return
    }
    setZoneBusy(true)
    void deleteDriverZoneCustomZone(token, zid)
      .then(() => {
        setZoneCustomIds((prev) => prev.filter((id) => id !== zid))
        sonnerToast.success(`Zona custom «${zid}» removida.`)
      })
      .catch((e: unknown) => {
        const detail =
          e !== null && typeof e === 'object' && 'detail' in e
            ? String((e as { detail: unknown }).detail)
            : 'Não foi possível remover a zona custom.'
        if (detail === 'custom_zone_not_found') {
          sonnerToast.error('Essa zona custom já não existe no servidor.')
          return
        }
        sonnerToast.error(detail)
      })
      .finally(() => setZoneBusy(false))
  }

  const estimateZoneEtaFromCurrentLocation = useCallback(
    async (showToast: boolean) => {
      const zid = zoneNewZoneId.trim()
      if (!zid) return
      setZoneEtaAutoBusy(true)
      try {
        if (token) {
          try {
            const serverEstimate = await postDriverZoneEtaEstimate(token, zid)
            const etaServerMin = Math.max(1, Math.min(2880, Math.round(serverEstimate.eta_seconds_baseline / 60)))
            setZoneEtaMinutes(etaServerMin)
            setZoneEtaHint(`Servidor: ~${etaServerMin} min (${serverEstimate.distance_km.toFixed(1)} km em linha reta).`)
            if (showToast) sonnerToast.success(`ETA estimado no servidor (~${etaServerMin} min).`)
            return
          } catch {
            // Fallback below (OSRM/haversine) when server estimate is unavailable for this zone/context.
          }
        }
        if (!driverLocationForZones) {
          if (showToast) sonnerToast.error('Sem posição actual para estimar ETA.')
          return
        }
        let target:
          | {
            lat: number
            lng: number
          }
          | null =
          selectedZoneCatalogItem?.arrived_anchor_lat != null && selectedZoneCatalogItem?.arrived_anchor_lng != null
            ? {
              lat: selectedZoneCatalogItem.arrived_anchor_lat,
              lng: selectedZoneCatalogItem.arrived_anchor_lng,
            }
            : null

        let geocodeHint: string | null = null
        if (!target) {
          const q = zid
            .trim()
            .replace(/[-_]+/g, ' ')
            .replace(/\s+/g, ' ')
          const suggestions = await forwardGeocodeSearch(`${q}, Portugal`, 3)
          const best = suggestions[0]
          if (best) {
            target = { lat: best.lat, lng: best.lng }
            geocodeHint = `Geocode: ${best.primary}${best.secondary ? `, ${best.secondary}` : ''}`
          }
        }

        if (!target) {
          if (showToast) sonnerToast.error('Não consegui localizar esta zona para calcular ETA.')
          return
        }
        const meta = await getOsrmRouteMeta(driverLocationForZones, target)
        let etaMin: number
        let source: 'route' | 'fallback'
        if (meta && Number.isFinite(meta.durationSec) && meta.durationSec > 0) {
          etaMin = Math.round(meta.durationSec / 60)
          source = 'route'
          setZoneEtaHint(geocodeHint ? `${geocodeHint} · Rota: ~${etaMin} min (OSRM).` : `Rota: ~${etaMin} min (OSRM).`)
        } else {
          const km = haversineKm(driverLocationForZones, target)
          etaMin = Math.round((km / 45) * 60 * 1.25)
          source = 'fallback'
          setZoneEtaHint(
            geocodeHint
              ? `${geocodeHint} · Fallback: ~${etaMin} min (${km.toFixed(1)} km em linha reta).`
              : `Fallback: ~${etaMin} min (${km.toFixed(1)} km em linha reta).`
          )
        }
        etaMin = Math.max(1, Math.min(2880, etaMin))
        setZoneEtaMinutes(etaMin)
        if (showToast) {
          sonnerToast.success(
            source === 'route'
              ? `ETA atualizado automaticamente (~${etaMin} min).`
              : `ETA estimado por distância (~${etaMin} min).`
          )
        }
      } finally {
        setZoneEtaAutoBusy(false)
      }
    },
    [driverLocationForZones, selectedZoneCatalogItem, token, zoneNewZoneId]
  )

  useEffect(() => {
    setZoneEtaManuallyEdited(false)
    setZoneEtaHint(null)
  }, [zoneNewZoneId])

  useEffect(() => {
    if (zoneEtaManuallyEdited) return
    if (zoneSession != null) return
    void estimateZoneEtaFromCurrentLocation(false)
  }, [zoneEtaManuallyEdited, zoneSession, estimateZoneEtaFromCurrentLocation])

  useEffect(() => {
    if (zoneEtaManuallyEdited || zoneSession != null) return
    if (!driverLocationForZones) return
    const id = window.setTimeout(() => {
      void estimateZoneEtaFromCurrentLocation(false)
    }, 1800)
    return () => window.clearTimeout(id)
  }, [driverLocationForZones, zoneEtaManuallyEdited, zoneSession, estimateZoneEtaFromCurrentLocation])

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
  const activeZoneArrivedGateHint = useMemo(() => {
    if (!zoneSession) return null
    const hit = zoneCatalog?.find((z) => z.zone_id === zoneSession.zone_id)
    const km = hit?.arrived_max_km
    if (km == null || typeof km !== 'number' || Number.isNaN(km)) return null
    const rounded = Math.max(1, Math.round(km))
    return `O «Cheguei» usa a última posição no servidor face ao centro da zona (até ~${rounded} km). Mantém o GPS activo.`
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
      sonnerToast.error(zoneArrivedErrorMessagePt(detail))
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

  const showAll = section === 'all'
  const showEarnings = showAll || section === 'earnings'
  const showTrips = showAll || section === 'trips'
  const showInbox = showAll || section === 'inbox'
  const showAccountShortcuts = showAll || section === 'account'
  const showPricing = showAll || section === 'pricing'
  const showZones = showAll || section === 'zones'
  const showNavPref = showAll || section === 'nav'
  const showCategories = showAll || section === 'categories'
  const showDocs = showAll || section === 'docs'

  return (
    <section className="space-y-4" data-testid="driver-ops-menu" aria-label="Menu do motorista">
      {!hideHeader ? (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-foreground">Menu do motorista</h2>
            <p className="text-sm text-foreground/75">
              {sessionDisplayName ?? 'Motorista'} · canceladas após aceitar: {cancelRate}%
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            {!hideCloseButton ? (
              <button
                type="button"
                data-testid="driver-close-menu"
                onClick={() => onCloseMenu()}
                className={BTN_SECONDARY_SM}
              >
                Fechar
              </button>
            ) : null}
            <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-foreground/75">
              Rating: em breve
            </span>
          </div>
        </div>
      ) : null}

      {showEarnings ? (
        <div
          id="driver-menu-earnings"
          className={`scroll-mt-6 ${MENU_PANEL}`}
        >
          <p className="text-sm font-medium text-foreground">Rendimentos</p>
          <p className="text-xs text-muted-foreground leading-snug">
            Soma do <span className="font-medium text-foreground/85">preço final</span> das viagens concluídas na
            semana. A linha «Parte motorista» aparece quando a API envia payout por viagem.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className={MENU_CARD}>
              <p className="text-[11px] text-foreground/70">Semana atual</p>
              <p className="text-base font-semibold text-foreground">{thisWeekRevenue.toFixed(2)} €</p>
              {showThisWeekPayout ? (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Parte motorista:{' '}
                  <span className="font-medium text-foreground/85">{thisWeekPayoutSum.toFixed(2)} €</span>
                </p>
              ) : null}
            </div>
            <div className={MENU_CARD}>
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
      ) : null}

      {showTrips ? (
        <div id="driver-menu-trips" className={MENU_PANEL}>
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
                  <li key={t.trip_id} className={MENU_CARD}>
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
                  className={MENU_BTN}
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
      ) : null}

      {showInbox ? (
        <div
          id="driver-menu-inbox"
          className={`scroll-mt-6 ${MENU_PANEL}`}
          data-testid="driver-menu-inbox"
        >
          <p className="text-sm font-medium text-foreground">Caixa de entrada</p>
          <DriverInboxPanel />
          <button
            type="button"
            data-testid="driver-menu-open-activity-log"
            onClick={() => {
              onCloseMenu()
              window.dispatchEvent(new CustomEvent(DRIVER_OPEN_ACTIVITY_LOG_EVENT))
            }}
            className={`${MENU_BTN} min-h-9`}
          >
            Ver registo de atividade
          </button>
        </div>
      ) : null}

      {showAccountShortcuts ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            data-testid="driver-menu-open-account"
            onClick={() => window.dispatchEvent(new CustomEvent(DRIVER_OPEN_ACCOUNT_EVENT))}
            className={`${MENU_BTN_SM} min-h-9`}
          >
            Conta (perfil)
          </button>
          <button
            type="button"
            data-testid="driver-menu-open-settings"
            onClick={() => window.dispatchEvent(new CustomEvent(DRIVER_OPEN_SETTINGS_EVENT))}
            className={`${MENU_BTN_SM} min-h-9`}
          >
            Definições
          </button>
        </div>
      ) : null}

      {showPricing ? (
        <details className={`${INNER_RADIUS} border border-border/80 bg-muted/15 px-3 py-2 text-sm`}>
          <summary className="cursor-pointer font-medium text-foreground select-none">
            Preços nos pedidos (estimativa)
          </summary>
          <p className="mt-2 text-xs text-foreground/85 leading-snug">
            O valor mostrado no pedido é <strong>estimativa</strong>; o passageiro paga o <strong>preço final</strong> no
            fim da viagem.
          </p>
        </details>
      ) : null}

      {showZones ? (
        <div className={MENU_PANEL}>
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
            <div className={`${MENU_CARD} space-y-2`}>
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
              {activeZoneArrivedGateHint ? (
                <p className="text-[11px] text-muted-foreground leading-snug" data-testid="driver-zones-arrived-gate-hint">
                  {activeZoneArrivedGateHint}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {!zoneSession.arrived_at ? (
                  <button
                    type="button"
                    data-testid="driver-zones-arrived"
                    onClick={() => void handleZoneArrived()}
                    disabled={zoneBusy}
                    className={`min-h-9 ${INNER_RADIUS} border border-info bg-info/10 px-3 text-sm font-semibold text-foreground hover:bg-info/20 disabled:opacity-50 touch-manipulation`}
                  >
                    Cheguei à zona
                  </button>
                ) : null}
                <button
                  type="button"
                  data-testid="driver-zones-cancel"
                  onClick={() => void handleZoneCancel()}
                  disabled={zoneBusy}
                  className={`${MENU_BTN} disabled:opacity-50`}
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
                      className={`w-full min-h-9 ${INNER_RADIUS} border border-border bg-background px-2 py-1.5 text-xs text-foreground`}
                    />
                    <button
                      type="button"
                      data-testid="driver-zones-request-extension"
                      onClick={() => void handleZoneRequestExtension()}
                      disabled={zoneBusy}
                      className={`${MENU_BTN_SM} px-3 disabled:opacity-50`}
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
            <div className={`${MENU_CARD} space-y-2`}>
              <label className="block space-y-1">
                <span className="text-[11px] text-muted-foreground">
                  Zona-alvo · catálogo v1 (também podes escrever à mão se o catálogo falhar)
                </span>
                {zoneSelectableItems.length > 0 ? (
                  <select
                    value={zoneNewZoneId}
                    onChange={(ev) => setZoneNewZoneId(ev.target.value)}
                    data-testid="driver-zones-zone-select"
                    className={`w-full min-h-9 ${INNER_RADIUS} border border-border bg-background px-2 text-sm text-foreground`}
                  >
                    {zoneSelectableItems.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.label}
                      </option>
                    ))}
                  </select>
                ) : null}
                {zoneCatalogErr ? (
                  <p className="text-[11px] text-warning" data-testid="driver-zones-catalog-fallback-hint">
                    {zoneCatalogErr}
                  </p>
                ) : null}
                <input
                  value={zoneNewZoneId}
                  onChange={(ev) => setZoneNewZoneId(normalizeZoneIdInput(ev.target.value))}
                  onFocus={() => setZoneNewZoneFocused(true)}
                  onBlur={() => setZoneNewZoneFocused(false)}
                  onKeyDown={(ev) => {
                    if (ev.key !== 'Enter') return
                    ev.preventDefault()
                    ev.stopPropagation()
                    void estimateZoneEtaFromCurrentLocation(true)
                  }}
                  data-testid="driver-zones-zone-input"
                  className={`w-full min-h-9 ${INNER_RADIUS} border border-border bg-background px-2 text-sm text-foreground`}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="Escreve ID manual (ex.: lisboa-norte)"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddCustomZone()}
                    disabled={zoneBusy}
                    className="min-h-[36px] rounded-md border border-border px-2.5 text-[11px] font-medium text-foreground hover:bg-muted/50 disabled:opacity-50 touch-manipulation"
                  >
                    Guardar zona custom
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomZone()}
                    disabled={zoneBusy}
                    className="min-h-[36px] rounded-md border border-border px-2.5 text-[11px] font-medium text-foreground hover:bg-muted/50 disabled:opacity-50 touch-manipulation"
                  >
                    Remover custom
                  </button>
                </div>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="text-[11px] text-muted-foreground">ETA (min)</span>
                  <input
                    type="number"
                    min={1}
                    max={2880}
                    value={zoneEtaMinutes}
                    onChange={(ev) => {
                      setZoneEtaManuallyEdited(true)
                      setZoneEtaMinutes(Number(ev.target.value) || 1)
                    }}
                    className={`w-full min-h-9 ${INNER_RADIUS} border border-border bg-background px-2 text-sm text-foreground`}
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
                    className={`w-full min-h-9 ${INNER_RADIUS} border border-border bg-background px-2 text-sm text-foreground`}
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => void estimateZoneEtaFromCurrentLocation(true)}
                disabled={zoneBusy || zoneEtaAutoBusy}
                className="min-h-[36px] rounded-md border border-border px-2.5 text-[11px] font-medium text-foreground hover:bg-muted/50 disabled:opacity-50 touch-manipulation"
              >
                {zoneEtaAutoBusy ? 'A calcular ETA…' : 'Calcular ETA automático'}
              </button>
              {zoneEtaHint ? <p className="text-[11px] text-muted-foreground">{zoneEtaHint}</p> : null}
              <button
                type="button"
                data-testid="driver-zones-create"
                onClick={() => void handleCreateZoneSession()}
                disabled={zoneBusy || !token}
                className={`w-full min-h-9 ${INNER_RADIUS} border border-info bg-info/15 text-sm font-semibold text-foreground hover:bg-info/25 disabled:opacity-50 touch-manipulation`}
              >
                Pedir mudança de zona
              </button>
            </div>
          ) : zoneBudget && zoneBudget.remaining <= 0 ? (
            <div
              className={`${INNER_RADIUS} border border-warning/45 bg-warning/10 px-3 py-2.5 space-y-2`}
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
                className={`${MENU_BTN} min-h-9`}
              >
                Abrir registo de atividade
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {showNavPref ? (
        <div className={MENU_PANEL}>
          <p className="text-sm font-medium text-foreground">Navegação (preferência)</p>
          <p className="text-xs text-muted-foreground">
            Ao aceitar abrimos a recolha; ao iniciar a viagem abrimos o destino. Durante a viagem podes usar «Abrir navegação».
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="driver-nav-pref-waze"
              onClick={() => onSelectNavPref('waze')}
              className={`min-h-9 flex-1 ${INNER_RADIUS} border px-2 text-sm font-semibold touch-manipulation transition-colors ${navPref === 'waze'
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
              className={`min-h-9 flex-1 ${INNER_RADIUS} border px-2 text-sm font-semibold touch-manipulation transition-colors ${navPref === 'google_maps'
                ? 'border-info bg-info/15 text-foreground'
                : 'border-border bg-background text-foreground/80 hover:bg-muted/50'
                }`}
            >
              Google Maps
            </button>
          </div>
        </div>
      ) : null}

      {showCategories ? (
        <div className={MENU_PANEL}>
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
                  className={`min-h-9 ${INNER_RADIUS} border px-2 text-xs font-semibold touch-manipulation transition-colors ${active
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
      ) : null}

      {showDocs ? (
        <div
          className={MENU_PANEL}
          data-testid="driver-menu-documents-panel"
        >
          <p className="text-sm font-medium text-foreground">Documentos e licenças</p>
          <p className="text-xs text-muted-foreground leading-snug">
            Envia os documentos para revisão da tua frota (partner). A <span className="font-medium">aprovação</span> é
            feita no painel da frota.
          </p>
          {(() => {
            const { hasExpired, hasSoon } = driverDocumentsExpiryAttention(driverDocuments)
            if (!hasExpired && !hasSoon) return null
            return (
              <div
                className={`${INNER_RADIUS} border px-3 py-2 text-xs ${hasExpired
                  ? 'border-destructive/50 bg-destructive/10 text-foreground'
                  : 'border-warning/50 bg-warning/10 text-foreground'
                  }`}
              >
                {hasExpired ? (
                  <p className="font-semibold">Tens documentos expirados ou datas em atraso — contacta a tua frota.</p>
                ) : (
                  <p className="font-semibold">Há validades a expirar em breve (30 dias). Confirma com a tua frota.</p>
                )}
              </div>
            )
          })()}
          <div className={`flex items-center justify-between gap-2 ${MENU_CARD}`}>
            <p className="text-xs text-foreground/85">
              Aprovados: {driverDocumentsApprovedCount(driverDocuments)} / {REQUIRED_DRIVER_DOCUMENTS.length}
            </p>
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${isDriverDocumentsReady(driverDocuments)
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
              const meta = driverDocuments.docDetails[doc]
              const expLine = formatDriverDocExpiresLine(meta?.expiresAt ?? undefined)
              const noteLine = meta?.partnerNote?.trim()
              return (
                <div key={doc} className={MENU_CARD}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-foreground truncate">{driverDocumentLabel(doc)}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${badgeClass}`}>
                      {driverDocumentStatusLabel(status)}
                    </span>
                  </div>
                  {expLine ? (
                    <p className="mt-1 text-[11px] text-muted-foreground leading-snug">{expLine}</p>
                  ) : null}
                  {noteLine ? (
                    <p className="mt-1 text-[11px] text-foreground/80 leading-snug">
                      <span className="font-medium text-foreground/90">Frota:</span> {noteLine}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-col gap-2">
                    <label className="text-[11px] text-muted-foreground">
                      Carregar ficheiro (PDF/imagem)
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        className="mt-1 block w-full text-xs"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (!file || !token) return
                          void uploadDriverDocument(token, doc, file)
                            .then(() => sonnerToast.success('Ficheiro enviado'))
                            .catch(() => sonnerToast.error('Falha no upload'))
                          e.target.value = ''
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="min-h-[32px] w-full rounded-md border border-warning/50 bg-warning/10 px-2 text-xs font-medium text-foreground hover:bg-warning/20"
                      onClick={() => onPatchDriverDocument(doc, 'pending_review')}
                    >
                      Enviar para revisão da frota
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          <div className={MENU_CARD}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-foreground/85">Bloquear disponibilidade até todos estarem aprovados</p>
              <button
                type="button"
                aria-pressed={driverDocsGateEnabled}
                onClick={() => onToggleDriverDocsGate(!driverDocsGateEnabled)}
                className={`min-h-[30px] rounded-md border px-2 text-[11px] font-medium transition-colors ${driverDocsGateEnabled
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
      ) : null}

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
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  )
}
