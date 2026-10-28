import { registerPlugin } from '@capacitor/core'
import type { PublicSession } from './sessionVaultContract'

interface SessionVaultPlugin {
  read(): Promise<PublicSession | { empty: true }>
  clear(): Promise<void>
}

interface SessionVaultSaveBridge {
  save(
    accessToken: string,
    refreshToken: string,
    familyId: string,
    generation: number,
    absoluteExpiresAt: string,
    idleExpiresAt: string,
  ): string
}

declare global {
  interface Window {
    VamulaSessionVault?: SessionVaultSaveBridge
  }
}

/** Leitura e limpeza. O login ainda não chama este plugin. */
export const NativeSessionVault = registerPlugin<SessionVaultPlugin>('SessionVault')

/**
 * A escrita não usa o plugin Capacitor: o Bridge regista os argumentos da chamada.
 * Este módulo não escreve esses valores em lado nenhum.
 */
export function saveNativeSession(input: {
  accessToken: string
  refreshToken: string
  familyId: string
  generation: number
  absoluteExpiresAt?: string | null
  idleExpiresAt?: string | null
}): void {
  const bridge = window.VamulaSessionVault
  if (!bridge) {
    throw new Error('vault_unavailable')
  }
  const result = bridge.save(
    input.accessToken,
    input.refreshToken,
    input.familyId,
    input.generation,
    input.absoluteExpiresAt ?? '',
    input.idleExpiresAt ?? '',
  )
  if (result !== 'ok') {
    throw new Error('vault_unavailable')
  }
}
