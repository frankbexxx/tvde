import type { DriverMenuScreen } from './DriverSideMenu'

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
  if (screen === 'root') return 'Menu'
  if (screen === 'profile') return 'Perfil'
  if (screen === 'inbox') return 'Caixa de entrada'
  if (screen === 'earnings') return 'Rendimentos'
  if (screen === 'trips') return 'Viagens'
  if (screen === 'trips_silenced') return 'Ofertas silenciadas'
  if (screen === 'nav') return 'Navegação'
  if (screen === 'categories') return 'Categorias'
  if (screen === 'zones') return 'Zonas'
  if (screen === 'zones_budget') return 'Orçamento zona'
  if (screen === 'zones_session') return 'Sessão activa'
  if (screen === 'zones_request') return 'Pedir mudança'
  if (screen === 'docs') return 'Documentos'
  if (screen === 'pricing') return 'Preços'
  if (screen === 'settings') return 'Definições'
  return 'Menu do motorista'
}
