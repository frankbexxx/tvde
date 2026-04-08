/**
 * Modo de simulação de GPS — só em desenvolvimento (Vite DEV).
 * Produção: import.meta.env.DEV é false → isto nunca activa o mock.
 *
 * Ativar: `localStorage.setItem('mockLocation', 'true')` e recarregar — ou botão «Simular rota» em Configuração (Dev).
 * Desativar: `localStorage.removeItem('mockLocation')` e recarregar.
 */

export const MOCK_LOCATION_STORAGE_KEY = 'mockLocation'

export function isMockLocationModeEnabled(): boolean {
  if (typeof window === 'undefined') return false
  // In production builds, allow simulation only via explicit URL params.
  // This is intended for controlled testing on mobile, without persisting a toggle.
  if (!import.meta.env.DEV) {
    try {
      const params = new URLSearchParams(window.location.search)
      const demo = params.get('demo')
      const sim = params.get('sim')
      const demoOn = demo === '1' || demo === 'true'
      const simOn = sim === '1' || sim === 'true'
      return demoOn && simOn
    } catch {
      return false
    }
  }
  try {
    return localStorage.getItem(MOCK_LOCATION_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

/** Ativar/desactivar; em produção não faz nada. */
export function setMockLocationModeEnabled(enabled: boolean): void {
  if (!import.meta.env.DEV) return
  try {
    if (enabled) {
      localStorage.setItem(MOCK_LOCATION_STORAGE_KEY, 'true')
    } else {
      localStorage.removeItem(MOCK_LOCATION_STORAGE_KEY)
    }
  } catch {
    /* ignore */
  }
}
