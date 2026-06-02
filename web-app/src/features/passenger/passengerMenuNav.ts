import type { PassengerMenuScreen } from './PassengerSideMenu'
import i18n from '../../i18n'

export function passengerRootHighlightKey(screen: PassengerMenuScreen): string | null {
  if (screen === 'root') return null
  if (screen === 'history' || screen === 'history_detail' || screen === 'share_app') return 'trips'
  if (screen === 'account') return 'account'
  if (screen === 'settings') return 'settings'
  return null
}

export function passengerMenuTitle(screen: PassengerMenuScreen): string {
  const key = `passenger:menuTitle.${screen}`
  if (i18n.exists(key)) return i18n.t(key)
  return i18n.t('common:menu')
}
