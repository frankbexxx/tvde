/**
 * Feature flags for the driver home experience (Top 3 Manel — see
 * `docs/product/DRIVER_HOME_TOP3_MANEL.md`).
 */
export function isDriverHomeTwoStepEnabled(): boolean {
  return import.meta.env.VITE_DRIVER_HOME_TWO_STEP === 'true'
}

/** Barra inferior Início | Ganhos | Caixa | Menu (§9 `DRIVER_HOME_TOP3_MANEL.md`). */
export function isDriverBottomNavEnabled(): boolean {
  return import.meta.env.VITE_DRIVER_BOTTOM_NAV === 'true'
}
