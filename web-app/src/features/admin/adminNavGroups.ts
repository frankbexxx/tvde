import type { AdminDashboardTab } from './adminDashboardQuery'

/** Visual nav group IDs (chrome only — not URL params). */
export type AdminNavGroupId = 'agora' | 'trips' | 'people' | 'fleet' | 'system'

export type AdminNavGroup = {
  id: AdminNavGroupId
  tabs: readonly AdminDashboardTab[]
  defaultTab: AdminDashboardTab
}

/**
 * NAV-3C: five Admin areas. Tab IDs and `?tab=` contract are unchanged;
 * this map is presentation-only.
 */
export const ADMIN_NAV_GROUPS: readonly AdminNavGroup[] = [
  { id: 'agora', tabs: ['agora'], defaultTab: 'agora' },
  { id: 'trips', tabs: ['trips'], defaultTab: 'trips' },
  { id: 'people', tabs: ['pending', 'users', 'docs'], defaultTab: 'pending' },
  { id: 'fleet', tabs: ['frota'], defaultTab: 'frota' },
  { id: 'system', tabs: ['health', 'ops', 'metrics', 'dados'], defaultTab: 'health' },
] as const

const TAB_TO_GROUP: Record<AdminDashboardTab, AdminNavGroupId> = {
  agora: 'agora',
  trips: 'trips',
  pending: 'people',
  users: 'people',
  docs: 'people',
  frota: 'fleet',
  health: 'system',
  ops: 'system',
  metrics: 'system',
  dados: 'system',
}

/** Resolve the visual group for a tab id. Unknown → `agora`. */
export function groupForTab(tab: string): AdminNavGroupId {
  if (tab in TAB_TO_GROUP) {
    return TAB_TO_GROUP[tab as AdminDashboardTab]
  }
  return 'agora'
}

export function defaultTabForGroup(groupId: AdminNavGroupId): AdminDashboardTab {
  const group = ADMIN_NAV_GROUPS.find((g) => g.id === groupId)
  return group?.defaultTab ?? 'agora'
}

export function tabsForGroup(groupId: AdminNavGroupId): readonly AdminDashboardTab[] {
  const group = ADMIN_NAV_GROUPS.find((g) => g.id === groupId)
  return group?.tabs ?? ['agora']
}
