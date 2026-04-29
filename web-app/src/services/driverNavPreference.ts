/**
 * Preferência do motorista para apps de navegação externa (Waze vs Google Maps).
 * Persistida em localStorage para sobreviver a recarregamentos.
 */
export type DriverNavApp = 'waze' | 'google_maps'

const STORAGE_KEY = 'tvde_driver_nav_app'

const DEFAULT_APP: DriverNavApp = 'waze'

function isDriverNavApp(v: string | null): v is DriverNavApp {
  return v === 'waze' || v === 'google_maps'
}

export function getDriverNavApp(): DriverNavApp {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw && isDriverNavApp(raw)) return raw
  } catch {
    /* ignore */
  }
  return DEFAULT_APP
}

export function setDriverNavApp(app: DriverNavApp): void {
  try {
    localStorage.setItem(STORAGE_KEY, app)
  } catch {
    /* ignore */
  }
}
