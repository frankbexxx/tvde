import type { PassengerMenuScreen } from './PassengerSideMenu'
import type { PassengerShellTab } from './PassengerBottomNav'
import i18n from '../../i18n'

export function passengerBottomNavTransition(
  tab: PassengerShellTab,
  menuOpen: boolean,
): {
  menuOpen: boolean
  screen: PassengerMenuScreen | null
  highlight: string | null
  scrollHome: boolean
} {
  if (tab === 'home') {
    return { menuOpen: false, screen: 'root', highlight: null, scrollHome: true }
  }
  if (tab === 'menu') {
    if (menuOpen) return { menuOpen: false, screen: null, highlight: null, scrollHome: false }
    return { menuOpen: true, screen: 'root', highlight: null, scrollHome: false }
  }
  const screen: PassengerMenuScreen = tab === 'history' ? 'history' : 'account'
  return {
    menuOpen: true,
    screen,
    highlight: passengerRootHighlightKey(screen),
    scrollHome: false,
  }
}

export function passengerRootHighlightKey(screen: PassengerMenuScreen): string | null {
  if (screen === 'root') return null
  if (screen === 'history' || screen === 'history_detail' || screen === 'share_app') return 'trips'
  if (screen === 'account' || screen === 'payments') return 'account'
  if (screen === 'settings') return 'settings'
  return null
}

export function passengerMenuTitle(screen: PassengerMenuScreen): string {
  const key = `passenger:menuTitle.${screen}`
  if (i18n.exists(key)) return i18n.t(key)
  return i18n.t('common:menu')
}
