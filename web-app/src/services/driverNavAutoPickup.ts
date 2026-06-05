/**
 * Preferência: abrir navegação à recolha automaticamente ao aceitar viagem (G12 híbrido).
 * Default OFF — política B mantém destino auto ao iniciar; recolha só se o motorista activar.
 */
const STORAGE_KEY = 'tvde_driver_nav_auto_pickup_on_accept'

export function getDriverNavAutoPickupOnAccept(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function setDriverNavAutoPickupOnAccept(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0')
  } catch {
    /* ignore */
  }
}
