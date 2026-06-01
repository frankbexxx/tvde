import type { PassengerMenuScreen } from './PassengerSideMenu'

export function passengerRootHighlightKey(screen: PassengerMenuScreen): string | null {
  if (screen === 'root') return null
  if (screen === 'history' || screen === 'history_detail' || screen === 'share_app') return 'trips'
  if (screen === 'account') return 'account'
  if (screen === 'settings') return 'settings'
  return null
}

export function passengerMenuTitle(screen: PassengerMenuScreen): string {
  if (screen === 'history') return 'Histórico'
  if (screen === 'history_detail') return 'Detalhe da viagem'
  if (screen === 'account') return 'Conta'
  if (screen === 'share_app') return 'Partilhar app'
  if (screen === 'settings') return 'Definições'
  return 'Menu'
}
