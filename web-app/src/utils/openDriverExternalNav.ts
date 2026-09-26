import { getDriverNavApp } from '../services/driverNavPreference'
import {
  googleMapsAppUrl,
  googleMapsDirectionsUrl,
  isValidNavCoordinate,
  wazeAppUrl,
  wazeNavigateUrl,
} from './externalNavigation'
import { canOpenExternalUrl, isNativePlatform, openExternalUrl } from './openExternalApp'

export type DriverNavPhase = 'pickup' | 'destination'

/** Nome legível da app preferida (toast / logs). */
export function driverNavAppLabel(): string {
  return getDriverNavApp() === 'waze' ? 'Waze' : 'Google Maps'
}

/**
 * Abre a app preferida (Definições) fora da TVDE.
 * No Android tenta o deep link da app e, se não existir, o URL HTTPS.
 * TW-04: sem botões Waze/Maps separados no ecrã de viagem.
 */
export async function openDriverExternalNav(lat: number, lng: number): Promise<boolean> {
  if (!isValidNavCoordinate(lat, lng)) return false
  const app = getDriverNavApp()
  const httpsUrl = app === 'waze' ? wazeNavigateUrl(lat, lng) : googleMapsDirectionsUrl(lat, lng)
  if (!isNativePlatform()) {
    return openExternalUrl(httpsUrl)
  }
  const appUrl = app === 'waze' ? wazeAppUrl(lat, lng) : googleMapsAppUrl(lat, lng)
  if (await canOpenExternalUrl(appUrl)) {
    const opened = await openExternalUrl(appUrl)
    if (opened) return true
  }
  return openExternalUrl(httpsUrl)
}
