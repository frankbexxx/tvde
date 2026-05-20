import { getDriverNavApp } from '../services/driverNavPreference'
import { googleMapsDirectionsUrl, wazeNavigateUrl } from './externalNavigation'

export type DriverNavPhase = 'pickup' | 'destination'

/** Nome legível da app preferida (toast / logs). */
export function driverNavAppLabel(): string {
  return getDriverNavApp() === 'waze' ? 'Waze' : 'Google Maps'
}

/**
 * Abre a app de navegação preferida (Definições) num separador novo.
 * TW-04 / G12–G19: sem botões Waze/Maps no ecrã de viagem.
 */
export function openDriverExternalNav(lat: number, lng: number, _phase?: DriverNavPhase): boolean {
  const app = getDriverNavApp()
  const url = app === 'waze' ? wazeNavigateUrl(lat, lng) : googleMapsDirectionsUrl(lat, lng)
  const opened = window.open(url, '_blank', 'noopener,noreferrer')
  return opened != null
}
