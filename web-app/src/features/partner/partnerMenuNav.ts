import type { PartnerMenuScreen } from './PartnerSideMenu'

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

export function partnerMenuTitle(screen: PartnerMenuScreen): string {
  if (screen === 'root') return 'Partner'
  if (screen === 'fleet') return 'Frota'
  if (screen === 'fleet_list') return 'Lista motoristas'
  if (screen === 'fleet_map') return 'Mapa live'
  if (screen === 'fleet_add') return 'Adicionar à frota'
  if (screen === 'trips') return 'Viagens'
  if (screen === 'trips_summary') return 'Resumo viagens'
  if (screen === 'trips_list') return 'Lista viagens'
  if (screen === 'trips_export') return 'Exportar viagens'
  if (screen === 'reports') return 'Relatórios'
  if (screen === 'settings') return 'Definições'
  if (screen === 'profile') return 'Perfil'
  if (screen === 'inbox') return 'Caixa'
  return 'Partner'
}
