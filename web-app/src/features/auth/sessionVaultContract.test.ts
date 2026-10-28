import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SESSION_VAULT_METHODS, SESSION_VAULT_PUBLIC_FIELDS, SESSION_VAULT_SAVE_BRIDGE } from './sessionVaultContract'

describe('contrato do cofre nativo', () => {
  it('não devolve o refresh token ao JavaScript e não o envia ao Capacitor', () => {
    expect(SESSION_VAULT_PUBLIC_FIELDS).not.toContain('refreshToken')
    expect(SESSION_VAULT_PUBLIC_FIELDS).not.toContain('idempotencyKey')
    expect(SESSION_VAULT_METHODS).toEqual(['read', 'clear'])
    expect(SESSION_VAULT_SAVE_BRIDGE).toBe('VamulaSessionVault')

    const plugin = readFileSync('android/app/src/main/java/pt/vamula/app/vault/SessionVaultPlugin.java', 'utf8')
    expect(plugin).not.toContain('getString(')
    const saveBridge = readFileSync('android/app/src/main/java/pt/vamula/app/vault/SessionVaultJs.java', 'utf8')
    expect(saveBridge).not.toContain('Logger')
    expect(saveBridge).not.toContain('Log.')
    const capacitor = readFileSync(
      'node_modules/@capacitor/android/capacitor/src/main/java/com/getcapacitor/Bridge.java',
      'utf8',
    )
    expect(capacitor).toContain('call.getData().toString()')
    const writer = readFileSync('src/features/auth/nativeSessionVault.ts', 'utf8')
    expect(writer).not.toContain('console.')
    expect(writer).toContain('VamulaSessionVault')
  })
})