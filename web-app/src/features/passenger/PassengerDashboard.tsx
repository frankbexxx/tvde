import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useActivityLog } from '../../context/ActivityLogContext'
import { useActiveTrip } from '../../context/ActiveTripContext'
import { createTrip, getTripHistory, getTripDetail, cancelTrip } from '../../api/trips'
import type { TripDetailResponse, TripHistoryItem } from '../../api/trips'
import { usePolling } from '../../hooks/usePolling'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { useGeolocation } from '../../hooks/useGeolocation'
import { ScreenContainer } from '../../components/layout/ScreenContainer'
import { StatusHeader } from '../../components/layout/StatusHeader'
import { PrimaryActionButton } from '../../components/layout/PrimaryActionButton'
import { Spinner } from '../../components/ui/Spinner'
import { formatPickup, formatDestination } from '../../utils/format'
import { DevTools } from '../shared/DevTools'
import { MapView } from '../../maps/MapView'
import { getDriverLocation } from '../../services/trackingService'
import { usePassengerUxState } from './usePassengerUxState'
import { PassengerStatusCard } from './PassengerStatusCard'
import {
  getPassengerBannerState,
  humanizeCancelError,
  humanizeCreateTripError,
} from './passengerBanner'
import { toast } from 'sonner'

/** Câmara Municipal de Oeiras, Largo Marquês de Pombal */
const DEMO_ORIGIN = { lat: 38.6973, lng: -9.30836 }
/** Lisboa centro (destino típico de Oeiras) */
const DEMO_DEST = { lat: 38.7223, lng: -9.1393 }

const ESTIMATE_MOCK = '4–6'

const POST_CREATE_LABEL: Record<string, string> = {
  requested: 'À procura de motorista',
  assigned: 'Motorista atribuído',
  accepted: 'Motorista a caminho',
  arriving: 'A chegar',
  ongoing: 'Viagem em curso',
  completed: 'Viagem concluída',
}

export function PassengerDashboard() {
  const { token } = useAuth()
  const { addLog, setStatus } = useActivityLog()
  const { passengerActiveTripId, setPassengerActiveTripId } = useActiveTrip()
  const activeTripId = passengerActiveTripId
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const { position: passengerLocation, usedFallback: geolocationUsedFallback } = useGeolocation()
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [tripCompletedFromLocation, setTripCompletedFromLocation] = useState(false)
  /** A015: pickup escolhido no mapa (sem backend até A018) */
  const [pickupLocation, setPickupLocation] = useState<{ lat: number; lng: number } | null>(null)

  const { data: history, refetch: refetchHistory } = usePolling(
    () => getTripHistory(token!),
    [token],
    !!token,
    10000
  )

  const isOnline = useOnlineStatus()
  const { data: activeTrip, isLoading: activeTripLoading } = usePolling<TripDetailResponse | null>(
    () =>
      activeTripId && token
        ? getTripDetail(activeTripId, token).catch(() => null)
        : Promise.resolve(null),
    [activeTripId, token],
    !!activeTripId && !!token,
    3000
  )

  // Clear stale activeTripId when trip returns 404 (cancelled/deleted) — avoids "A verificar..." loop
  useEffect(() => {
    if (!activeTripId) return
    if (activeTripLoading) return
    if (activeTrip !== null) return
    setPassengerActiveTripId(null)
    setStatus('Pronto')
  }, [activeTripId, activeTrip, activeTripLoading, setPassengerActiveTripId, setStatus])

  useEffect(() => {
    if (activeTripId) setPickupLocation(null)
  }, [activeTripId])

  const handlePickupMapSelect = useCallback((coords: { lat: number; lng: number }) => {
    setPickupLocation(coords)
  }, [])

  const handleRequestTrip = async () => {
    if (!token) return
    setError(null)
    setCreating(true)
    setStatus('A pedir viagem...')
    addLog('Clique: Pedir viagem', 'action')
    // Optimistic: show SEARCHING immediately (handled by creating + optimisticTrip below)
    try {
      const res = await createTrip(
        {
          origin_lat: DEMO_ORIGIN.lat,
          origin_lng: DEMO_ORIGIN.lng,
          destination_lat: DEMO_DEST.lat,
          destination_lng: DEMO_DEST.lng,
        },
        token
      )
      setPassengerActiveTripId(res.trip_id)
      setStatus(POST_CREATE_LABEL[res.status] ?? res.status)
      const est = res.estimated_price != null && res.estimated_price > 0 ? `${res.estimated_price}` : ESTIMATE_MOCK
      addLog(`Viagem criada (${res.status}) — estimativa ${est} €`, 'success')
      refetchHistory()
    } catch (err: unknown) {
      const msg = humanizeCreateTripError((err as { detail?: string })?.detail)
      setError(msg)
      setStatus('Não foi possível pedir a viagem')
      addLog(`Erro: ${msg}`, 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleCancel = async () => {
    if (!activeTripId || !token) return
    setError(null)
    setStatus('A cancelar...')
    addLog('Clique: Cancelar viagem', 'action')
    try {
      await cancelTrip(activeTripId, token)
      setPassengerActiveTripId(null)
      setStatus('Pronto')
      addLog('Viagem cancelada', 'success')
      refetchHistory()
    } catch (err: unknown) {
      const msg = humanizeCancelError((err as { detail?: string })?.detail)
      setError(msg)
      setStatus('Não foi possível cancelar')
      addLog(`Erro: ${msg}`, 'error')
    }
  }

  const isActiveStatus = (s: string) =>
    ['requested', 'assigned', 'accepted', 'arriving', 'ongoing'].includes(s)

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

  /** A015: mapa interativo antes de pedir viagem */
  const isPickupPlanningMode = !activeTripId && !creating && !tripCompletedFromLocation

  const showMapOnScreen = showPassengerMap || isPickupPlanningMode

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

  const showPrimaryButton =
    !activeTripId ||
    isActiveStatus(activeTrip?.status ?? '') ||
    activeTrip?.status === 'completed'

  const primaryLabel = !activeTripId
    ? 'Pedir viagem'
    : activeTrip?.status === 'completed'
      ? 'Pedir nova viagem'
      : ['requested', 'assigned', 'accepted', 'arriving'].includes(activeTrip?.status ?? '')
        ? 'Cancelar'
        : null

  const primaryOnClick =
    primaryLabel === 'Pedir nova viagem'
      ? () => setPassengerActiveTripId(null)
      : primaryLabel === 'Cancelar'
        ? handleCancel
        : handleRequestTrip

  // When trip completed (from driver-location 409 or trip poll): show TRIP_COMPLETED, then clear after 2s.
  useEffect(() => {
    if (!tripCompletedFromLocation) return
    const t = setTimeout(() => {
      setPassengerActiveTripId(null)
      setTripCompletedFromLocation(false)
    }, 2000)
    return () => clearTimeout(t)
  }, [tripCompletedFromLocation, setPassengerActiveTripId])

  // Poll driver location for the active trip so passenger can see live movement.
  // A013: 404 / 409 não terminais = fluxo normal (sem setError). 409 terminal → trip_completed + clear.
  useEffect(() => {
    if (!activeTripId || tripCompletedFromLocation) {
      setDriverLocation(null)
      return
    }

    let cancelled = false
    const interval = setInterval(() => {
      if (cancelled) return
      void getDriverLocation(activeTripId).then((result) => {
        if (cancelled) return
        if (result.ok) {
          setDriverLocation({ lat: result.lat, lng: result.lng })
        } else if (result.reason === 'trip_completed') {
          setTripCompletedFromLocation(true)
          setDriverLocation(null)
        } else if (result.reason === 'driver_not_assigned' || result.reason === 'location_unavailable') {
          // A013: sem erro de UI — pin só quando há coords; estados “à espera” / “localização neste estado não disponível”
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
    }, 2000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [activeTripId, tripCompletedFromLocation, setPassengerActiveTripId])

  return (
    <ScreenContainer
      bottomButton={
        showPrimaryButton && primaryLabel ? (
          <PrimaryActionButton
            onClick={primaryOnClick}
            disabled={
              creating ||
              (!!activeTripId && primaryLabel !== 'Cancelar' && primaryLabel !== 'Pedir nova viagem')
            }
            loading={creating}
            variant={primaryLabel === 'Cancelar' ? 'danger' : 'primary'}
          >
            {primaryLabel}
          </PrimaryActionButton>
        ) : undefined
      }
    >
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Passageiro</h1>
        <p className="text-muted-foreground mt-1">Pedir e acompanhar viagens</p>
      </header>

      <DevTools lastCreatedTripId={activeTripId} onAssigned={refetchHistory} mode="passenger" />

      {geolocationUsedFallback && (
        <div className="rounded-lg bg-warning/20 border border-warning/50 px-3 py-2 text-sm text-warning">
          A usar Oeiras (localização indisponível). Para não pedir permissão no próximo carregamento, ativa{' '}
          <strong>Demo Oeiras</strong> em ▶ Dev.
        </div>
      )}

      <div className="space-y-6 mt-6 transition-opacity duration-300 ease-out">
        <StatusHeader label={banner.label} variant={banner.variant} />

        {/* A014: em viagem, mapa só com motorista + GPS; A015: em idle, mapa clicável para pickup */}
        <MapView
          showMap={showMapOnScreen}
          mapPlaceholder={mapPlaceholder}
          pickupSelection={isPickupPlanningMode ? pickupLocation : null}
          onPickupSelect={isPickupPlanningMode ? handlePickupMapSelect : undefined}
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
        />

        {isPickupPlanningMode && (
          <p
            className="text-center text-sm font-medium text-muted-foreground -mt-2 transition-colors duration-300"
            aria-live="polite"
          >
            {pickupLocation ? 'Origem selecionada' : 'Seleciona ponto de recolha'}
          </p>
        )}

        {error && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-destructive text-base">
            {error}
          </div>
        )}

        {!activeTripId && (
          <div className="space-y-4">
            <p className="text-base text-foreground">
              Estimativa: <strong>{ESTIMATE_MOCK} €</strong>
            </p>
          </div>
        )}

        {/* A014: loading (envio) separado de waiting (à procura) */}
        {(activeTripId || creating) && (
          showSubmittingCard ? (
            <PassengerStatusCard isSubmittingTrip uxState={null} activeTrip={null} />
          ) : uxState && activeTrip ? (
            <PassengerStatusCard uxState={uxState} activeTrip={activeTrip} />
          ) : (
            <div className="flex flex-col items-center justify-center py-8 space-y-3 rounded-2xl border border-border bg-muted transition-all duration-500 animate-in fade-in duration-300">
              <Spinner size="lg" />
              <p className="text-muted-foreground text-base font-medium">A sincronizar viagem…</p>
              <p className="text-muted-foreground text-sm text-center px-4">
                A obter o estado mais recente da viagem.
              </p>
            </div>
          )
        )}

        {history && history.length > 0 && (
          <section className="pt-6 mt-6 border-t border-border">
            <h2 className="text-base font-medium text-muted-foreground mb-3">Histórico</h2>
            <ul className="space-y-2">
              {history.slice(0, 5).map((t: TripHistoryItem) => (
                <li
                  key={t.trip_id}
                  className="flex justify-between items-center py-2 border-b border-border last:border-0 transition-opacity duration-150"
                >
                  <span className="text-base text-muted-foreground">
                    {formatPickup(t.origin_lat, t.origin_lng)} →{' '}
                    {formatDestination(t.destination_lat, t.destination_lng)}
                  </span>
                  <span className="font-medium text-muted-foreground">
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
