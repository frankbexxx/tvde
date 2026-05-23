import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useActivityLog } from '../../context/ActivityLogContext'
import { useActiveTrip } from '../../context/ActiveTripContext'
import { useDevToolsCallbacks } from '../../context/DevToolsCallbackContext'
import { createTrip, getTripHistory, getTripDetail, cancelTrip } from '../../api/trips'
import { isTimeoutLikeError } from '../../api/client'
import type { TripDetailResponse } from '../../api/trips'
import { usePolling } from '../../hooks/usePolling'
import { usePollStallHint } from '../../hooks/usePollStallHint'
import {
  mergePassengerPolledWithPending,
  tripDetailFromCreateResponse,
  tripStateRank,
  passengerTripStatusLabel,
} from '../../constants/tripStatus'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { isMockLocationModeEnabled } from '../../dev/mockLocation'
import { MOCK_DRIVER_START } from '../../dev/mockPositions'
import { useGeolocation } from '../../hooks/useGeolocation'
import { ScreenContainer } from '../../components/layout/ScreenContainer'
import { PrimaryActionButton } from '../../components/layout/PrimaryActionButton'
import { MapActionRow } from '../../components/layout/MapActionRow'
import { BTN_SECONDARY, BTN_SECONDARY_RADIUS } from '../../components/layout/infoBoxTemplate'
import { Spinner } from '../../components/ui/Spinner'
import type { FeatureCollection, LineString } from 'geojson'
import { MapStage } from '../../components/layout/MapStage'
import { MapBottomSheet } from '../../components/layout/MapBottomSheet'
import { getRouteGeoJSON } from '../../maps/routing'
import { getOsrmRouteMeta } from '../../services/routingService'
import {
  forwardGeocodeSearch,
  reverseGeocode,
  type GeocodeSuggestion,
} from '../../services/geocoding'
import { DestinationSearchField } from './DestinationSearchField'
import { usePassengerDriverLocation, isPassengerDriverTrackingStatus } from '../../hooks/usePassengerDriverLocation'
import { TripPlannerPanel, type PassengerUIState } from './TripPlannerPanel'
import { PassengerTripRatingPanel } from './PassengerTripRatingPanel'
import {
  passengerTripPollEquals,
  type PassengerTripPollResult,
} from './passengerTripPollEquals'
import { usePassengerUxState } from './usePassengerUxState'
import { PassengerStatusCard } from './PassengerStatusCard'
import { PassengerPaymentConfirmCard } from './PassengerPaymentConfirmCard'
import {
  getPassengerBannerState,
  humanizeCancelError,
  humanizeCreateTripError,
} from './passengerBanner'
import { toast } from 'sonner'
import { log as devLog } from '../../utils/logger'
import { formatApproxDistanceKm, haversineKm } from '../../utils/geo'
import { PassengerSideMenu, type PassengerMenuScreen } from './PassengerSideMenu'
import { PassengerBottomNav, type PassengerShellTab } from './PassengerBottomNav'
import {
  PASSENGER_TRIP_CANCEL_PRESETS,
  TRIP_CANCEL_SELECT_OTHER,
  tripCancelReasonForApi,
} from '../../constants/tripCancelReasons'

/**
 * P33: mapa da viagem com percurso/rasto só após aceite — não em requested nem assigned.
 *
 * Nota histórica (2026-04-22): aqui existia uma constante `DEMO_ORIGIN` igual a
 * OEIRAS_FALLBACK que era passada ao `MapView` enquanto `passengerLocation` era
 * null. Causava bug "pin sempre em Câmara de Oeiras": o MapView só recentra
 * uma vez (via `easeTo` em `hasInitialFit`), por isso se o primeiro valor não
 * nulo era DEMO_ORIGIN, a câmara ficava colada a Oeiras mesmo depois do GPS
 * real resolver — o pin mexia, mas saía do viewport, e o utilizador via
 * sempre o centro de Oeiras. Solução: passar `undefined` enquanto não há GPS,
 * MapView não desenha pin, câmara começa em OEIRAS_CENTER (só câmara, sem
 * pin), e quando a posição real chega, easeTo centra correctamente.
 */
const ESTIMATE_MOCK = '4–6'

function passengerDashboardNoop() { }

export function PassengerDashboard() {
  const { token, sessionRole } = useAuth()
  const { addLog, setStatus } = useActivityLog()
  const { passengerActiveTripId, setPassengerActiveTripId } = useActiveTrip()
  const activeTripId = passengerActiveTripId
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createTakingLong, setCreateTakingLong] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [passengerCancelOpen, setPassengerCancelOpen] = useState(false)
  const [passengerMenuOpen, setPassengerMenuOpen] = useState(false)
  const [passengerMenuScreen, setPassengerMenuScreen] = useState<PassengerMenuScreen>('root')
  const passengerMenuOpenRef = useRef(false)

  useEffect(() => {
    passengerMenuOpenRef.current = passengerMenuOpen
  }, [passengerMenuOpen])

  const passengerNavActive = useMemo((): PassengerShellTab => {
    if (!passengerMenuOpen) return 'home'
    if (passengerMenuScreen === 'history') return 'history'
    if (passengerMenuScreen === 'account') return 'account'
    return 'menu'
  }, [passengerMenuOpen, passengerMenuScreen])

  const handlePassengerBottomNav = useCallback((tab: PassengerShellTab) => {
    if (tab === 'home') {
      setPassengerMenuOpen(false)
      setPassengerMenuScreen('root')
      document.getElementById('passenger-main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (tab === 'menu') {
      const nextOpen = !passengerMenuOpenRef.current
      if (nextOpen) setPassengerMenuScreen('root')
      setPassengerMenuOpen(nextOpen)
      return
    }
    setPassengerMenuScreen(tab === 'history' ? 'history' : 'account')
    setPassengerMenuOpen(true)
  }, [])
  const [passengerCancelPreset, setPassengerCancelPreset] = useState('')
  const [passengerCancelOther, setPassengerCancelOther] = useState('')
  const [retrySearchPending, setRetrySearchPending] = useState(false)
  const {
    position: passengerLocation,
    usedFallback: geolocationUsedFallback,
    retry: retryGeolocation,
  } = useGeolocation({
    mockRole: 'passenger',
  })
  const [tripCompletedFromLocation, setTripCompletedFromLocation] = useState(false)
  /** A015/A016: planeamento no mapa (sem backend até A018) */
  const [pickupLocation, setPickupLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [dropoffLocation, setDropoffLocation] = useState<{ lat: number; lng: number } | null>(null)
  /** A017b: planeamento só após o utilizador clicar em "Pedir viagem" */
  const [isPlanningMode, setIsPlanningMode] = useState(false)
  /** Ref espelha pickup para cliques muito rápidos (1º vs 2º clique antes do re-render) */
  const pickupLocationRef = useRef<{ lat: number; lng: number } | null>(null)
  /** A017: GeoJSON OSRM entre pickup e dropoff (apenas planeamento) */
  const [planningRouteGeoJSON, setPlanningRouteGeoJSON] = useState<FeatureCollection<LineString> | null>(
    null
  )
  /** A019: moradas e meta de rota para painel de confirmação */
  const [pickupAddress, setPickupAddress] = useState<string | null>(null)
  const [dropoffAddress, setDropoffAddress] = useState<string | null>(null)
  const [pickupAddressLoading, setPickupAddressLoading] = useState(false)
  const [dropoffAddressLoading, setDropoffAddressLoading] = useState(false)
  const [confirmRouteMeta, setConfirmRouteMeta] = useState<{
    durationSec: number
    distanceM: number
  } | null>(null)
  const [confirmRouteMetaLoading, setConfirmRouteMetaLoading] = useState(false)
  const mapAnchorRef = useRef<HTMLDivElement | null>(null)
  const [pickupQuery, setPickupQuery] = useState('')
  const [pickupGeoSuggestions, setPickupGeoSuggestions] = useState<GeocodeSuggestion[]>([])
  const [pickupGeoLoading, setPickupGeoLoading] = useState(false)
  const [pickupCandidate, setPickupCandidate] = useState<GeocodeSuggestion | null>(null)
  const [destinationQuery, setDestinationQuery] = useState('')
  const [geoSuggestions, setGeoSuggestions] = useState<GeocodeSuggestion[]>([])
  const [geoLoading, setGeoLoading] = useState(false)
  const [destinationCandidate, setDestinationCandidate] = useState<GeocodeSuggestion | null>(null)
  const [mapRecenterKey, setMapRecenterKey] = useState(0)
  /** P3: snapshot do POST /trips até o primeiro GET alinhar. */
  const [passengerPendingTripDetail, setPassengerPendingTripDetail] = useState<TripDetailResponse | null>(
    null
  )

  const { data: history, refetch: refetchHistory, pollFault: historyPollFault, isLoading: historyLoading } = usePolling(
    () => getTripHistory(token!),
    [token],
    !!token,
    10000
  )

  const { setPassengerOnAssigned } = useDevToolsCallbacks()
  useEffect(() => {
    setPassengerOnAssigned(refetchHistory)
    return () => setPassengerOnAssigned(undefined)
  }, [setPassengerOnAssigned, refetchHistory])

  useEffect(() => {
    setPassengerCancelOpen(false)
    setPassengerCancelPreset('')
    setPassengerCancelOther('')
  }, [activeTripId])

  const isOnline = useOnlineStatus()
  const fetchPassengerActiveTrip = useCallback((): Promise<PassengerTripPollResult> => {
    if (!activeTripId || !token) {
      return Promise.resolve({ trip: null, notFound: false })
    }
    return getTripDetail(activeTripId, token)
      .then((trip) => ({ trip, notFound: false }))
      .catch((e: unknown) => {
        const st = (e as { status?: number })?.status
        if (st === 404) return { trip: null, notFound: true }
        throw e
      })
  }, [activeTripId, token])

  const {
    data: activeTripPoll,
    refetch: refetchActiveTrip,
    isLoading: activeTripLoading,
    isRefreshing: activeTripRefreshing,
    lastSuccessAt: activeTripLastSuccessAt,
    pollFault: activeTripPollFault,
  } = usePolling<PassengerTripPollResult>(
    fetchPassengerActiveTrip,
    [fetchPassengerActiveTrip],
    !!activeTripId && !!token,
    3000,
    { equals: passengerTripPollEquals }
  )

  const activeTripPolled = activeTripPoll?.trip ?? null
  const activeTripNotFound = activeTripPoll?.notFound ?? false

  const activeTrip = useMemo(
    () => mergePassengerPolledWithPending(activeTripPolled, passengerPendingTripDetail, activeTripId),
    [activeTripPolled, passengerPendingTripDetail, activeTripId]
  )

  const onTripCompletedFromLocation = useCallback(() => {
    setTripCompletedFromLocation(true)
  }, [])

  const { driverLocation } = usePassengerDriverLocation({
    activeTripId,
    activeTrip,
    tripCompletedFromLocation,
    pollIntervalMs: 4000,
    onTripCompletedFromLocation,
  })

  useEffect(() => {
    if (!passengerPendingTripDetail || !activeTripId || passengerPendingTripDetail.trip_id !== activeTripId) {
      return
    }
    if (!activeTripPolled) return
    if (tripStateRank(activeTripPolled.status) >= tripStateRank(passengerPendingTripDetail.status)) {
      setPassengerPendingTripDetail(null)
    }
  }, [passengerPendingTripDetail, activeTripId, activeTripPolled])

  useEffect(() => {
    if (!activeTripId) setPassengerPendingTripDetail(null)
  }, [activeTripId])

  const tripPollStalled = usePollStallHint(
    activeTripLastSuccessAt,
    activeTripRefreshing,
    Boolean(activeTripId && activeTrip)
  )

  /** Sem «A atualizar…» em cada poll de fundo — só pisca o painel; stall e erro mantêm-se. */
  const tripPollFootnote = activeTripId
    ? activeTripPollFault
      ? 'Não foi possível atualizar agora. Verifica a ligação — voltamos a tentar de seguida.'
      : activeTripLoading && !activeTripPolled
        ? 'A sincronizar viagem…'
        : tripPollStalled
          ? 'Sem novidades há instantes — a última informação mantém-se válida.'
          : null
    : null

  useEffect(() => {
    if (!creating) {
      setCreateTakingLong(false)
      return
    }
    const id = window.setTimeout(() => setCreateTakingLong(true), 12_000)
    return () => window.clearTimeout(id)
  }, [creating])

  // Só limpar id quando o servidor confirma 404 — evita apagar viagem por erro transitório / 1.º poll falhado
  useEffect(() => {
    if (!activeTripId) return
    if (activeTripLoading) return
    if (!activeTripNotFound) return
    setPassengerActiveTripId(null)
    setStatus('Pronto')
  }, [activeTripId, activeTripLoading, activeTripNotFound, setPassengerActiveTripId, setStatus])

  useEffect(() => {
    pickupLocationRef.current = pickupLocation
  }, [pickupLocation])

  useEffect(() => {
    if (!pickupLocation) {
      setPickupAddress(null)
      return
    }
    let cancelled = false
    setPickupAddressLoading(true)
    void reverseGeocode(pickupLocation.lng, pickupLocation.lat).then((addr) => {
      if (!cancelled) setPickupAddress(addr)
    }).finally(() => {
      if (!cancelled) setPickupAddressLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [pickupLocation])

  useEffect(() => {
    const q = pickupQuery.trim()
    if (pickupLocation || q.length < 2) {
      setPickupGeoSuggestions([])
      setPickupGeoLoading(false)
      return
    }
    let cancelled = false
    const t = window.setTimeout(() => {
      setPickupGeoLoading(true)
      void forwardGeocodeSearch(q, 5).then((rows) => {
        if (!cancelled) setPickupGeoSuggestions(rows)
      }).finally(() => {
        if (!cancelled) setPickupGeoLoading(false)
      })
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [pickupQuery, pickupLocation])

  useEffect(() => {
    const q = destinationQuery.trim()
    if (!pickupLocation || q.length < 2) {
      setGeoSuggestions([])
      setGeoLoading(false)
      return
    }
    let cancelled = false
    const t = window.setTimeout(() => {
      setGeoLoading(true)
      void forwardGeocodeSearch(q, 5).then((rows) => {
        if (!cancelled) setGeoSuggestions(rows)
      }).finally(() => {
        if (!cancelled) setGeoLoading(false)
      })
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [destinationQuery, pickupLocation])

  useEffect(() => {
    if (!dropoffLocation) {
      setDropoffAddress(null)
      return
    }
    let cancelled = false
    setDropoffAddressLoading(true)
    void reverseGeocode(dropoffLocation.lng, dropoffLocation.lat).then((addr) => {
      if (!cancelled) setDropoffAddress(addr)
    }).finally(() => {
      if (!cancelled) setDropoffAddressLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [dropoffLocation])

  useEffect(() => {
    if (activeTripId) {
      setPickupLocation(null)
      setDropoffLocation(null)
      pickupLocationRef.current = null
      setIsPlanningMode(false)
      setPickupQuery('')
      setPickupGeoSuggestions([])
      setDestinationQuery('')
      setGeoSuggestions([])
      setPickupCandidate(null)
      setDestinationCandidate(null)
    }
  }, [activeTripId])

  const resetPlanning = useCallback(() => {
    setPickupLocation(null)
    setDropoffLocation(null)
    setIsPlanningMode(false)
    pickupLocationRef.current = null
    setPickupAddress(null)
    setDropoffAddress(null)
    setConfirmRouteMeta(null)
    setPickupQuery('')
    setPickupGeoSuggestions([])
    setDestinationQuery('')
    setGeoSuggestions([])
    setPickupCandidate(null)
    setDestinationCandidate(null)
  }, [])

  const onChoosePlanningModeAndScrollToMap = useCallback(() => {
    setIsPlanningMode(true)
    mapAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  const onScrollToMapAnchor = useCallback(() => {
    mapAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  const dismissGeoSuggestions = useCallback(() => {
    setGeoSuggestions([])
  }, [])

  const dismissPickupGeoSuggestions = useCallback(() => {
    setPickupGeoSuggestions([])
  }, [])

  const handlePickupPick = useCallback((s: GeocodeSuggestion) => {
    setPickupCandidate(s)
    setPickupQuery(s.primary)
    setPickupGeoSuggestions([])
    setIsPlanningMode(true)
    setMapRecenterKey((k) => k + 1)
    toast.success('Recolha em pré-visualização')
  }, [])

  const confirmPickupCandidate = useCallback(() => {
    if (!pickupCandidate) return
    const coords = { lat: pickupCandidate.lat, lng: pickupCandidate.lng }
    pickupLocationRef.current = coords
    setPickupLocation(coords)
    setPickupCandidate(null)
    setIsPlanningMode(true)
    setMapRecenterKey((k) => k + 1)
    toast.success('Recolha confirmada')
  }, [pickupCandidate])

  const handleDestinationPick = useCallback((s: GeocodeSuggestion) => {
    setDestinationCandidate(s)
    setDestinationQuery(s.primary)
    setGeoSuggestions([])
    setIsPlanningMode(true)
    setMapRecenterKey((k) => k + 1)
    toast.success('Destino em pré-visualização')
  }, [])

  const confirmDestinationCandidate = useCallback(() => {
    if (!destinationCandidate) return
    setDropoffLocation({ lat: destinationCandidate.lat, lng: destinationCandidate.lng })
    setDestinationCandidate(null)
    setIsPlanningMode(true)
    setMapRecenterKey((k) => k + 1)
    toast.success('Destino confirmado')
  }, [destinationCandidate])

  const clearPickupCandidate = useCallback(() => {
    setPickupCandidate(null)
  }, [])

  const clearDestinationCandidate = useCallback(() => {
    setDestinationCandidate(null)
  }, [])

  /** A019: com pickup+dropoff, novo clique atualiza só o destino */
  const handlePlanningMapClick = useCallback((coords: { lat: number; lng: number }) => {
    if (!pickupLocationRef.current) {
      pickupLocationRef.current = coords
      setPickupLocation(coords)
      return
    }
    setDropoffLocation(coords)
  }, [])

  const pickupDestinationTooClose = useMemo(() => {
    if (!pickupLocation || !dropoffLocation) return false
    return haversineKm(pickupLocation, dropoffLocation) < 0.025
  }, [pickupLocation, dropoffLocation])

  const handlePickupQueryChange = useCallback((value: string) => {
    setPickupQuery(value)
    if (pickupCandidate) setPickupCandidate(null)
  }, [pickupCandidate])

  const handleDestinationQueryChange = useCallback((value: string) => {
    setDestinationQuery(value)
    if (destinationCandidate) setDestinationCandidate(null)
  }, [destinationCandidate])

  const handleRequestTrip = useCallback(async () => {
    if (!token) return
    if (!pickupLocation || !dropoffLocation) return
    if (creating) return

    if (pickupDestinationTooClose) {
      toast.warning(
        'Recolha e destino demasiado próximos — escolhe dois pontos diferentes antes de pedir a viagem.'
      )
      return
    }

    devLog('[PassengerDashboard] createTrip', { pickupLocation, dropoffLocation })

    setError(null)
    setCreating(true)
    setStatus('A pedir viagem...')
    addLog('Clique: Pedir viagem', 'action')
    // Optimistic: show SEARCHING immediately (handled by creating + optimisticTrip below)
    try {
      const res = await createTrip(
        {
          origin_lat: pickupLocation.lat,
          origin_lng: pickupLocation.lng,
          destination_lat: dropoffLocation.lat,
          destination_lng: dropoffLocation.lng,
        },
        token
      )
      setPassengerPendingTripDetail(tripDetailFromCreateResponse(res, pickupLocation, dropoffLocation))
      setPassengerActiveTripId(res.trip_id)
      setStatus(passengerTripStatusLabel(res.status))
      const est = res.estimated_price != null && res.estimated_price > 0 ? `${res.estimated_price}` : ESTIMATE_MOCK
      addLog(`Viagem criada (${res.status}) — estimativa ${est} €`, 'success')
      toast.success('Pedido enviado — a sincronizar…')
      refetchHistory()
    } catch (err: unknown) {
      const msg = isTimeoutLikeError(err)
        ? 'Sem ligação ou o servidor demorou a responder. Verifica a rede e tenta de novo.'
        : humanizeCreateTripError(err)
      setError(msg)
      setStatus('Não foi possível pedir a viagem')
      addLog(`Erro: ${msg}`, 'error')
    } finally {
      setCreating(false)
    }
  }, [
    token,
    pickupLocation,
    dropoffLocation,
    creating,
    pickupDestinationTooClose,
    addLog,
    setStatus,
    refetchHistory,
    setPassengerPendingTripDetail,
    setPassengerActiveTripId,
  ])

  const handleCancel = useCallback(
    async (reasonForApi?: string | null) => {
      if (!activeTripId || !token || cancelling) return
      setError(null)
      setCancelling(true)
      setStatus('A cancelar...')
      addLog('Clique: Cancelar viagem', 'action')
      try {
        const r = reasonForApi?.trim()
        await cancelTrip(activeTripId, token, r ? { reason: r.slice(0, 280) } : undefined)
        setPassengerPendingTripDetail(null)
        setPassengerActiveTripId(null)
        setPassengerCancelOpen(false)
        setPassengerCancelPreset('')
        setPassengerCancelOther('')
        setStatus('Pronto')
        addLog('Viagem cancelada', 'success')
        toast.success('Viagem cancelada')
        refetchHistory()
      } catch (err: unknown) {
        const msg = isTimeoutLikeError(err)
          ? 'Sem ligação ou o servidor demorou a responder. Verifica a rede e tenta cancelar de novo.'
          : humanizeCancelError(err)
        setError(msg)
        setStatus('Não foi possível cancelar')
        addLog(`Erro: ${msg}`, 'error')
      } finally {
        setCancelling(false)
      }
    },
    [
      activeTripId,
      token,
      cancelling,
      addLog,
      setStatus,
      refetchHistory,
      setPassengerPendingTripDetail,
      setPassengerActiveTripId,
    ]
  )

  /** P36: cancela o pedido actual e cria um novo com a mesma recolha/destino (re-disparo de dispatch). */
  const handleRetrySearch = useCallback(async () => {
    if (!token || !activeTripId || !activeTrip || activeTrip.status !== 'requested' || retrySearchPending) {
      return
    }
    setRetrySearchPending(true)
    setError(null)
    addLog('Clique: Tentar novamente', 'action')
    try {
      await cancelTrip(activeTripId, token, { reason: 'retry_dispatch' })
      const res = await createTrip(
        {
          origin_lat: activeTrip.origin_lat,
          origin_lng: activeTrip.origin_lng,
          destination_lat: activeTrip.destination_lat,
          destination_lng: activeTrip.destination_lng,
        },
        token
      )
      setPassengerPendingTripDetail(
        tripDetailFromCreateResponse(
          res,
          { lat: activeTrip.origin_lat, lng: activeTrip.origin_lng },
          { lat: activeTrip.destination_lat, lng: activeTrip.destination_lng }
        )
      )
      setPassengerActiveTripId(res.trip_id)
      setStatus(passengerTripStatusLabel(res.status))
      addLog('Pedido reenviado após tentar novamente', 'success')
      toast.success('Pedido reenviado')
      refetchHistory()
    } catch (err: unknown) {
      const msg = isTimeoutLikeError(err)
        ? 'Sem ligação ou o servidor demorou a responder. Tenta outra vez.'
        : humanizeCreateTripError(err)
      setError(msg)
      addLog(`Erro ao tentar novamente: ${msg}`, 'error')
    } finally {
      setRetrySearchPending(false)
    }
  }, [
    token,
    activeTripId,
    activeTrip,
    retrySearchPending,
    addLog,
    setPassengerActiveTripId,
    setStatus,
    refetchHistory,
  ])

  const driverTrackingHint = useMemo(() => {
    if (!passengerLocation || !driverLocation || !activeTrip) return null
    if (!isPassengerDriverTrackingStatus(activeTrip.status)) return null
    const km = haversineKm(passengerLocation, driverLocation)
    return `Motorista ${formatApproxDistanceKm(km)} de ti (estimativa).`
  }, [passengerLocation, driverLocation, activeTrip])

  // B002: UX state with 500ms delay to avoid flicker (must be declared before useEffects that use it)
  const uxState = usePassengerUxState(
    activeTrip,
    !!driverLocation,
    tripCompletedFromLocation
  )

  const banner = useMemo(
    () =>
      getPassengerBannerState({
        creating,
        activeTripId,
        activeTripLoading,
        activeTrip,
        uxState,
        isOnline,
      }),
    [creating, activeTripId, activeTripLoading, activeTrip, uxState, isOnline]
  )

  useEffect(() => {
    setStatus(banner.label)
  }, [banner.label, setStatus])

  useEffect(() => {
    if (activeTrip?.status === 'completed') {
      addLog('Viagem concluída', 'success')
      toast.success('Viagem concluída')
      setTripCompletedFromLocation(true)
    } else if (activeTrip?.status === 'cancelled') {
      addLog('Viagem cancelada', 'success')
      setPassengerActiveTripId(null)
    }
  }, [activeTrip?.status, addLog, setPassengerActiveTripId])

  /** Mapa da viagem: desde o pedido (requested) até concluída — dia 22 mapa sempre. */
  const showPassengerMap = useMemo(() => {
    if (!activeTrip || tripCompletedFromLocation) return false
    if (['cancelled', 'failed'].includes(activeTrip.status)) return false
    return [
      'requested',
      'assigned',
      'accepted',
      'arriving',
      'ongoing',
      'completed',
    ].includes(activeTrip.status)
  }, [activeTrip, tripCompletedFromLocation])

  /**
   * A017b: prioridade — viagem ativa > modo planeamento (input) > idle neutro (mapa sem cliques).
   * Mapa visível em idle mesmo sem planeamento; interação só com isPlanningMode.
   */
  const isTripIdle = !activeTripId && !creating && !tripCompletedFromLocation
  const isPickupPlanningMode = isTripIdle && isPlanningMode

  /** A019: estado UX explícito (Uber-like) */
  /** A021: um foco por estado — header vs painel vs mapa */
  const passengerUiState: PassengerUIState = useMemo(() => {
    if (tripCompletedFromLocation) return 'idle'
    if (creating && !activeTripId) return 'searching'
    if (activeTripId && !activeTrip) return 'searching'
    if (activeTripId && activeTrip) {
      if (activeTrip.status === 'requested') return 'searching'
      if (['assigned', 'accepted', 'arriving', 'ongoing'].includes(activeTrip.status)) return 'in_trip'
      return 'idle'
    }
    if (!activeTripId && !creating && !tripCompletedFromLocation) {
      if (!isPlanningMode) return 'idle'
      if (pickupLocation && dropoffLocation) return 'confirming'
      return 'planning'
    }
    return 'idle'
  }, [
    tripCompletedFromLocation,
    creating,
    activeTripId,
    activeTrip,
    isPlanningMode,
    pickupLocation,
    dropoffLocation,
  ])

  const plannerEmphasis = useMemo(() => {
    if (passengerUiState === 'idle' || passengerUiState === 'confirming') return 'primary' as const
    return 'subdued' as const
  }, [passengerUiState])

  /** A021: com StatusHeader + PassengerStatusCard, não repetir «Estado» no TripPlannerPanel em viagem. */
  const inTripSuppressPlannerEstadoEcho = useMemo(
    () => passengerUiState === 'in_trip' && Boolean(uxState && activeTrip),
    [passengerUiState, uxState, activeTrip]
  )

  /** B5: mesmo texto de pagamento já aparece em `PassengerStatusCard` em `TRIP_ONGOING` (subconjunto de estados). */
  const inTripSuppressPlannerPaymentEcho = useMemo(() => {
    if (passengerUiState !== 'in_trip' || uxState !== 'TRIP_ONGOING' || !activeTrip) return false
    const ps = activeTrip.payment_status
    return ps === 'pending' || ps === 'processing' || ps === 'failed'
  }, [passengerUiState, uxState, activeTrip])

  /** USER-SHELL-B: InfoPanel substitui StatusHeader + meta solta no planner. */
  const passengerInfoPanelCoversBanner = useMemo(
    () =>
      Boolean(
        uxState &&
        activeTrip &&
        (uxState === 'SEARCHING_DRIVER' ||
          uxState === 'DRIVER_ASSIGNED' ||
          uxState === 'DRIVER_ARRIVING' ||
          uxState === 'TRIP_ONGOING' ||
          uxState === 'TRIP_COMPLETED'),
      ),
    [uxState, activeTrip],
  )

  const inTripSuppressPlannerMetaEcho = passengerInfoPanelCoversBanner

  const showMapOnScreen = showPassengerMap || isTripIdle

  // A017: OSRM público só com os dois pontos e sem viagem activa
  useEffect(() => {
    if (!isPickupPlanningMode || !pickupLocation || !dropoffLocation) {
      setPlanningRouteGeoJSON(null)
      return
    }

    let cancelled = false

    void getRouteGeoJSON(pickupLocation, dropoffLocation)
      .then((geo) => {
        if (!cancelled) setPlanningRouteGeoJSON(geo)
      })
      .catch(() => {
        if (!cancelled) setPlanningRouteGeoJSON(null)
      })

    return () => {
      cancelled = true
    }
  }, [isPickupPlanningMode, pickupLocation, dropoffLocation])

  /** A019: distância / ETA no ecrã de confirmação */
  useEffect(() => {
    const confirming =
      isPlanningMode &&
      pickupLocation &&
      dropoffLocation &&
      !activeTripId &&
      !creating &&
      !tripCompletedFromLocation
    if (!confirming) {
      setConfirmRouteMeta(null)
      setConfirmRouteMetaLoading(false)
      return
    }
    let cancelled = false
    setConfirmRouteMetaLoading(true)
    void getOsrmRouteMeta(pickupLocation, dropoffLocation).then((m) => {
      if (!cancelled) setConfirmRouteMeta(m)
    }).finally(() => {
      if (!cancelled) setConfirmRouteMetaLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [
    isPlanningMode,
    pickupLocation,
    dropoffLocation,
    activeTripId,
    creating,
    tripCompletedFromLocation,
  ])

  const routeForMap = useMemo(() => {
    if (showPassengerMap && activeTrip) {
      const pickup = { lat: activeTrip.origin_lat, lng: activeTrip.origin_lng }
      const destination = { lat: activeTrip.destination_lat, lng: activeTrip.destination_lng }
      const mockApproachPhase =
        import.meta.env.DEV &&
        isMockLocationModeEnabled() &&
        ['accepted', 'arriving'].includes(activeTrip.status)
      if (mockApproachPhase) {
        return { from: MOCK_DRIVER_START, to: pickup }
      }
      // ongoing (+ resto): mesma linha recolha→destino (alinhado com fase 2 mock no motorista)
      return { from: pickup, to: destination }
    }
    return undefined
  }, [showPassengerMap, activeTrip])

  const tripMapLegs = useMemo(() => {
    if (!activeTrip || !showPassengerMap) return { pickup: null, dropoff: null }
    return {
      pickup: { lat: activeTrip.origin_lat, lng: activeTrip.origin_lng },
      dropoff: { lat: activeTrip.destination_lat, lng: activeTrip.destination_lng },
    }
  }, [showPassengerMap, activeTrip])

  const mapPlaceholder = useMemo(() => {
    if (tripCompletedFromLocation) return 'Viagem concluída'
    if (activeTripId && !activeTrip) return 'A sincronizar viagem…'
    if (!activeTrip) return 'Mapa indisponível.'
    if (activeTrip.status === 'requested') return ''
    if (activeTrip.status === 'assigned' && !driverLocation) {
      return 'A aguardar posição do motorista'
    }
    if (isPassengerDriverTrackingStatus(activeTrip.status) && !driverLocation) {
      return 'A aguardar posição do motorista'
    }
    return ''
  }, [activeTrip, activeTripId, driverLocation, tripCompletedFromLocation])

  const showSubmittingCard = creating && !activeTripId

  const passengerMapStageShowMap = showMapOnScreen || Boolean(activeTrip)

  /** A021: um foco por ecrã — header, mapa e painel coordenam peso visual */
  const a021Layout = useMemo(() => {
    switch (passengerUiState) {
      case 'idle':
        return { statusHeader: 'subdued' as const, map: 'subdued' as const, panel: 'default' as const }
      case 'planning':
        return { statusHeader: 'subdued' as const, map: 'emphasized' as const, panel: 'subdued' as const }
      case 'confirming':
        return { statusHeader: 'subdued' as const, map: 'subdued' as const, panel: 'default' as const }
      case 'searching':
        return { statusHeader: 'default' as const, map: 'subdued' as const, panel: 'subdued' as const }
      case 'in_trip':
        return { statusHeader: 'default' as const, map: 'emphasized' as const, panel: 'subdued' as const }
      default:
        return { statusHeader: 'default' as const, map: 'emphasized' as const, panel: 'default' as const }
    }
  }, [passengerUiState])

  /** A019: botão fixo só para ciclo de viagem ativa (Cancelar / Pedir nova viagem) */
  const showBottomPrimary =
    !!activeTripId &&
    (activeTrip?.status === 'completed' ||
      (!!activeTrip &&
        ['requested', 'assigned', 'accepted', 'arriving'].includes(activeTrip.status)))

  const primaryLabel =
    activeTrip?.status === 'completed'
      ? 'Pedir nova viagem'
      : activeTrip && ['requested', 'assigned', 'accepted', 'arriving'].includes(activeTrip.status)
        ? 'Cancelar'
        : null

  const handleStartNewTripAfterComplete = useCallback(() => {
    setPassengerActiveTripId(null)
    setTripCompletedFromLocation(false)
    setIsPlanningMode(false)
  }, [setPassengerActiveTripId])

  const primaryOnClick = useMemo(() => {
    if (primaryLabel === 'Pedir nova viagem') return handleStartNewTripAfterComplete
    if (primaryLabel === 'Cancelar') return () => setPassengerCancelOpen(true)
    return passengerDashboardNoop
  }, [primaryLabel, handleStartNewTripAfterComplete])

  const handleRatingSubmitted = useCallback(() => {
    void refetchActiveTrip()
  }, [refetchActiveTrip])

  const showPassengerRatingPanel =
    !!activeTripId &&
    !!token &&
    !!activeTrip &&
    sessionRole === 'passenger' &&
    activeTrip.status === 'completed' &&
    !!activeTrip.driver_id &&
    (activeTrip.driver_rating == null || activeTrip.driver_rating === undefined)

  // Após conclusão: limpar automaticamente só quando não estamos à espera do painel de avaliação.
  useEffect(() => {
    if (!tripCompletedFromLocation) return
    if (showPassengerRatingPanel) return
    const t = setTimeout(() => {
      setPassengerActiveTripId(null)
      setTripCompletedFromLocation(false)
    }, 2000)
    return () => clearTimeout(t)
  }, [
    tripCompletedFromLocation,
    showPassengerRatingPanel,
    setPassengerActiveTripId,
  ])

  const showDestinationSearch =
    passengerUiState !== 'confirming' && Boolean(pickupLocation)

  const showPickupSearch =
    passengerUiState !== 'confirming' && !pickupLocation

  const handleEditDestinationOnly = useCallback(() => {
    setDropoffLocation(null)
    setDestinationCandidate(null)
    setDropoffAddress(null)
    setConfirmRouteMeta(null)
    setDestinationQuery('')
    setGeoSuggestions([])
    setIsPlanningMode(true)
    mapAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  const pickupPreviewLocation = pickupLocation ?? (pickupCandidate
    ? { lat: pickupCandidate.lat, lng: pickupCandidate.lng }
    : null)
  const dropoffPreviewLocation = dropoffLocation ?? (destinationCandidate
    ? { lat: destinationCandidate.lat, lng: destinationCandidate.lng }
    : null)

  const passengerBottomNavEl = (
    <PassengerBottomNav active={passengerNavActive} onSelect={handlePassengerBottomNav} />
  )

  const passengerCancelPanelInOverlay =
    passengerCancelOpen && primaryLabel === 'Cancelar' ? (
      <div className="space-y-3 pt-1" data-testid="passenger-cancel-panel">
        <p className="text-sm font-medium text-foreground">Motivo do cancelamento</p>
        <label className="block text-xs text-muted-foreground" htmlFor="passenger-cancel-preset">
          Escolha rápida
        </label>
        <select
          id="passenger-cancel-preset"
          data-testid="passenger-cancel-preset"
          className={`w-full min-h-11 ${BTN_SECONDARY_RADIUS} border border-border bg-card px-2 text-sm text-foreground touch-manipulation`}
          value={passengerCancelPreset}
          onChange={(e) => setPassengerCancelPreset(e.target.value)}
          disabled={cancelling}
        >
          {PASSENGER_TRIP_CANCEL_PRESETS.map((o) => (
            <option key={o.value || 'none'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {passengerCancelPreset === TRIP_CANCEL_SELECT_OTHER ? (
          <textarea
            data-testid="passenger-cancel-other"
            className={`w-full min-h-[72px] ${BTN_SECONDARY_RADIUS} border border-border bg-card px-2 py-2 text-sm text-foreground`}
            placeholder="Descreve em poucas palavras (opcional)."
            maxLength={280}
            value={passengerCancelOther}
            onChange={(e) => setPassengerCancelOther(e.target.value)}
            disabled={cancelling}
          />
        ) : null}
        <MapActionRow testId="passenger-cancel-actions">
          <PrimaryActionButton
            className="flex-1 min-w-0"
            size="compact"
            variant="danger"
            loading={cancelling}
            disabled={cancelling}
            onClick={() =>
              void handleCancel(tripCancelReasonForApi(passengerCancelPreset, passengerCancelOther))
            }
          >
            Confirmar cancelamento
          </PrimaryActionButton>
          <button
            type="button"
            data-testid="passenger-cancel-back"
            className={`flex-1 min-w-0 ${BTN_SECONDARY}`}
            disabled={cancelling}
            onClick={() => {
              setPassengerCancelOpen(false)
              setPassengerCancelPreset('')
              setPassengerCancelOther('')
            }}
          >
            Voltar
          </button>
        </MapActionRow>
      </div>
    ) : null

  const passengerTripPrimaryInOverlay =
    !passengerCancelOpen && showBottomPrimary && primaryLabel ? (
      <MapActionRow testId="passenger-trip-action-stack">
        <PrimaryActionButton
          className="flex-1 min-w-0"
          size="compact"
          onClick={primaryOnClick}
          disabled={primaryLabel === 'Cancelar' ? cancelling : false}
          loading={primaryLabel === 'Cancelar' && cancelling}
          variant={primaryLabel === 'Cancelar' ? 'danger' : 'confirm'}
        >
          {primaryLabel}
        </PrimaryActionButton>
      </MapActionRow>
    ) : null

  const passengerBottomChrome = passengerBottomNavEl

  return (
    <ScreenContainer
      fullBleed
      contentVariant="driverImmersive"
      mainScrollable={false}
      bottomButton={passengerBottomChrome}
      bottomBarVariant={passengerBottomChrome ? 'flush' : 'inset'}
      mainScrollId="passenger-main-scroll"
    >
      <PassengerSideMenu
        open={passengerMenuOpen}
        onOpenChange={setPassengerMenuOpen}
        screen={passengerMenuScreen}
        onScreenChange={setPassengerMenuScreen}
        history={history}
        historyLoading={historyLoading}
        historyPollFault={historyPollFault}
      />
      {showPassengerRatingPanel ? (
        <PassengerTripRatingPanel
          tripId={activeTripId}
          token={token}
          onSubmitted={handleRatingSubmitted}
          onSkip={handleStartNewTripAfterComplete}
        />
      ) : null}

      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
        data-testid="passenger-main"
      >

        <div
          ref={mapAnchorRef}
          id="passenger-map-anchor"
          className="flex min-h-0 w-full flex-1 flex-col overflow-hidden"
        >
          <MapStage
            testId="passenger-map-stage"
            className="min-h-0 flex-1"
            overlayClassName="relative z-10 flex min-h-0 flex-1 flex-col justify-end p-2 pb-20 pointer-events-none"
            topOverlay={
              (import.meta.env.DEV && isMockLocationModeEnabled()) || geolocationUsedFallback ? (
                <div className="space-y-2">
                  {import.meta.env.DEV && isMockLocationModeEnabled() ? (
                    <div className="rounded-xl bg-violet-100 dark:bg-violet-500/15 border border-violet-300 dark:border-violet-400/40 px-3 py-2 text-sm text-violet-800 dark:text-violet-200">
                      <span aria-hidden>🧪</span> Simulação — passageiro fixo; motorista aproxima-se em tempo real após aceitar (rota OSRM).
                    </div>
                  ) : null}
                  {geolocationUsedFallback ? (
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
                  ) : null}
                </div>
              ) : null
            }
            map={{
              showMap: passengerMapStageShowMap,
              mapPlaceholder: mapPlaceholder || undefined,
              passengerLocation:
                passengerLocation ??
                (activeTrip
                  ? { lat: activeTrip.origin_lat, lng: activeTrip.origin_lng }
                  : undefined),
              driverLocation: driverLocation ?? undefined,
              route: routeForMap,
              tripPickup: tripMapLegs.pickup,
              tripDropoff: tripMapLegs.dropoff,
              mapVisualWeight: 'emphasized',
              pickupSelection: isPickupPlanningMode ? pickupPreviewLocation : null,
              dropoffSelection: isPickupPlanningMode ? dropoffPreviewLocation : null,
              onPlanningMapClick: isPickupPlanningMode ? handlePlanningMapClick : undefined,
              planningRouteGeometry: isPickupPlanningMode ? planningRouteGeoJSON : null,
              planningRecenter: dropoffPreviewLocation ?? pickupPreviewLocation,
              planningRecenterKey: mapRecenterKey,
            }}
            bottomOverlay={
              isTripIdle ? (
                <MapBottomSheet className="pointer-events-auto px-3 py-3 space-y-2 max-h-[min(55dvh,440px)] overflow-y-auto">
                    {showPickupSearch && (
                      <>
                        <DestinationSearchField
                          query={pickupQuery}
                          onQueryChange={handlePickupQueryChange}
                          suggestions={pickupGeoSuggestions}
                          loading={pickupGeoLoading}
                          onSelect={handlePickupPick}
                          label="Recolha da viagem"
                          placeholder="Recolha: rua, localidade, código postal…"
                          disabled={creating}
                          geocodingUnavailable={false}
                          onDismissSuggestions={dismissPickupGeoSuggestions}
                        />
                        {pickupCandidate ? (
                          <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                            <p className="text-sm font-medium text-foreground">Recolha em pré-visualização</p>
                            <p className="text-xs text-muted-foreground leading-snug">
                              {pickupCandidate.primary}
                              {pickupCandidate.secondary ? ` · ${pickupCandidate.secondary}` : ''}
                            </p>
                            <div className="flex gap-2">
                              <button type="button" onClick={confirmPickupCandidate} className="flex-1 rounded-lg bg-primary text-primary-foreground py-2 text-sm font-semibold hover:opacity-95 transition-opacity">Confirmar recolha</button>
                              <button type="button" onClick={clearPickupCandidate} className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/60 transition-colors">Limpar</button>
                            </div>
                          </div>
                        ) : null}
                      </>
                    )}
                    {showDestinationSearch && (
                      <>
                        <DestinationSearchField
                          query={destinationQuery}
                          onQueryChange={handleDestinationQueryChange}
                          suggestions={geoSuggestions}
                          loading={geoLoading}
                          onSelect={handleDestinationPick}
                          label="Destino da viagem"
                          placeholder="Destino: rua, localidade, código postal…"
                          disabled={creating}
                          geocodingUnavailable={false}
                          onDismissSuggestions={dismissGeoSuggestions}
                        />
                        {destinationCandidate ? (
                          <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                            <p className="text-sm font-medium text-foreground">Destino em pré-visualização</p>
                            <p className="text-xs text-muted-foreground leading-snug">
                              {destinationCandidate.primary}
                              {destinationCandidate.secondary ? ` · ${destinationCandidate.secondary}` : ''}
                            </p>
                            <div className="flex gap-2">
                              <button type="button" onClick={confirmDestinationCandidate} className="flex-1 rounded-lg bg-primary text-primary-foreground py-2 text-sm font-semibold hover:opacity-95 transition-opacity">Confirmar destino</button>
                              <button type="button" onClick={clearDestinationCandidate} className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/60 transition-colors">Limpar</button>
                            </div>
                          </div>
                        ) : null}
                      </>
                    )}
                    <TripPlannerPanel
                      embedded
                      uiState={passengerUiState}
                      emphasis={plannerEmphasis}
                      hasPickup={!!pickupLocation}
                      hasDropoff={!!dropoffLocation}
                      pickupAddress={pickupAddress}
                      dropoffAddress={dropoffAddress}
                      pickupAddressLoading={pickupAddressLoading}
                      dropoffAddressLoading={dropoffAddressLoading}
                      routeMeta={confirmRouteMeta}
                      routeMetaLoading={confirmRouteMetaLoading}
                      activeTrip={activeTrip ?? null}
                      tripPollHint={tripPollFootnote}
                      driverTrackingHint={driverTrackingHint}
                      slowRequestHint={
                        creating && createTakingLong
                          ? 'Ainda a processar o pedido… Se demorar muito, verifica a ligação.'
                          : null
                      }
                      onChooseMap={onChoosePlanningModeAndScrollToMap}
                      onSetDestinationHint={onScrollToMapAnchor}
                      onReset={resetPlanning}
                      onEditDestination={passengerUiState === 'confirming' ? handleEditDestinationOnly : undefined}
                      onConfirmTrip={handleRequestTrip}
                      confirmTripPending={creating}
                      confirmBlockedReason={
                        pickupDestinationTooClose
                          ? 'A recolha e o destino estão demasiado próximos (quase o mesmo sítio). Ajusta um dos pontos antes de confirmar.'
                          : null
                      }
                      visualWeight={a021Layout.panel}
                      inTripSuppressEstadoEcho={inTripSuppressPlannerEstadoEcho}
                      inTripSuppressPaymentEcho={inTripSuppressPlannerPaymentEcho}
                      inTripSuppressMetaEcho={inTripSuppressPlannerMetaEcho}
                    />
                  </MapBottomSheet>
              ) : (activeTripId || creating) && !showPassengerRatingPanel ? (
                <MapBottomSheet className="pointer-events-auto max-h-[min(42dvh,320px)] overflow-y-auto px-2 py-2">
                  {passengerCancelPanelInOverlay ? (
                    passengerCancelPanelInOverlay
                  ) : showSubmittingCard ? (
                    <div
                      className="flex flex-col items-center justify-center py-4 space-y-2"
                      data-testid="passenger-info-panel-submitting"
                    >
                      <Spinner size="md" />
                      <p className="text-sm font-semibold text-foreground">A enviar pedido…</p>
                    </div>
                  ) : uxState && activeTrip ? (
                    <div className="space-y-2">
                      <PassengerStatusCard
                        compact
                        uxState={uxState}
                        activeTrip={activeTrip}
                        onRetrySearch={
                          activeTrip?.status === 'requested' ? handleRetrySearch : undefined
                        }
                        retrySearchPending={retrySearchPending}
                        trackingHint={driverTrackingHint}
                        pollHint={tripPollFootnote}
                      />
                      {activeTrip.payment_status === 'processing' &&
                        typeof activeTrip.payment_intent_client_secret === 'string' &&
                        activeTrip.payment_intent_client_secret.length > 0 ? (
                        <PassengerPaymentConfirmCard
                          clientSecret={activeTrip.payment_intent_client_secret}
                          onConfirmed={() => void refetchActiveTrip()}
                        />
                      ) : null}
                      {passengerTripPrimaryInOverlay}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-4 space-y-2">
                      <Spinner size="md" />
                      <p className="text-sm text-foreground">A sincronizar viagem…</p>
                    </div>
                  )}
                </MapBottomSheet>
              ) : null
            }
          />
        </div>

      </div>

      {error && (
        <div className="pointer-events-auto absolute inset-x-0 top-14 z-30 mx-3 rounded-xl bg-destructive/10 border border-destructive/30 border-l-4 border-l-destructive px-4 py-3 pr-14 text-destructive text-base touch-manipulation">
          <button
            type="button"
            className="absolute right-2 top-2 min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg border border-destructive/40 bg-background/80 text-destructive text-xl font-medium leading-none hover:bg-background touch-manipulation"
            aria-label="Fechar mensagem de erro"
            onClick={() => setError(null)}
          >
            ×
          </button>
          <p className="leading-snug">{error}</p>
        </div>
      )}

      {historyPollFault && (
        <div className="pointer-events-auto absolute inset-x-0 top-14 z-30 mx-3 rounded-lg bg-warning/15 border border-warning/40 px-3 py-2 text-sm text-foreground">
          Não foi possível actualizar o histórico. Voltamos a tentar — verifica a ligação se o aviso persistir.
        </div>
      )}
    </ScreenContainer>
  )
}
