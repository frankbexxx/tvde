import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import {
  fetchPartnerDriver,
  fetchPartnerDrivers,
  fetchPartnerTrip,
  postPartnerTripReassign,
  type PartnerDriverRow,
  type PartnerTripRow,
} from '../../api/partner'
import { VISIBILITY_VISIBLE_EVENT } from '../../constants/events'
import { formatDateTime } from '../../i18n/format'
import { reverseGeocode } from '../../services/geocoding'
import { ONGOING_TRIP_STATUSES } from './partnerTypes'

/** Soft auto-refresh while trip is live (OPS-UX-1B). */
const LIVE_POLL_MS = 12_000

function mapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}

function isLiveTripStatus(status: string): boolean {
  return ONGOING_TRIP_STATUSES.has(status)
}

export function PartnerTripDetail() {
  const { tripId } = useParams<{ tripId: string }>()
  return <PartnerTripDetailContent key={tripId ?? ''} tripId={tripId} />
}

function PartnerTripDetailContent({ tripId }: { tripId: string | undefined }) {
  const { t } = useTranslation('partner')
  const { t: tc } = useTranslation('common')
  const [trip, setTrip] = useState<PartnerTripRow | null>(null)
  const [drivers, setDrivers] = useState<PartnerDriverRow[]>([])
  const [currentDriver, setCurrentDriver] = useState<PartnerDriverRow | null>(null)
  const [pick, setPick] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [originLabel, setOriginLabel] = useState<string | null>(null)
  const [destLabel, setDestLabel] = useState<string | null>(null)
  const requestSequenceRef = useRef(0)
  const busyRef = useRef(false)

  const load = useCallback(
    async (mode: 'full' | 'soft' = 'full') => {
      if (!tripId || (mode === 'soft' && busyRef.current)) return
      const requestSequence = ++requestSequenceRef.current
      const soft = mode === 'soft'
      if (soft) setRefreshing(true)
      else setLoading(true)
      setError(null)
      try {
        const [row, dr] = await Promise.all([fetchPartnerTrip(tripId), fetchPartnerDrivers()])
        if (requestSequence !== requestSequenceRef.current) return
        setTrip(row)
        setDrivers(dr)
        if (!soft) setPick('')
        void reverseGeocode(row.origin_lng, row.origin_lat)
          .then((label) => {
            if (requestSequence === requestSequenceRef.current) setOriginLabel(label)
          })
          .catch(() => {
            if (requestSequence === requestSequenceRef.current) setOriginLabel(null)
          })
        void reverseGeocode(row.destination_lng, row.destination_lat)
          .then((label) => {
            if (requestSequence === requestSequenceRef.current) setDestLabel(label)
          })
          .catch(() => {
            if (requestSequence === requestSequenceRef.current) setDestLabel(null)
          })
        if (row.driver_id) {
          try {
            const cd = await fetchPartnerDriver(row.driver_id)
            if (requestSequence === requestSequenceRef.current) setCurrentDriver(cd)
          } catch {
            if (requestSequence === requestSequenceRef.current) setCurrentDriver(null)
          }
        } else {
          setCurrentDriver(null)
        }
        if (requestSequence === requestSequenceRef.current) setLastFetchedAt(Date.now())
      } catch (e: unknown) {
        if (requestSequence !== requestSequenceRef.current) return
        const err = e as { detail?: string }
        setError(typeof err?.detail === 'string' ? err.detail : t('tripDetail.loadError'))
        if (!soft) setTrip(null)
      } finally {
        if (requestSequence === requestSequenceRef.current) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    },
    [tripId, t]
  )

  useEffect(() => {
    void load('full')
  }, [load])

  const live = trip != null && isLiveTripStatus(trip.status)

  useEffect(() => {
    if (!live || !tripId) return
    const id = window.setInterval(() => {
      void load('soft')
    }, LIVE_POLL_MS)
    return () => window.clearInterval(id)
  }, [live, tripId, load])

  useEffect(() => {
    if (!live) return
    const onVisible = () => {
      void load('soft')
    }
    window.addEventListener(VISIBILITY_VISIBLE_EVENT, onVisible)
    return () => window.removeEventListener(VISIBILITY_VISIBLE_EVENT, onVisible)
  }, [live, load])

  const reassign = async () => {
    if (!tripId || !pick || trip?.trip_id !== tripId) return
    busyRef.current = true
    const requestSequence = ++requestSequenceRef.current
    setBusy(true)
    setRefreshing(false)
    setError(null)
    try {
      const nextTrip = await postPartnerTripReassign(tripId, pick)
      if (requestSequence !== requestSequenceRef.current) return
      setTrip(nextTrip)
      setPick('')
      setLastFetchedAt(Date.now())
      if (nextTrip.driver_id) {
        const cd = await fetchPartnerDriver(nextTrip.driver_id)
        if (requestSequence === requestSequenceRef.current) setCurrentDriver(cd)
      }
    } catch (e: unknown) {
      if (requestSequence !== requestSequenceRef.current) return
      const err = e as { detail?: string }
      setError(typeof err?.detail === 'string' ? err.detail : t('tripDetail.reassignError'))
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  if (loading && !trip) {
    return <p className="p-4 text-sm text-muted-foreground">{tc('loading')}</p>
  }
  if (!trip || !tripId) {
    return (
      <div className="p-4 space-y-2">
        <p className="text-destructive text-sm">{error ?? t('tripDetail.notFound')}</p>
        <Link to="/partner" className="text-primary text-sm underline">
          {tc('back')}
        </Link>
      </div>
    )
  }

  const approvedOthers = drivers.filter(
    (d) => d.status === 'approved' && d.user_id !== trip.driver_id
  )
  const canReassign = trip.status === 'assigned' && trip.driver_id && approvedOthers.length > 0
  const price =
    trip.final_price != null && trip.final_price > 0
      ? t('tripDetail.priceFinal', { value: trip.final_price.toFixed(2) })
      : t('tripDetail.priceEstimate', { value: trip.estimated_price.toFixed(2) })

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto w-full">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to="/partner" className="text-sm text-primary hover:underline">
          {t('tripDetail.backToFleet')}
        </Link>
        <button
          type="button"
          disabled={refreshing || busy}
          onClick={() => void load('soft')}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
          data-testid="partner-trip-detail-refresh"
        >
          {refreshing ? t('tripDetail.refreshing') : t('tripDetail.refresh')}
        </button>
      </div>
      {lastFetchedAt != null ? (
        <p className="text-xs text-muted-foreground" data-testid="partner-trip-detail-last-updated">
          {t('tripDetail.lastUpdated')}: {formatDateTime(new Date(lastFetchedAt))}
        </p>
      ) : null}
      <h2 className="text-base font-semibold text-foreground font-mono break-all">
        {trip.trip_id}
      </h2>
      {error && (
        <p className="text-sm text-destructive" data-testid="partner-trip-detail-error">
          {error}
        </p>
      )}

      <div className="rounded-xl border border-border bg-card p-3 text-sm space-y-2">
        <p>
          <span className="text-muted-foreground">{t('tripDetail.status')}</span>{' '}
          <span className="text-foreground font-medium" data-testid="partner-trip-detail-status">
            {trip.status}
          </span>
        </p>
        <p>
          <span className="text-muted-foreground">{t('tripDetail.price')}</span>{' '}
          <span className="text-foreground font-medium">{price}</span>
        </p>
        <p>
          <span className="text-muted-foreground">{t('tripDetail.passenger')}</span>{' '}
          <span className="text-foreground font-mono text-xs">{trip.passenger_id}</span>
        </p>
        <p>
          <span className="text-muted-foreground">{t('tripDetail.driver')}</span>{' '}
          <span className="text-foreground font-mono text-xs">{trip.driver_id ?? '—'}</span>
        </p>
        {currentDriver && (
          <p className="text-foreground">
            {currentDriver.user.name ?? '—'} · {currentDriver.user.phone ?? ''}
          </p>
        )}
        <hr className="border-border" />
        <div className="space-y-1">
          <p className="text-muted-foreground">{t('tripDetail.pickup')}</p>
          <p className="text-foreground text-xs font-mono">
            {trip.origin_lat.toFixed(5)}, {trip.origin_lng.toFixed(5)}
          </p>
          {originLabel ? <p className="text-foreground/90">{originLabel}</p> : null}
          <a
            href={mapsUrl(trip.origin_lat, trip.origin_lng)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary underline"
          >
            {t('tripDetail.openMap')}
          </a>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground">{t('tripDetail.destination')}</p>
          <p className="text-foreground text-xs font-mono">
            {trip.destination_lat.toFixed(5)}, {trip.destination_lng.toFixed(5)}
          </p>
          {destLabel ? <p className="text-foreground/90">{destLabel}</p> : null}
          <a
            href={mapsUrl(trip.destination_lat, trip.destination_lng)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary underline"
          >
            {t('tripDetail.openMap')}
          </a>
        </div>
        {trip.cancel_reason ? (
          <p>
            <span className="text-muted-foreground">{t('tripDetail.cancelReason')}</span>{' '}
            <span className="text-foreground">{trip.cancel_reason}</span>
          </p>
        ) : null}
        <hr className="border-border" />
        <p>
          <span className="text-muted-foreground">{t('tripDetail.created')}</span> {trip.created_at}
        </p>
        <p>
          <span className="text-muted-foreground">{t('tripDetail.started')}</span>{' '}
          {trip.started_at ?? '—'}
        </p>
        <p>
          <span className="text-muted-foreground">{t('tripDetail.completed')}</span>{' '}
          {trip.completed_at ?? '—'}
        </p>
        <p>
          <span className="text-muted-foreground">{t('tripDetail.updated')}</span> {trip.updated_at}
        </p>
      </div>

      {trip.status === 'assigned' && trip.driver_id ? (
        canReassign ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">{t('tripDetail.reassignTitle')}</p>
            <select
              value={pick}
              onChange={(e) => setPick(e.target.value)}
              disabled={busy}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm"
            >
              <option value="">{t('tripDetail.chooseDriver')}</option>
              {approvedOthers.map((x) => (
                <option key={x.user_id} value={x.user_id}>
                  {x.user.name ?? x.user_id} ({x.user.phone ?? ''})
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy || !pick}
              onClick={() => void reassign()}
              className="w-full rounded-xl bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {busy ? '…' : t('tripDetail.reassignBtn')}
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t('tripDetail.reassignHintAssigned')}</p>
        )
      ) : trip.driver_id ? (
        <p className="text-xs text-muted-foreground">
          {t('tripDetail.reassignUnavailable', { status: trip.status })}
        </p>
      ) : null}
    </div>
  )
}
