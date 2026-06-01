import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
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
import { usePartnerShell } from './partnerShellContext'
import {
  matchesDriverFilter,
  matchesTripFilter,
  ONGOING_TRIP_STATUSES,
  parseIsoMs,
  type DriverFilter,
  type TripFilter,
} from './partnerTypes'
import { PartnerFleetHubScreen } from './screens/PartnerFleetHubScreen'
import { PartnerFleetListScreen } from './screens/PartnerFleetListScreen'
import { PartnerFleetMapScreen } from './screens/PartnerFleetMapScreen'
import { PartnerFleetAddScreen } from './screens/PartnerFleetAddScreen'
import { PartnerTripsHubScreen } from './screens/PartnerTripsHubScreen'
import { PartnerTripsSummaryScreen } from './screens/PartnerTripsSummaryScreen'
import { PartnerTripsListScreen } from './screens/PartnerTripsListScreen'
import { PartnerTripsExportScreen } from './screens/PartnerTripsExportScreen'
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

type PartnerWorkspaceContextValue = {
  metrics: PartnerMetrics | null
  drivers: PartnerDriverRow[]
  trips: PartnerTripRow[]
  loading: boolean
  error: string | null
  load: () => Promise<void>
  operationalAlertsSource: { drivers: PartnerDriverRow[]; trips: PartnerTripRow[] }
}

const PartnerWorkspaceContext = createContext<PartnerWorkspaceContextValue | null>(null)

// eslint-disable-next-line react-refresh/only-export-components -- hook paired with provider
export function usePartnerWorkspace() {
  const ctx = useContext(PartnerWorkspaceContext)
  if (!ctx) throw new Error('usePartnerWorkspace must be used within PartnerWorkspaceProvider')
  return ctx
}

/** Menu + dados partilhados — montado no Layout para NAV-P-04 (deep routes). */
export function PartnerWorkspaceProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth()
  const {
    menuOpen,
    setMenuOpen,
    menuScreen,
    navigateMenu,
    goBackMenu,
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

  usePolling(load, [load], (menuOpen && menuScreen === 'fleet_map') || !menuOpen, 12_000)

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

  const downloadCsv = async (scope: 'all' | 'filtered' = 'filtered') => {
    if (!token) return
    try {
      const url =
        scope === 'filtered'
          ? partnerTripsExportUrl({
            tripFilter,
            driverId: tripDriverFilter || undefined,
            dateFrom: tripDateFrom || undefined,
            dateTo: tripDateTo || undefined,
            search: search.trim() || undefined,
          })
          : partnerTripsExportUrl()
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        setError('Exportação CSV falhou.')
        return
      }
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = 'partner_trips_export.csv'
      a.click()
      URL.revokeObjectURL(objectUrl)
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
        <PartnerFleetHubScreen metrics={metrics} onNavigate={(leaf) => navigateMenu(leaf)} />
      )
    }
    if (screen === 'fleet_list') {
      return (
        <PartnerFleetListScreen
          filteredDrivers={filteredDrivers}
          driverFilter={driverFilter}
          onDriverFilterChange={setDriverFilter}
          loading={loading}
          onRefresh={() => void load()}
          search={search}
          onSearchChange={setSearch}
        />
      )
    }
    if (screen === 'fleet_map') {
      return (
        <PartnerFleetMapScreen drivers={drivers} trips={trips} onRefresh={() => void load()} />
      )
    }
    if (screen === 'fleet_add') {
      return (
        <PartnerFleetAddScreen
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
      return <PartnerTripsHubScreen onNavigate={(leaf) => navigateMenu(leaf)} />
    }
    if (screen === 'trips_summary') {
      return <PartnerTripsSummaryScreen tripStats={tripStats} recentTrips={recentTrips} />
    }
    if (screen === 'trips_list') {
      return (
        <PartnerTripsListScreen
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
          onDownloadCsv={() => void downloadCsv('filtered')}
          search={search}
          onSearchChange={setSearch}
        />
      )
    }
    if (screen === 'trips_export') {
      return (
        <PartnerTripsExportScreen
          onDownloadCsv={() => void downloadCsv('filtered')}
          onDownloadAllCsv={() => void downloadCsv('all')}
          filteredCount={filteredTrips.length}
          totalCount={trips.length}
        />
      )
    }
    if (screen === 'reports') {
      return (
        <PartnerReportsMenuScreen
          metrics={metrics}
          tripStats={tripStats}
          onDownloadCsv={() => void downloadCsv('filtered')}
        />
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

  const workspaceValue = useMemo(
    (): PartnerWorkspaceContextValue => ({
      metrics,
      drivers,
      trips,
      loading,
      error,
      load,
      operationalAlertsSource: { drivers, trips },
    }),
    [metrics, drivers, trips, loading, error, load]
  )

  return (
    <PartnerWorkspaceContext.Provider value={workspaceValue}>
      {children}
      <PartnerSideMenu
        open={menuOpen}
        onOpenChange={(open) => {
          if (open) setMenuOpen(true)
          else closeMenu()
        }}
        screen={menuScreen}
        onNavigate={navigateMenu}
        onBack={goBackMenu}
        renderScreen={renderMenuScreen}
      />
      {error && menuOpen ? (
        <p className="sr-only" role="status">
          {error}
        </p>
      ) : null}
      {discoverOk && menuOpen && menuScreen === 'fleet_add' ? (
        <p className="sr-only" role="status">
          {discoverOk}
        </p>
      ) : null}
    </PartnerWorkspaceContext.Provider>
  )
}
