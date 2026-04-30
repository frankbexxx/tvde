export const ADMIN_DASHBOARD_TAB_IDS = [
  'agora',
  'docs',
  'pending',
  'users',
  'frota',
  'dados',
  'trips',
  'metrics',
  'ops',
  'health',
] as const

export type AdminDashboardTab = (typeof ADMIN_DASHBOARD_TAB_IDS)[number]

export type AdminTripsListMode = 'active' | 'history'

function isAdminTab(s: string): s is AdminDashboardTab {
  return (ADMIN_DASHBOARD_TAB_IDS as readonly string[]).includes(s)
}

/**
 * W2-B: `?tab=health` | `?tab=trips&tripId=` (aceita `trip_id`).
 * Com `tripId`, a tab efectiva é sempre viagens.
 * `?tab=trips&tripsList=history` — lista histórica (concluídas / canceladas / falha).
 */
export function parseAdminDashboardQuery(sp: URLSearchParams): {
  tab: AdminDashboardTab
  tripId: string | null
  tripsList: AdminTripsListMode
} {
  const tripsListRaw = (sp.get('tripsList') ?? sp.get('trips_list') ?? '').trim().toLowerCase()
  const tripsListFromUrl: AdminTripsListMode = tripsListRaw === 'history' ? 'history' : 'active'

  const tripRaw = sp.get('tripId') ?? sp.get('trip_id')
  const tripId = tripRaw?.trim() ? tripRaw.trim() : null
  if (tripId) {
    return { tab: 'trips', tripId, tripsList: tripsListFromUrl }
  }
  const rawTab = sp.get('tab')?.trim() ?? ''
  if (rawTab && isAdminTab(rawTab)) {
    const tab = rawTab as AdminDashboardTab
    const tripsList: AdminTripsListMode = tab === 'trips' ? tripsListFromUrl : 'active'
    return { tab, tripId: null, tripsList }
  }
  /* SP-G: entrada sem tab válido → «Agora» (resumo operacional em segundos). */
  return { tab: 'agora', tripId: null, tripsList: 'active' }
}
