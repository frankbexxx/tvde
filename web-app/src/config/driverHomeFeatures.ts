/**
 * Feature flags for the driver home experience (Top 3 Manel — see
 * `docs/product/DRIVER_HOME_TOP3_MANEL.md`).
 */
export function isDriverHomeTwoStepEnabled(): boolean {
  // Decisão produto (2026-05): com shell Manel (`VITE_DRIVER_BOTTOM_NAV`), o home é um único
  // ecrã — disponibilidade com um toque nos chips do mapa; o passo 1/2 só aplica sem bottom nav (legacy).
  if (import.meta.env.VITE_DRIVER_BOTTOM_NAV === 'true') {
    return false
  }
  return import.meta.env.VITE_DRIVER_HOME_TWO_STEP === 'true'
}

/** Barra inferior Início | Rendimentos | Caixa | Menu (§9 `DRIVER_HOME_TOP3_MANEL.md`). */
export function isDriverBottomNavEnabled(): boolean {
  return import.meta.env.VITE_DRIVER_BOTTOM_NAV === 'true'
}

/**
 * Só inicia `watchPosition` após o utilizador tocar no mapa (menos prompts à entrada).
 * Ver `docs/prompts/EXTRA-2026-05-13-DECISOES.md` #6.
 */
export function isDriverGeoOnFirstMapTapEnabled(): boolean {
  return import.meta.env.VITE_DRIVER_GEO_ON_FIRST_MAP_TAP === 'true'
}
