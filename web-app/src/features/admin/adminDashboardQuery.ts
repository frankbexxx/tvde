export const ADMIN_DASHBOARD_TAB_IDS = [
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

function isAdminTab(s: string): s is AdminDashboardTab {
  return (ADMIN_DASHBOARD_TAB_IDS as readonly string[]).includes(s)
}

/** W2-B: `?tab=health` | `?tab=trips&tripId=` (aceita também `trip_id`). Com `tripId`, a tab efectiva é sempre viagens. */
export function parseAdminDashboardQuery(sp: URLSearchParams): {
  tab: AdminDashboardTab
  tripId: string | null
} {
  const tripRaw = sp.get('tripId') ?? sp.get('trip_id')
  const tripId = tripRaw?.trim() ? tripRaw.trim() : null
  if (tripId) return { tab: 'trips', tripId }
  const rawTab = sp.get('tab')?.trim() ?? ''
  if (rawTab && isAdminTab(rawTab)) return { tab: rawTab, tripId: null }
  return { tab: 'pending', tripId: null }
}
