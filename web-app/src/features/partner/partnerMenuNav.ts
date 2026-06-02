import type { PartnerMenuScreen } from './PartnerSideMenu'
import i18n from '../../i18n'

/** Deep routes com ecrã full no Outlet (detalhe motorista/viagem). */
export function isPartnerDeepRoute(pathname: string): boolean {
  return /^\/partner\/drivers\/[^/]+/.test(pathname) || /^\/partner\/trips\/[^/]+/.test(pathname)
}

/** Voltar por defeito (folha → hub → raiz). */
export const PARTNER_MENU_DEFAULT_BACK: Partial<Record<PartnerMenuScreen, PartnerMenuScreen>> = {
  fleet: 'root',
  fleet_list: 'fleet',
  fleet_map: 'fleet',
  fleet_add: 'fleet',
  trips: 'root',
  trips_summary: 'trips',
  trips_list: 'trips',
  trips_export: 'trips',
  reports: 'root',
  settings: 'root',
  profile: 'root',
  inbox: 'root',
}

export function isPartnerFleetNavScreen(screen: PartnerMenuScreen): boolean {
  return (
    screen === 'fleet' ||
    screen === 'fleet_list' ||
    screen === 'fleet_map' ||
    screen === 'fleet_add'
  )
}

export function partnerRootHighlightKey(screen: PartnerMenuScreen): string | null {
  if (screen === 'root') return null
  if (isPartnerFleetNavScreen(screen)) return 'fleet'
  if (screen === 'trips' || screen.startsWith('trips_')) return 'trips'
  if (screen === 'inbox') return 'inbox'
  if (screen === 'reports') return 'reports'
  if (screen === 'profile') return 'profile'
  if (screen === 'settings') return 'settings'
  return null
}

export function partnerMenuTitle(screen: PartnerMenuScreen): string {
  const key = `partner:menuTitle.${screen}`
  if (i18n.exists(key)) return i18n.t(key)
  return i18n.t('partner:menuTitle.default')
}
