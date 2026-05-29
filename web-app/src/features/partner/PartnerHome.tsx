import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { usePolling } from '../../hooks/usePolling'
import {
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
import { PartnerSideMenu, type PartnerMenuScreen } from './PartnerSideMenu'
import { PartnerAlertsPanel } from './PartnerAlertsPanel'
import { buildPartnerAlerts } from './partnerAlerts'
import { usePartnerShell } from './partnerShellContext'
import {
  matchesDriverFilter,
  matchesTripFilter,
  ONGOING_TRIP_STATUSES,
  parseIsoMs,
  type DriverFilter,
  type PartnerHomeView,
  type TripFilter,
} from './partnerTypes'
import { PartnerHomeDashboard } from './screens/PartnerHomeDashboard'
import { PartnerFleetScreen } from './screens/PartnerFleetScreen'
import { PartnerTripsMenuScreen } from './screens/PartnerTripsMenuScreen'
import { PartnerReportsMenuScreen } from './screens/PartnerReportsMenuScreen'
import { PartnerSettingsMenuScreen } from './screens/PartnerSettingsMenuScreen'
import { PartnerProfileScreen } from './screens/PartnerProfileScreen'
import { PartnerInboxScreen } from './screens/PartnerInboxScreen'

function normalizeSearch(q: string): string {
  return q.trim().toLowerCase()
}

function normalizePhone(q: string): string {
  return q.replace(/\D/g, '')
}

export function PartnerHome() {
  const { token } = useAuth()
  const {
    menuOpen,
    setMenuOpen,
    menuScreen,
    setMenuScreen,
    closeMenu,
    setInboxUnreadCount,
  } = usePartnerShell()
  const [metrics, setMetrics] = useState<PartnerMetrics | null>(null)
  const [drivers, setDrivers] = useState<PartnerDriverRow[]>([])
  const [trips, setTrips] = useState<PartnerTripRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [driverFilter, setDriverFilter] = useState<DriverFilter>('all')
  const [tripFilter, setTripFilter] = useState<TripFilter>('all')
  const [tripDriverFilter, setTripDriverFilter] = useState('')
  const [tripDateFrom, setTripDateFrom] = useState('')
  const [tripDateTo, setTripDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [discoverQuery, setDiscoverQuery] = useState('')
  const [discoverRows, setDiscoverRows] = useState<PartnerDriverDiscoveryItem[]>([])
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const [discoverOk, setDiscoverOk] = useState<string | null>(null)
  const [discoverSearched, setDiscoverSearched] = useState(false)
  const [fleetView, setFleetView] = useState<PartnerHomeView>('list')

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

  usePolling(
    load,
    [load],
    (menuOpen && menuScreen === 'fleet' && fleetView === 'map') || !menuOpen,
    12_000
  )

  const operationalAlerts = useMemo(
    () => buildPartnerAlerts(drivers, trips),
    [drivers, trips]
  )

  const discoverAlreadyInFleet = useMemo(() => {
    const q = discoverQuery.trim()
    if (q.length < 2) return false
    const nq = normalizePhone(q)
    const ql = q.toLowerCase()
    return drivers.some((d) => {
      const name = (d.user.name ?? '').toLowerCase()
      const phone = normalizePhone(d.user.phone ?? '')
      return name.includes(ql) || (nq.length >= 2 && phone.includes(nq))
    })
  }, [discoverQuery, drivers])

  const runDiscovery = async () => {
    const q = discoverQuery.trim()
    if (q.length < 2) return
    setDiscoverLoading(true)
    setDiscoverOk(null)
    setError(null)
    try {
      const rows = await discoverPartnerDrivers(q)
      setDiscoverRows(rows)
      setDiscoverSearched(true)
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
  const driverById = useMemo(() => new Map(drivers.map((d) => [d.user_id, d])), [drivers])
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
    if (tripDriverFilter) {
      list = list.filter((t) => t.driver_id === tripDriverFilter)
    }
    if (tripDateFrom) {
      const fromMs = Date.parse(`${tripDateFrom}T00:00:00`)
      if (!Number.isNaN(fromMs)) {
        list = list.filter((t) => {
          const created = parseIsoMs(t.created_at)
          return created != null && created >= fromMs
        })
      }
    }
    if (tripDateTo) {
      const toMs = Date.parse(`${tripDateTo}T23:59:59.999`)
      if (!Number.isNaN(toMs)) {
        list = list.filter((t) => {
          const created = parseIsoMs(t.created_at)
          return created != null && created <= toMs
        })
      }
    }
    if (q) {
      list = list.filter((t) => {
        if (t.trip_id.toLowerCase().includes(q)) return true
        if (t.passenger_id?.toLowerCase().includes(q)) return true
        if (t.driver_id) {
          const dr = driverById.get(t.driver_id)
          if (dr) {
            const name = (dr.user.name ?? '').toLowerCase()
            const phone = (dr.user.phone ?? '').toLowerCase()
            if (name.includes(q) || phone.includes(q)) return true
          }
        }
        return false
      })
    }
    list = [...list].sort((a, b) => {
      const ua = parseIsoMs(a.updated_at) ?? 0
      const ub = parseIsoMs(b.updated_at) ?? 0
      return ub - ua
    })
    return list
  }, [trips, tripFilter, tripDriverFilter, tripDateFrom, tripDateTo, q, driverById])

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

  const tripStats = useMemo(() => {
    let ongoing = 0
    let completed = 0
    let cancelled = 0
    let failed = 0
    for (const t of trips) {
      if (ONGOING_TRIP_STATUSES.has(t.status)) ongoing += 1
      else if (t.status === 'completed') completed += 1
      else if (t.status === 'cancelled') cancelled += 1
      else if (t.status === 'failed') failed += 1
    }
    return { total: trips.length, ongoing, completed, cancelled, failed }
  }, [trips])

  const recentTrips = useMemo(() => {
    return [...trips]
      .sort((a, b) => (parseIsoMs(b.updated_at) ?? 0) - (parseIsoMs(a.updated_at) ?? 0))
      .slice(0, 8)
  }, [trips])

  const renderMenuScreen = (screen: PartnerMenuScreen) => {
    if (screen === 'fleet') {
      return (
        <PartnerFleetScreen
          metrics={metrics}
          drivers={drivers}
          trips={trips}
          filteredDrivers={filteredDrivers}
          driverFilter={driverFilter}
          onDriverFilterChange={setDriverFilter}
          fleetView={fleetView}
          onFleetViewChange={setFleetView}
          loading={loading}
          onRefresh={() => void load()}
          discoverQuery={discoverQuery}
          onDiscoverQueryChange={setDiscoverQuery}
          discoverLoading={discoverLoading}
          discoverRows={discoverRows}
          discoverSearched={discoverSearched}
          discoverAlreadyInFleet={discoverAlreadyInFleet}
          onDiscoverSearch={() => void runDiscovery()}
          onAddToFleet={(id) => void addToFleet(id)}
        />
      )
    }
    if (screen === 'trips') {
      return (
        <PartnerTripsMenuScreen
          tripStats={tripStats}
          recentTrips={recentTrips}
          filteredTrips={filteredTrips}
          drivers={drivers}
          tripFilter={tripFilter}
          onTripFilterChange={setTripFilter}
          tripDriverFilter={tripDriverFilter}
          onTripDriverFilterChange={setTripDriverFilter}
          tripDateFrom={tripDateFrom}
          onTripDateFromChange={setTripDateFrom}
          tripDateTo={tripDateTo}
          onTripDateToChange={setTripDateTo}
          loading={loading}
          onDownloadCsv={() => void downloadCsv()}
        />
      )
    }
    if (screen === 'reports') {
      return (
        <PartnerReportsMenuScreen metrics={metrics} onDownloadCsv={() => void downloadCsv()} />
      )
    }
    if (screen === 'settings') {
      return <PartnerSettingsMenuScreen onRefresh={() => void load()} />
    }
    if (screen === 'profile') {
      return <PartnerProfileScreen />
    }
    if (screen === 'inbox') {
      return <PartnerInboxScreen onUnreadChange={setInboxUnreadCount} />
    }
    return null
  }

  return (
    <div className="flex min-h-full flex-col max-w-lg mx-auto w-full">
      <div className="flex-1 space-y-6 p-4 pb-4">
        <PartnerSideMenu
          open={menuOpen}
          onOpenChange={(open) => {
            if (open) {
              setMenuOpen(true)
            } else {
              closeMenu()
            }
          }}
          screen={menuScreen}
          onScreenChange={setMenuScreen}
          renderScreen={renderMenuScreen}
        />

        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">Início</h2>
        </div>

        {loading && <p className="text-sm text-muted-foreground">A carregar…</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {discoverOk && menuOpen && menuScreen === 'fleet' && (
          <p className="text-sm text-foreground bg-success/15 border border-success/30 px-3 py-2 rounded-lg">
            {discoverOk}
          </p>
        )}

        <PartnerHomeDashboard
          metrics={metrics}
          search={search}
          onSearchChange={setSearch}
          onRefresh={() => void load()}
        />
      </div>

      <div className="sticky bottom-[52px] z-10 border-t border-amber-500/35 bg-amber-500/10 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <h3 className="text-sm font-medium text-foreground">Alertas operacionais</h3>
        <p className="text-[11px] text-foreground/75 mt-0.5">
          Documentos, GPS, viagens bloqueadas — clique para ir ao detalhe.
        </p>
        <div className="mt-2 max-h-[min(28dvh,200px)] overflow-y-auto">
          <PartnerAlertsPanel alerts={operationalAlerts} />
        </div>
      </div>
    </div>
  )
}
