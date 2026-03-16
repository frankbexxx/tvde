import { useEffect, useState } from 'react'
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
import { TripCard } from '../../components/cards/TripCard'
import { Spinner } from '../../components/ui/Spinner'
import { formatPickup, formatDestination } from '../../utils/format'
import { DevTools } from '../shared/DevTools'
import { MapView } from '../../maps/MapView'
import { getDriverLocation } from '../../services/trackingService'

const DEMO_ORIGIN = { lat: 38.7223, lng: -9.1393 }
const DEMO_DEST = { lat: 38.7369, lng: -9.1386 }

const ESTIMATE_MOCK = '4–6'

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: import('../../components/layout/StatusHeader').StatusVariant }
> = {
  requested: { label: 'À procura de motorista', variant: 'requested' },
  assigned: { label: 'Motorista atribuído', variant: 'assigned' },
  accepted: { label: 'Motorista a caminho', variant: 'accepted' },
  arriving: { label: 'Motorista a chegar', variant: 'arriving' },
  ongoing: { label: 'Em viagem', variant: 'ongoing' },
  completed: { label: 'Viagem concluída', variant: 'completed' },
  cancelled: { label: 'Cancelada', variant: 'idle' },
  failed: { label: 'Falhou', variant: 'error' },
}

export function PassengerDashboard() {
  const { token } = useAuth()
  const { addLog, setStatus } = useActivityLog()
  const { passengerActiveTripId, setPassengerActiveTripId } = useActiveTrip()
  const activeTripId = passengerActiveTripId
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const passengerLocation = useGeolocation()
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null)

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

  const handleRequestTrip = async () => {
    if (!token) return
    setError(null)
    setCreating(true)
    setStatus('A pedir viagem...')
    addLog('Clique: Pedir viagem', 'action')
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
      setStatus(STATUS_CONFIG[res.status]?.label ?? res.status)
      const est = res.estimated_price != null && res.estimated_price > 0 ? `${res.estimated_price}` : ESTIMATE_MOCK
      addLog(`Viagem criada (${res.status}) — estimativa ${est} €`, 'success')
      refetchHistory()
    } catch (err: unknown) {
      const msg = String((err as { detail?: string })?.detail ?? 'Erro ao pedir viagem')
      setError(msg)
      setStatus('Erro ao pedir viagem')
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
      const msg = (err as { detail?: string })?.detail ?? 'Erro ao cancelar'
      setError(String(msg))
      setStatus('Erro ao cancelar')
      addLog(`Erro: ${msg}`, 'error')
    }
  }

  const isActiveStatus = (s: string) =>
    ['requested', 'assigned', 'accepted', 'arriving', 'ongoing'].includes(s)

  useEffect(() => {
    if (activeTrip?.status) {
      setStatus(STATUS_CONFIG[activeTrip.status]?.label ?? activeTrip.status)
    } else if (!activeTripId) {
      setStatus('Pronto')
    }
  }, [activeTrip?.status, activeTripId, setStatus])

  useEffect(() => {
    if (activeTrip?.status === 'completed' || activeTrip?.status === 'cancelled') {
      addLog(`Viagem ${activeTrip.status}`, 'success')
      setPassengerActiveTripId(null)
    }
  }, [activeTrip?.status, addLog])

  const statusConfig = activeTrip?.status
    ? STATUS_CONFIG[activeTrip.status] ?? { label: activeTrip.status, variant: 'idle' as const }
    : activeTripId && !isOnline
      ? { label: 'Sem conectividade', variant: 'idle' as const }
      : activeTripId
        ? { label: 'A verificar...', variant: 'idle' as const }
        : { label: 'Sem viagem ativa', variant: 'idle' as const }

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

  // Poll driver location for the active trip so passenger can see live movement.
  useEffect(() => {
    if (!activeTripId) {
      setDriverLocation(null)
      return
    }

    let cancelled = false
    const interval = setInterval(() => {
      if (cancelled) return
      void getDriverLocation(activeTripId)
        .then((loc) => {
          setDriverLocation({ lat: loc.lat, lng: loc.lng })
        })
        .catch((err) => {
          console.warn('Failed to fetch driver location', err)
        })
    }, 2000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [activeTripId])

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
        <h1 className="text-2xl font-bold text-slate-900">Passageiro</h1>
        <p className="text-slate-600 mt-1">Pedir e acompanhar viagens</p>
      </header>

      <DevTools lastCreatedTripId={activeTripId} onAssigned={refetchHistory} />

      <div className="space-y-6 mt-6 transition-opacity duration-150">
        <StatusHeader label={statusConfig.label} variant={statusConfig.variant} />

        {/* Map section – centered around passenger location when available */}
        <MapView
          passengerLocation={
            passengerLocation ?? (activeTrip
              ? {
                  lat: activeTrip.origin_lat,
                  lng: activeTrip.origin_lng,
                }
              : DEMO_ORIGIN)
          }
          driverLocation={driverLocation ?? undefined}
          route={
            activeTrip
              ? {
                  from: {
                    lat: activeTrip.origin_lat,
                    lng: activeTrip.origin_lng,
                  },
                  to: {
                    lat: activeTrip.destination_lat,
                    lng: activeTrip.destination_lng,
                  },
                }
              : {
                  from: DEMO_ORIGIN,
                  to: DEMO_DEST,
                }
          }
        />

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-800 text-base">
            {error}
          </div>
        )}

        {!activeTripId && (
          <div className="space-y-4">
            <p className="text-base text-slate-700">
              Estimativa: <strong>{ESTIMATE_MOCK} €</strong>
            </p>
          </div>
        )}

        {activeTrip && isActiveStatus(activeTrip.status) && (
          <div className="space-y-4">
            {activeTrip.status === 'requested' && (
              <div className="flex flex-col items-center justify-center py-6 space-y-3">
                <Spinner size="lg" />
                <p className="text-slate-500 text-base">
                  Estamos a encontrar o motorista mais próximo.
                </p>
              </div>
            )}
            {(activeTrip.status === 'assigned' ||
              activeTrip.status === 'accepted' ||
              activeTrip.status === 'arriving' ||
              activeTrip.status === 'ongoing') && (
              <TripCard
                pickup={formatPickup(activeTrip.origin_lat, activeTrip.origin_lng)}
                destination={formatDestination(
                  activeTrip.destination_lat,
                  activeTrip.destination_lng
                )}
                price={activeTrip.final_price ?? activeTrip.estimated_price ?? 0}
                estimateFallback={ESTIMATE_MOCK}
                driverName="O seu motorista está a caminho"
              />
            )}
          </div>
        )}

        {activeTrip?.status === 'completed' && (
          <div className="space-y-4">
            <TripCard
              pickup={formatPickup(activeTrip.origin_lat, activeTrip.origin_lng)}
              destination={formatDestination(
                activeTrip.destination_lat,
                activeTrip.destination_lng
              )}
              price={activeTrip.final_price ?? activeTrip.estimated_price ?? 0}
            />
          </div>
        )}

        {history && history.length > 0 && (
          <section className="pt-6 mt-6 border-t border-slate-200">
            <h2 className="text-base font-medium text-slate-500 mb-3">Histórico</h2>
            <ul className="space-y-2">
              {history.slice(0, 5).map((t: TripHistoryItem) => (
                <li
                  key={t.trip_id}
                  className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 transition-opacity duration-150"
                >
                  <span className="text-base text-slate-500">
                    {formatPickup(t.origin_lat, t.origin_lng)} →{' '}
                    {formatDestination(t.destination_lat, t.destination_lng)}
                  </span>
                  <span className="font-medium text-slate-600">
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
