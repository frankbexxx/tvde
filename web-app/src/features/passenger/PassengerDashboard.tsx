import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useActivityLog } from '../../context/ActivityLogContext'
import { useActiveTrip } from '../../context/ActiveTripContext'
import { useDevToolsCallbacks } from '../../context/DevToolsCallbackContext'
import { createTrip, getTripHistory, getTripDetail, cancelTrip } from '../../api/trips'
import { isTimeoutLikeError } from '../../api/client'
import type { TripDetailResponse, TripHistoryItem } from '../../api/trips'
import { usePolling } from '../../hooks/usePolling'
import { usePollStallHint } from '../../hooks/usePollStallHint'
import { passengerTripStatusLabel } from '../../constants/tripStatusLabels'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { useGeolocation } from '../../hooks/useGeolocation'
import { ScreenContainer } from '../../components/layout/ScreenContainer'
import { StatusHeader } from '../../components/layout/StatusHeader'
import { PrimaryActionButton } from '../../components/layout/PrimaryActionButton'
import { Spinner } from '../../components/ui/Spinner'
import { formatPickup, formatDestination } from '../../utils/format'
import type { FeatureCollection, LineString } from 'geojson'
import { MapView } from '../../maps/MapView'
import { getRouteGeoJSON } from '../../maps/routing'
import { getOsrmRouteMeta } from '../../services/routingService'
import {
  forwardGeocodeSearch,
  reverseGeocode,
  type GeocodeSuggestion,
} from '../../services/geocoding'
import { DestinationSearchField } from './DestinationSearchField'
import { getDriverLocation } from '../../services/trackingService'
import { TripPlannerPanel, type PassengerUIState } from './TripPlannerPanel'
import { usePassengerUxState } from './usePassengerUxState'
import { PassengerStatusCard } from './PassengerStatusCard'
import {
  getPassengerBannerState,
  humanizeCancelError,
  humanizeCreateTripError,
} from './passengerBanner'
import { toast } from 'sonner'

/** Câmara Municipal de Oeiras — centro do mapa / fallback de posição do passageiro */
const DEMO_ORIGIN = { lat: 38.6973, lng: -9.30836 }

const ESTIMATE_MOCK = '4–6'

const HAS_MAPTILER_KEY = Boolean(import.meta.env.VITE_MAPTILER_KEY)

/** Resultado do poll do detalhe — `notFound` só após 404 explícito (não confundir com erro de rede). */
type PassengerTripPollResult = {
  trip: TripDetailResponse | null
  notFound: boolean
}

export function PassengerDashboard() {
  const { token } = useAuth()
  const { addLog, setStatus } = useActivityLog()
  const { passengerActiveTripId, setPassengerActiveTripId } = useActiveTrip()
  const activeTripId = passengerActiveTripId
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createTakingLong, setCreateTakingLong] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const { position: passengerLocation, usedFallback: geolocationUsedFallback } = useGeolocation()
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null)
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
  const [destinationQuery, setDestinationQuery] = useState('')
  const [geoSuggestions, setGeoSuggestions] = useState<GeocodeSuggestion[]>([])
  const [geoLoading, setGeoLoading] = useState(false)
  const [mapRecenterKey, setMapRecenterKey] = useState(0)

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
    isLoading: activeTripLoading,
    isRefreshing: activeTripRefreshing,
    lastSuccessAt: activeTripLastSuccessAt,
    pollFault: activeTripPollFault,
  } = usePolling<PassengerTripPollResult>(
    fetchPassengerActiveTrip,
    [fetchPassengerActiveTrip],
    !!activeTripId && !!token,
    3000
  )

  const activeTrip = activeTripPoll?.trip ?? null
  const activeTripNotFound = activeTripPoll?.notFound ?? false

  const tripPollStalled = usePollStallHint(
    activeTripLastSuccessAt,
    activeTripRefreshing,
    Boolean(activeTripId && activeTrip)
  )

  const tripPollFootnote = activeTripId
    ? activeTripPollFault
      ? 'Não foi possível atualizar agora. Verifica a ligação — voltamos a tentar de seguida.'
      : activeTripRefreshing
        ? 'A atualizar estado…'
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
    const q = destinationQuery.trim()
    if (q.length < 2 || !HAS_MAPTILER_KEY) {
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
  }, [destinationQuery])

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
    setDestinationQuery('')
    setGeoSuggestions([])
  }, [])

  const handleDestinationPick = useCallback((s: GeocodeSuggestion) => {
    setDropoffLocation({ lat: s.lat, lng: s.lng })
    setDestinationQuery(s.primary)
    setGeoSuggestions([])
    setIsPlanningMode(true)
    setMapRecenterKey((k) => k + 1)
    toast.success('Destino selecionado')
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

  const handleRequestTrip = async () => {
    if (!token) return
    if (!pickupLocation || !dropoffLocation) return
    if (creating) return

    console.log('Creating trip with:', { pickupLocation, dropoffLocation })

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
      setPassengerActiveTripId(res.trip_id)
      setStatus(passengerTripStatusLabel(res.status))
      const est = res.estimated_price != null && res.estimated_price > 0 ? `${res.estimated_price}` : ESTIMATE_MOCK
      addLog(`Viagem criada (${res.status}) — estimativa ${est} €`, 'success')
      toast.success('Pedido enviado — a sincronizar…')
      refetchHistory()
    } catch (err: unknown) {
      const msg = isTimeoutLikeError(err)
        ? 'Sem ligação ou o servidor demorou a responder. Verifica a rede e tenta de novo.'
        : humanizeCreateTripError((err as { detail?: string })?.detail)
      setError(msg)
      setStatus('Não foi possível pedir a viagem')
      addLog(`Erro: ${msg}`, 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleCancel = async () => {
    if (!activeTripId || !token || cancelling) return
    setError(null)
    setCancelling(true)
    setStatus('A cancelar...')
    addLog('Clique: Cancelar viagem', 'action')
    try {
      await cancelTrip(activeTripId, token)
      setPassengerActiveTripId(null)
      setStatus('Pronto')
      addLog('Viagem cancelada', 'success')
      toast.success('Viagem cancelada')
      refetchHistory()
    } catch (err: unknown) {
      const msg = isTimeoutLikeError(err)
        ? 'Sem ligação ou o servidor demorou a responder. Verifica a rede e tenta cancelar de novo.'
        : humanizeCancelError((err as { detail?: string })?.detail)
      setError(msg)
      setStatus('Não foi possível cancelar')
      addLog(`Erro: ${msg}`, 'error')
    } finally {
      setCancelling(false)
    }
  }

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

  const showPassengerMap = useMemo(() => {
    if (!activeTrip || tripCompletedFromLocation) return false
    if (activeTrip.status === 'requested') return false
    if (!driverLocation) return false
    if (['cancelled', 'failed', 'completed'].includes(activeTrip.status)) return false
    return ['assigned', 'accepted', 'arriving', 'ongoing'].includes(activeTrip.status)
  }, [activeTrip, driverLocation, tripCompletedFromLocation])

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

  const statusHeaderEmphasis = useMemo(() => {
    if (passengerUiState === 'searching' || passengerUiState === 'in_trip') return 'primary' as const
    return 'subdued' as const
  }, [passengerUiState])

  const plannerEmphasis = useMemo(() => {
    if (passengerUiState === 'idle' || passengerUiState === 'confirming') return 'primary' as const
    return 'subdued' as const
  }, [passengerUiState])

  /** Painel inferior: omitir "searching" duplicado quando já há PassengerStatusCard em requested */
  const showTripPlannerPanel = useMemo(() => {
    if (tripCompletedFromLocation) return false
    if (creating && !activeTripId) return true
    if (activeTripId && !activeTrip) return false
    if (activeTripId && activeTrip?.status === 'requested') return false
    if (activeTripId && activeTrip) {
      if (['assigned', 'accepted', 'arriving', 'ongoing'].includes(activeTrip.status)) return true
      return false
    }
    if (isTripIdle) return true
    return false
  }, [tripCompletedFromLocation, creating, activeTripId, activeTrip, isTripIdle])

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
      return {
        from: { lat: activeTrip.origin_lat, lng: activeTrip.origin_lng },
        to: { lat: activeTrip.destination_lat, lng: activeTrip.destination_lng },
      }
    }
    return undefined
  }, [showPassengerMap, activeTrip])

  const mapPlaceholder = useMemo(() => {
    if (tripCompletedFromLocation) return 'Viagem concluída'
    if (activeTripId && !activeTrip) return 'A sincronizar viagem…'
    if (!activeTrip) return 'Mapa indisponível.'
    if (activeTrip.status === 'requested') return 'À procura de motorista'
    if (
      ['assigned', 'accepted', 'arriving', 'ongoing'].includes(activeTrip.status) &&
      !driverLocation
    ) {
      return 'A aguardar posição do motorista'
    }
    return 'Mapa indisponível.'
  }, [activeTrip, activeTripId, driverLocation, tripCompletedFromLocation])

  const showSubmittingCard = creating && !activeTripId

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
        return { statusHeader: 'default' as const, map: 'subdued' as const, panel: 'subdued' as const }
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

  const primaryOnClick =
    primaryLabel === 'Pedir nova viagem'
      ? () => {
          setPassengerActiveTripId(null)
          setIsPlanningMode(false)
        }
      : primaryLabel === 'Cancelar'
        ? handleCancel
        : () => {}

  // When trip completed (from driver-location 409 or trip poll): show TRIP_COMPLETED, then clear after 2s.
  useEffect(() => {
    if (!tripCompletedFromLocation) return
    const t = setTimeout(() => {
      setPassengerActiveTripId(null)
      setTripCompletedFromLocation(false)
    }, 2000)
    return () => clearTimeout(t)
  }, [tripCompletedFromLocation, setPassengerActiveTripId])

  // Poll da posição do motorista: intervalo curto com viagem atribuída/em curso; mais lento em `requested` (menos 404 na rede).
  const driverLocPollMs = useMemo(() => {
    const s = activeTrip?.status
    if (s && ['assigned', 'accepted', 'arriving', 'ongoing'].includes(s)) return 1500
    if (s === 'requested') return 5000
    return 3000
  }, [activeTrip?.status])

  useEffect(() => {
    if (!activeTripId || tripCompletedFromLocation) {
      setDriverLocation(null)
      return
    }

    let cancelled = false

    const pollOnce = () => {
      if (cancelled) return
      void getDriverLocation(activeTripId).then((result) => {
        if (cancelled) return
        if (result.ok) {
          setDriverLocation({ lat: result.lat, lng: result.lng })
        } else if (result.reason === 'trip_completed') {
          setTripCompletedFromLocation(true)
          setDriverLocation(null)
        } else if (result.reason === 'driver_not_assigned' || result.reason === 'location_unavailable') {
          setDriverLocation(null)
        }
      }).catch((err) => {
        if (cancelled) return
        const st = (err as { status?: number })?.status
        if (st != null && st >= 500) {
          console.warn('getDriverLocation falha de servidor', err)
        } else if (st === 0) {
          console.warn('getDriverLocation rede / timeout', err)
        } else {
          console.warn('getDriverLocation', err)
        }
      })
    }

    pollOnce()
    const interval = setInterval(pollOnce, driverLocPollMs)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [activeTripId, tripCompletedFromLocation, driverLocPollMs, setPassengerActiveTripId])

  /** Bloco único: título, regra de preço, mapa, estado compacto, acções (sem cartões empilhados). */
  const unifiedPassengerPlanning =
    isTripIdle &&
    (passengerUiState === 'idle' ||
      passengerUiState === 'planning' ||
      passengerUiState === 'confirming')

  return (
    <ScreenContainer
      bottomButton={
        showBottomPrimary && primaryLabel ? (
          <PrimaryActionButton
            onClick={primaryOnClick}
            disabled={primaryLabel === 'Cancelar' ? cancelling : false}
            loading={primaryLabel === 'Cancelar' && cancelling}
            variant={primaryLabel === 'Cancelar' ? 'danger' : 'primary'}
          >
            {primaryLabel}
          </PrimaryActionButton>
        ) : undefined
      }
    >
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

      <div className="space-y-6 mt-6 transition-opacity duration-300 ease-out">
        {unifiedPassengerPlanning ? (
          <section
            className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm transition-opacity duration-300 ease-out"
            aria-label="Pedir viagem"
          >
            {passengerUiState !== 'confirming' ? (
              <div className="px-4 pt-4 pb-1 space-y-2">
                <DestinationSearchField
                  query={destinationQuery}
                  onQueryChange={setDestinationQuery}
                  suggestions={geoSuggestions}
                  loading={geoLoading}
                  onSelect={handleDestinationPick}
                  disabled={creating}
                  geocodingUnavailable={!HAS_MAPTILER_KEY}
                  onDismissSuggestions={() => setGeoSuggestions([])}
                />
              </div>
            ) : null}
            <div className="px-4 pt-4 pb-3 space-y-2">
              {passengerUiState === 'confirming' ? (
                <>
                  <h2 className="text-xl font-bold text-foreground tracking-tight">Confirma a viagem</h2>
                  <p className="text-sm text-foreground/80 leading-snug">
                    Estimativa ao pedir; o preço final aparece no fim da viagem.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-foreground tracking-tight">Para onde vais?</h2>
                  <p className="text-sm text-foreground/80 leading-snug">
                    {passengerUiState === 'planning'
                      ? 'Indica recolha e destino no mapa.'
                      : 'Escolhe recolha e destino para pedir uma viagem'}
                  </p>
                  {passengerUiState === 'idle' ? (
                    <p className="text-xs text-muted-foreground leading-snug">
                      Começa por indicar o destino
                    </p>
                  ) : null}
                </>
              )}
            </div>

            <div ref={mapAnchorRef} id="passenger-map-anchor" className="scroll-mt-4 border-t border-border">
              <MapView
                className="rounded-none shadow-none"
                showMap={showMapOnScreen}
                mapPlaceholder={mapPlaceholder}
                pickupSelection={isPickupPlanningMode ? pickupLocation : null}
                dropoffSelection={isPickupPlanningMode ? dropoffLocation : null}
                onPlanningMapClick={isPickupPlanningMode ? handlePlanningMapClick : undefined}
                passengerLocation={
                  passengerLocation ?? (activeTrip
                    ? {
                        lat: activeTrip.origin_lat,
                        lng: activeTrip.origin_lng,
                      }
                    : DEMO_ORIGIN)
                }
                driverLocation={driverLocation ?? undefined}
                route={routeForMap}
                planningRouteGeometry={isPickupPlanningMode ? planningRouteGeoJSON : null}
                mapVisualWeight={a021Layout.map}
                planningRecenter={dropoffLocation}
                planningRecenterKey={mapRecenterKey}
              />
            </div>

            <div className="px-4 py-4 border-t border-border bg-card/40">
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
                slowRequestHint={
                  creating && createTakingLong
                    ? 'Ainda a processar o pedido… Se demorar muito, verifica a ligação.'
                    : null
                }
                onChooseMap={() => setIsPlanningMode(true)}
                onSetDestinationHint={() =>
                  mapAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
                onReset={resetPlanning}
                onConfirmTrip={handleRequestTrip}
                confirmTripPending={creating}
                visualWeight={a021Layout.panel}
              />
            </div>
          </section>
        ) : (
          <>
            <StatusHeader
              label={banner.label}
              subLabel={banner.subLabel}
              variant={banner.variant}
              emphasis={statusHeaderEmphasis}
            />
            {tripPollFootnote ? (
              <p
                className="text-center text-xs text-foreground/55 -mt-3 mb-5 min-h-[1.25rem]"
                aria-live="polite"
              >
                {tripPollFootnote}
              </p>
            ) : null}

            <div ref={mapAnchorRef} id="passenger-map-anchor" className="scroll-mt-4">
              <MapView
                showMap={showMapOnScreen}
                mapPlaceholder={mapPlaceholder}
                pickupSelection={isPickupPlanningMode ? pickupLocation : null}
                dropoffSelection={isPickupPlanningMode ? dropoffLocation : null}
                onPlanningMapClick={isPickupPlanningMode ? handlePlanningMapClick : undefined}
                passengerLocation={
                  passengerLocation ?? (activeTrip
                    ? {
                        lat: activeTrip.origin_lat,
                        lng: activeTrip.origin_lng,
                      }
                    : DEMO_ORIGIN)
                }
                driverLocation={driverLocation ?? undefined}
                route={routeForMap}
                planningRouteGeometry={isPickupPlanningMode ? planningRouteGeoJSON : null}
                mapVisualWeight={a021Layout.map}
                planningRecenter={dropoffLocation}
                planningRecenterKey={mapRecenterKey}
              />
            </div>

            {showTripPlannerPanel && (
              <TripPlannerPanel
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
                slowRequestHint={
                  creating && createTakingLong
                    ? 'Ainda a processar o pedido… Se demorar muito, verifica a ligação.'
                    : null
                }
                onChooseMap={() => setIsPlanningMode(true)}
                onSetDestinationHint={() =>
                  mapAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
                onReset={resetPlanning}
                onConfirmTrip={handleRequestTrip}
                confirmTripPending={creating}
                visualWeight={a021Layout.panel}
              />
            )}
          </>
        )}

        {error && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-destructive text-base">
            {error}
          </div>
        )}

        {/* A014: estado da viagem; A019: envio inicial usa TripPlannerPanel (searching) */}
        {(activeTripId || creating) && !showSubmittingCard && (
          uxState && activeTrip ? (
            <PassengerStatusCard uxState={uxState} activeTrip={activeTrip} />
          ) : (
            <div className="flex flex-col items-center justify-center py-8 space-y-3 rounded-2xl border border-border bg-card transition-all duration-500 animate-in fade-in duration-300">
              <Spinner size="lg" />
              <p className="text-foreground text-base font-medium">A sincronizar viagem…</p>
              <p className="text-foreground/80 text-sm text-center px-4">
                A obter o estado mais recente da viagem.
              </p>
            </div>
          )
        )}

        {historyPollFault && (
          <div className="rounded-lg bg-warning/15 border border-warning/40 px-3 py-2 text-sm text-foreground">
            Não foi possível atualizar o histórico. Voltamos a tentar — verifica a ligação se o aviso persistir.
          </div>
        )}

        {!!token && !historyLoading && history && history.length > 0 ? (
          <section className="pt-8 mt-8 border-t border-border">
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
        ) : null}
        {!!token && !historyLoading && history !== null && history.length === 0 ? (
          <section className="pt-8 mt-8 border-t border-border">
            <h2 className="text-base font-medium text-foreground/75 mb-3">Histórico</h2>
            <p className="text-sm text-muted-foreground leading-relaxed rounded-xl border border-dashed border-border/80 bg-muted/30 px-4 py-6 text-center">
              Ainda não tens viagens concluídas nesta conta.
            </p>
          </section>
        ) : null}
      </div>
    </ScreenContainer>
  )
}
