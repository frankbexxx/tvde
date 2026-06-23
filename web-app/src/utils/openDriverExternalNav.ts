import { getDriverNavApp } from '../services/driverNavPreference'
import { googleMapsDirectionsUrl, wazeNavigateUrl, wazeWarmSessionUrl } from './externalNavigation'

const WAZE_WARM_KEY = 'tvde_driver_nav_warmed'

export type DriverNavPhase = 'pickup' | 'destination'

function driverExternalNavUrl(lat: number, lng: number): string {
  const app = getDriverNavApp()
  return app === 'waze' ? wazeNavigateUrl(lat, lng) : googleMapsDirectionsUrl(lat, lng)
}

/** Nome legível da app preferida (toast / logs). */
export function driverNavAppLabel(): string {
  return getDriverNavApp() === 'waze' ? 'Waze' : 'Google Maps'
}

/**
 * Reserva uma janela durante o gesto do utilizador; a URL real só é definida
 * depois do POST de aceitar concluir.
 */
export function reserveDriverExternalNavWindow(): Window | null {
  const opened = window.open('', '_blank')
  if (opened) {
    try {
      opened.opener = null
    } catch {
      /* ignore */
    }
  }
  return opened
}

/**
 * Abre a app de navegação preferida (Definições) num separador novo.
 * TW-04 / G12–G19: sem botões Waze/Maps no ecrã de viagem.
 */
export function openDriverExternalNav(
  lat: number,
  lng: number,
  reservedWindow?: Window | null
): boolean {
  const url = driverExternalNavUrl(lat, lng)
  if (reservedWindow && !reservedWindow.closed) {
    try {
      reservedWindow.opener = null
      reservedWindow.location.href = url
      return true
    } catch {
      try {
        reservedWindow.close()
      } catch {
        /* ignore */
      }
    }
  }
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
