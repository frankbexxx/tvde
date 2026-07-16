/**
 * Preferência: abrir navegação à recolha automaticamente ao aceitar viagem.
 * Default ON (NAV/WAZE-1); o motorista pode desactivar no menu Operações.
 */
const STORAGE_KEY = 'tvde_driver_nav_auto_pickup_on_accept'

export function getDriverNavAutoPickupOnAccept(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === null) return true
    return v === '1'
  } catch {
    return true
  }
}

export function setDriverNavAutoPickupOnAccept(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0')
  } catch {
    /* ignore */
  }
}
