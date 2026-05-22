import { getDriverNavApp } from '../services/driverNavPreference'
import { googleMapsDirectionsUrl, wazeNavigateUrl, wazeWarmSessionUrl } from './externalNavigation'

const WAZE_WARM_KEY = 'tvde_driver_nav_warmed'

export type DriverNavPhase = 'pickup' | 'destination'

/** Nome legível da app preferida (toast / logs). */
export function driverNavAppLabel(): string {
  return getDriverNavApp() === 'waze' ? 'Waze' : 'Google Maps'
}

/**
 * Abre a app de navegação preferida (Definições) num separador novo.
 * TW-04 / G12–G19: sem botões Waze/Maps no ecrã de viagem.
 */
export function openDriverExternalNav(lat: number, lng: number): boolean {
  const app = getDriverNavApp()
  const url = app === 'waze' ? wazeNavigateUrl(lat, lng) : googleMapsDirectionsUrl(lat, lng)
  const opened = window.open(url, '_blank', 'noopener,noreferrer')
  return opened != null
}

/**
 * Ao ficar disponível: abre Waze uma vez por sessão (se for a app preferida) para reduzir passos no 1.º aceitar.
 * Não garante login — depende do Waze no telemóvel.
 */
export function warmDriverNavSessionIfNeeded(): void {
  if (getDriverNavApp() !== 'waze') return
  try {
    if (sessionStorage.getItem(WAZE_WARM_KEY) === '1') return
    sessionStorage.setItem(WAZE_WARM_KEY, '1')
  } catch {
    return
  }
  window.open(wazeWarmSessionUrl(), '_blank', 'noopener,noreferrer')
}
