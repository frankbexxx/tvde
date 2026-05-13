/**
 * Home motorista (shell Manel). Comportamento fixo no código — o mesmo em dev e em produção.
 */

export function isDriverHomeTwoStepEnabled(): boolean {
  return false
}

/** Barra inferior Início | Rendimentos | Caixa | Menu. */
export function isDriverBottomNavEnabled(): boolean {
  return true
}

/** Legado; o fluxo de GPS não depende disto. */
export function isDriverGeoOnFirstMapTapEnabled(): boolean {
  return true
}
