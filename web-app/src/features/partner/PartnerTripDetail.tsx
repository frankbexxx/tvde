import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  fetchPartnerDriver,
  fetchPartnerDrivers,
  fetchPartnerTrip,
  postPartnerTripReassign,
  type PartnerDriverRow,
  type PartnerTripRow,
} from '../../api/partner'

export function PartnerTripDetail() {
  const { tripId } = useParams<{ tripId: string }>()
  const [trip, setTrip] = useState<PartnerTripRow | null>(null)
  const [drivers, setDrivers] = useState<PartnerDriverRow[]>([])
  const [currentDriver, setCurrentDriver] = useState<PartnerDriverRow | null>(null)
  const [pick, setPick] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!tripId) return
    setLoading(true)
    setError(null)
    try {
      const [t, dr] = await Promise.all([fetchPartnerTrip(tripId), fetchPartnerDrivers()])
      setTrip(t)
      setDrivers(dr)
      setPick('')
      if (t.driver_id) {
        try {
          const cd = await fetchPartnerDriver(t.driver_id)
          setCurrentDriver(cd)
        } catch {
          setCurrentDriver(null)
        }
      } else {
        setCurrentDriver(null)
      }
    } catch (e: unknown) {
      const err = e as { detail?: string }
      setError(typeof err?.detail === 'string' ? err.detail : 'Erro ao carregar viagem.')
      setTrip(null)
    } finally {
      setLoading(false)
    }
  }, [tripId])

  useEffect(() => {
    void load()
  }, [load])

  const reassign = async () => {
    if (!tripId || !pick) return
    setBusy(true)
    setError(null)
    try {
      const t = await postPartnerTripReassign(tripId, pick)
      setTrip(t)
      setPick('')
      if (t.driver_id) {
        const cd = await fetchPartnerDriver(t.driver_id)
        setCurrentDriver(cd)
      }
    } catch (e: unknown) {
      const err = e as { detail?: string }
      setError(typeof err?.detail === 'string' ? err.detail : 'Não foi possível reatribuir.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <p className="p-4 text-sm text-muted-foreground">A carregar…</p>
  }
  if (!trip || !tripId) {
    return (
      <div className="p-4 space-y-2">
        <p className="text-destructive text-sm">{error ?? 'Viagem não encontrada.'}</p>
        <Link to="/partner" className="text-primary text-sm underline">
          Voltar
        </Link>
      </div>
    )
  }

  const canReassign =
    trip.status === 'assigned' &&
    trip.driver_id &&
    drivers.filter((d) => d.status === 'approved' && d.user_id !== trip.driver_id).length > 0

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto w-full">
      <Link to="/partner" className="text-sm text-primary hover:underline">
        ← Frota
      </Link>
      <h2 className="text-base font-semibold text-foreground font-mono break-all">
        {trip.trip_id}
      </h2>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="rounded-xl border border-border bg-card p-3 text-sm space-y-2">
        <p>
          <span className="text-muted-foreground">Estado:</span>{' '}
          <span className="text-foreground font-medium">{trip.status}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Passageiro:</span>{' '}
          <span className="text-foreground font-mono text-xs">{trip.passenger_id}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Motorista:</span>{' '}
          <span className="text-foreground font-mono text-xs">{trip.driver_id ?? '—'}</span>
        </p>
        {currentDriver && (
          <p className="text-foreground">
            {currentDriver.user.name ?? '—'} · {currentDriver.user.phone ?? ''}
          </p>
        )}
        <hr className="border-border" />
        <p>
          <span className="text-muted-foreground">Criada:</span> {trip.created_at}
        </p>
        <p>
          <span className="text-muted-foreground">Início:</span> {trip.started_at ?? '—'}
        </p>
        <p>
          <span className="text-muted-foreground">Concluída:</span> {trip.completed_at ?? '—'}
        </p>
        <p>
          <span className="text-muted-foreground">Atualizada:</span> {trip.updated_at}
        </p>
      </div>

      {canReassign && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Atribuir a outro motorista</p>
          <select
            value={pick}
            onChange={(e) => setPick(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm"
          >
            <option value="">— escolher —</option>
            {drivers
              .filter((x) => x.status === 'approved' && x.user_id !== trip.driver_id)
              .map((x) => (
                <option key={x.user_id} value={x.user_id}>
                  {x.user.name ?? x.user_id} ({x.user.phone ?? ''})
                </option>
              ))}
          </select>
          <button
            type="button"
            disabled={!pick || busy}
            onClick={() => void reassign()}
            className="w-full rounded-xl bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {busy ? 'A aplicar…' : 'Reatribuir'}
          </button>
        </div>
      )}

      {trip.status === 'assigned' && !canReassign && trip.driver_id && (
        <p className="text-xs text-muted-foreground">
          Não há outro motorista aprovado na frota para reatribuir.
        </p>
      )}

      <button
        type="button"
        onClick={() => void load()}
        className="w-full rounded-xl bg-secondary py-2 text-sm font-medium text-secondary-foreground"
      >
        Atualizar
      </button>
    </div>
  )
}
