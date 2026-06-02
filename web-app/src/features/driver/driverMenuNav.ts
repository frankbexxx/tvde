import type { DriverMenuScreen } from './DriverSideMenu'
import i18n from '../../i18n'

export const DRIVER_MENU_BACK: Partial<Record<DriverMenuScreen, DriverMenuScreen>> = {
  profile: 'root',
  inbox: 'root',
  earnings: 'root',
  trips: 'root',
  trips_silenced: 'trips',
  nav: 'root',
  categories: 'root',
  zones: 'root',
  zones_budget: 'zones',
  zones_session: 'zones',
  zones_request: 'zones',
  docs: 'root',
  pricing: 'root',
  settings: 'root',
}

export function driverRootHighlightKey(screen: DriverMenuScreen): string | null {
  if (screen === 'root') return null
  if (screen === 'earnings') return 'earnings'
  if (screen === 'inbox') return 'inbox'
  if (screen === 'trips' || screen === 'trips_silenced') return 'trips'
  if (screen === 'profile') return 'profile'
  if (screen === 'docs') return 'docs'
  if (screen === 'zones' || screen === 'zones_budget' || screen === 'zones_session' || screen === 'zones_request') {
    return 'zones'
  }
  if (screen === 'nav') return 'nav'
  if (screen === 'categories') return 'categories'
  if (screen === 'pricing') return 'pricing'
  if (screen === 'settings') return 'settings'
  return null
}

export function driverMenuTitle(screen: DriverMenuScreen): string {
  const key = `driver:menuTitle.${screen}`
  if (i18n.exists(key)) return i18n.t(key)
  return i18n.t('driver:menuTitle.default')
}
