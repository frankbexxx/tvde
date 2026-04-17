import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  PARTNER_TRIPS_CSV_COLUMNS,
  addDriverToFleet,
  discoverPartnerDrivers,
  fetchPartnerDrivers,
  fetchPartnerMetrics,
  fetchPartnerTrips,
  partnerTripsExportUrl,
  type PartnerDriverDiscoveryItem,
  type PartnerDriverRow,
  type PartnerMetrics,
  type PartnerTripRow,
} from '../../api/partner'

function locationLabel(d: PartnerDriverRow): string {
  const loc = d.last_location
  if (!loc) return 'Sem localização recente'
  return `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`
}

type DriverFilter = 'all' | 'active' | 'online' | 'offline'
type TripFilter = 'all' | 'ongoing' | 'completed' | 'cancelled' | 'failed' | 'assigned'

const ONGOING = new Set(['assigned', 'accepted', 'arriving', 'ongoing'])
const PIPELINE = new Set(['assigned', 'accepted', 'arriving', 'ongoing'])

/** Minutos sem `updated_at` numa viagem ainda activa → aviso de possível bloqueio. */
const STUCK_MINUTES = 25
const LONG_ONGOING_HOURS = 4

function parseIsoMs(s: string | null | undefined): number | null {
  if (!s) return null
  const t = Date.parse(s)
  return Number.isFinite(t) ? t : null
}

function matchesDriverFilter(d: PartnerDriverRow, f: DriverFilter): boolean {
  if (f === 'all') return true
  const approved = d.status === 'approved'
  if (f === 'active') return approved
  if (f === 'online') return approved && d.is_available
  if (f === 'offline') return approved && !d.is_available
  return true
}

function matchesTripFilter(t: PartnerTripRow, f: TripFilter): boolean {
  if (f === 'all') return true
  if (f === 'ongoing') return ONGOING.has(t.status)
  if (f === 'completed') return t.status === 'completed'
  if (f === 'cancelled') return t.status === 'cancelled'
  if (f === 'failed') return t.status === 'failed'
  if (f === 'assigned') return t.status === 'assigned'
  return true
}

function normalizeSearch(q: string): string {
  return q.trim().toLowerCase()
}

export function PartnerHome() {
  const { token } = useAuth()
  const [metrics, setMetrics] = useState<PartnerMetrics | null>(null)
  const [drivers, setDrivers] = useState<PartnerDriverRow[]>([])
  const [trips, setTrips] = useState<PartnerTripRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [driverFilter, setDriverFilter] = useState<DriverFilter>('all')
  const [tripFilter, setTripFilter] = useState<TripFilter>('all')
  const [search, setSearch] = useState('')
  const [discoverQuery, setDiscoverQuery] = useState('')
  const [discoverRows, setDiscoverRows] = useState<PartnerDriverDiscoveryItem[]>([])
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const [discoverOk, setDiscoverOk] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [m, dr, tr] = await Promise.all([
        fetchPartnerMetrics(),
        fetchPartnerDrivers(),
        fetchPartnerTrips(),
      ])
      setMetrics(m)
      setDrivers(dr)
      setTrips(tr)
    } catch (e: unknown) {
      const err = e as { detail?: string }
      setError(typeof err?.detail === 'string' ? err.detail : 'Erro ao carregar dados da frota.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const runDiscovery = async () => {
    const q = discoverQuery.trim()
    if (q.length < 2) return
    setDiscoverLoading(true)
    setDiscoverOk(null)
    setError(null)
    try {
      const rows = await discoverPartnerDrivers(q)
      setDiscoverRows(rows)
    } catch (e: unknown) {
      const err = e as { detail?: string }
      setError(typeof err?.detail === 'string' ? err.detail : 'Não foi possível pesquisar motoristas.')
    } finally {
      setDiscoverLoading(false)
    }
  }

  const addToFleet = async (driverUserId: string) => {
    setDiscoverOk(null)
    setError(null)
    try {
      await addDriverToFleet(driverUserId)
      setDiscoverOk('Motorista adicionado à frota.')
      await load()
      void runDiscovery()
    } catch (e: unknown) {
      const err = e as { detail?: string }
      setError(typeof err?.detail === 'string' ? err.detail : 'Não foi possível adicionar o motorista.')
    }
  }

  const q = normalizeSearch(search)
  const filteredDrivers = useMemo(() => {
    let list = drivers.filter((d) => matchesDriverFilter(d, driverFilter))
    if (q) {
      list = list.filter((d) => {
        const name = (d.user.name ?? '').toLowerCase()
        const phone = (d.user.phone ?? '').toLowerCase()
        return name.includes(q) || phone.includes(q)
      })
    }
    return list
  }, [drivers, driverFilter, q])

  const filteredTrips = useMemo(() => {
    let list = trips.filter((t) => matchesTripFilter(t, tripFilter))
    if (q) {
      list = list.filter((t) => t.trip_id.toLowerCase().includes(q))
    }
    list = [...list].sort((a, b) => {
      const ua = parseIsoMs(a.updated_at) ?? 0
      const ub = parseIsoMs(b.updated_at) ?? 0
      return ub - ua
    })
    return list
  }, [trips, tripFilter, q])

  const attentionList = useMemo(() => {
    const now = Date.now()
    const stuckMs = STUCK_MINUTES * 60_000
    const longOngoingMs = LONG_ONGOING_HOURS * 60 * 60_000
    const driverById = new Map(drivers.map((d) => [d.user_id, d]))
    const reasonsByTrip = new Map<string, string[]>()

    const pushReason = (tripId: string, msg: string) => {
      const arr = reasonsByTrip.get(tripId) ?? []
      if (!arr.includes(msg)) arr.push(msg)
      reasonsByTrip.set(tripId, arr)
    }

    for (const t of trips) {
      const updMs = parseIsoMs(t.updated_at)
      const ageMs = updMs != null ? now - updMs : null

      if (PIPELINE.has(t.status) && ageMs != null && ageMs > stuckMs) {
        const mins = Math.round(ageMs / 60_000)
        pushReason(
          t.trip_id,
          `Sem alteração de estado há ~${mins} min — pode estar bloqueada ou o motorista não está a responder.`,
        )
      }

      const startedMs = parseIsoMs(t.started_at)
      if (t.status === 'ongoing' && startedMs != null && now - startedMs > longOngoingMs) {
        const hours = Math.round(((now - startedMs) / 3_600_000) * 10) / 10
        pushReason(
          t.trip_id,
          `Em curso há cerca de ${hours} h — confirme GPS e se a viagem decorre normalmente; escale à operação se persistir.`,
        )
      }

      if (t.status === 'assigned' && t.driver_id) {
        const dr = driverById.get(t.driver_id)
        if (dr && !dr.is_available && ageMs != null && ageMs > stuckMs) {
          pushReason(
            t.trip_id,
            'Viagem atribuída mas o motorista aparece indisponível — confirme se vai aceitar ou reatribua.',
          )
        }
      }
    }

    return Array.from(reasonsByTrip.entries())
      .map(([tripId, reasons]) => {
        const trip = trips.find((x) => x.trip_id === tripId)
        return trip ? { tripId, reasons, trip } : null
      })
      .filter((x): x is { tripId: string; reasons: string[]; trip: PartnerTripRow } => x != null)
      .sort((a, b) => {
        const ua = parseIsoMs(a.trip.updated_at) ?? 0
        const ub = parseIsoMs(b.trip.updated_at) ?? 0
        return ub - ua
      })
  }, [trips, drivers])

  const downloadCsv = async () => {
    if (!token) return
    try {
      const res = await fetch(partnerTripsExportUrl(), {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        setError('Exportação CSV falhou.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'partner_trips_export.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Exportação CSV falhou.')
    }
  }

  const chip = (active: boolean) =>
    `px-2 py-1 rounded-lg text-xs font-medium border transition-colors ${
      active
        ? 'bg-primary text-primary-foreground border-primary'
        : 'bg-card border-border text-foreground/80 hover:bg-muted/40'
    }`

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto w-full">
      <h2 className="text-lg font-semibold text-foreground">Frota (partner)</h2>

      {loading && <p className="text-sm text-muted-foreground">A carregar…</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {discoverOk && <p className="text-sm text-foreground bg-success/15 border border-success/30 px-3 py-2 rounded-lg">{discoverOk}</p>}

      <label className="block text-sm text-foreground/80" htmlFor="partner-search">
        Pesquisar (nome, telefone ou ID de viagem)
      </label>
      <input
        id="partner-search"
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Filtrar listas…"
        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm"
      />

      {metrics && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Viagens hoje</p>
            <p className="text-xl font-bold text-foreground">{metrics.trips_today}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Total viagens</p>
            <p className="text-xl font-bold text-foreground">{metrics.trips_total}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Concluídas</p>
            <p className="text-xl font-bold text-foreground">{metrics.trips_completed}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Canceladas</p>
            <p className="text-xl font-bold text-foreground">{metrics.trips_cancelled}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Motoristas ativos (GPS)</p>
            <p className="text-xl font-bold text-foreground">{metrics.active_drivers}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Total motoristas</p>
            <p className="text-xl font-bold text-foreground">{metrics.total_drivers}</p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-4 space-y-3">
        <h3 className="text-base font-medium text-foreground">Precisa de atenção</h3>
        <p className="text-xs text-foreground/75">
          Heurísticas em linguagem de negócio (não substituem o mapa nem o suporte). Se o problema continuar após contactar o
          motorista, escale à operação com o ID da viagem.
        </p>
        {attentionList.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada destacado neste momento.</p>
        ) : (
          <ul className="space-y-3">
            {attentionList.map(({ tripId, reasons, trip }) => (
              <li key={tripId} className="rounded-xl border border-border bg-background/40 p-3 text-sm">
                <Link
                  to={`/partner/trips/${encodeURIComponent(tripId)}`}
                  className="font-medium text-primary hover:underline"
                >
                  {tripId.slice(0, 8)}… · {trip.status}
                </Link>
                <ul className="mt-2 list-disc pl-4 space-y-1 text-foreground/85">
                  {reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl px-4 py-4 shadow-card space-y-3">
        <h3 className="font-medium text-foreground">Adicionar motorista à frota</h3>
        <p className="text-sm text-foreground/75">
          Pesquisa por nome ou telefone e adiciona com um clique (sem UUIDs manuais).
        </p>
        <div className="flex gap-2">
          <input
            type="search"
            value={discoverQuery}
            onChange={(e) => setDiscoverQuery(e.target.value)}
            placeholder="Nome ou telefone…"
            className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm"
          />
          <button
            type="button"
            onClick={() => void runDiscovery()}
            disabled={discoverLoading || discoverQuery.trim().length < 2}
            className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            {discoverLoading ? '…' : 'Procurar'}
          </button>
        </div>
        {discoverRows.length > 0 ? (
          <ul className="space-y-2">
            {discoverRows.map((r) => (
              <li
                key={r.user_id}
                className="rounded-xl border border-border bg-background/30 p-3 text-sm flex items-start justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{r.name ?? '—'}</p>
                  <p className="text-muted-foreground">{r.phone ?? '—'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void addToFleet(r.user_id)}
                  className="px-3 py-1.5 rounded-lg bg-card border border-border text-foreground/90 text-xs font-medium hover:bg-muted/40"
                >
                  Adicionar à frota
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Sem resultados.</p>
        )}
      </div>

      <div>
        <h3 className="text-base font-medium text-foreground mb-2">Motoristas</h3>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(
            [
              ['all', 'Todos'],
              ['active', 'ativos'],
              ['online', 'online'],
              ['offline', 'offline'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={chip(driverFilter === id)}
              onClick={() => setDriverFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <ul className="space-y-2">
          {filteredDrivers.map((d) => (
            <li key={d.user_id} className="rounded-xl border border-border bg-card p-3 text-sm">
              <Link
                to={`/partner/drivers/${encodeURIComponent(d.user_id)}`}
                className="font-medium text-primary hover:underline"
              >
                {d.user.name ?? '—'}
              </Link>
              <p className="text-muted-foreground">
                Estado: {d.status}
                {d.is_available ? ' · disponível' : ' · indisponível'}
              </p>
              <p className="text-muted-foreground text-xs mt-1">{locationLabel(d)}</p>
            </li>
          ))}
        </ul>
        {!loading && filteredDrivers.length === 0 && (
          <p className="text-sm text-muted-foreground">Sem motoristas neste filtro.</p>
        )}
      </div>

      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-base font-medium text-foreground">Viagens</h3>
          <button
            type="button"
            onClick={() => void downloadCsv()}
            className="shrink-0 text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            Exportar CSV
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Colunas do CSV (UTF-8): {PARTNER_TRIPS_CSV_COLUMNS.join(', ')}. Contrato estável: em versões futuras só se acrescentam
          colunas no fim — quem importa por posição deve usar o cabeçalho.
        </p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(
            [
              ['all', 'Todas'],
              ['ongoing', 'Em curso'],
              ['completed', 'Concluídas'],
              ['cancelled', 'Canceladas'],
              ['failed', 'Falhadas'],
              ['assigned', 'Só atribuídas'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={chip(tripFilter === id)}
              onClick={() => setTripFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <ul className="space-y-2">
          {filteredTrips.map((t) => (
            <li key={t.trip_id} className="rounded-xl border border-border bg-card p-3 text-sm">
              <Link
                to={`/partner/trips/${encodeURIComponent(t.trip_id)}`}
                className="font-medium text-primary hover:underline"
              >
                {t.trip_id.slice(0, 8)}… · {t.status}
              </Link>
              <p className="text-muted-foreground text-xs mt-1">
                Criada: {t.created_at}
                {t.updated_at ? ` · Atualizada: ${t.updated_at}` : null}
              </p>
            </li>
          ))}
        </ul>
        {!loading && filteredTrips.length === 0 && (
          <p className="text-sm text-muted-foreground">Sem viagens neste filtro.</p>
        )}
      </div>

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
