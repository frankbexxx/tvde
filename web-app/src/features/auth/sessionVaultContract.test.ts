import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ANDROID_REFRESH_CONTRACT, SESSION_VAULT_CHANNEL, SESSION_VAULT_METHODS, SESSION_VAULT_PUBLIC_FIELDS } from './sessionVaultContract'

describe('contrato do cofre nativo', () => {
  it('não devolve o refresh token ao JavaScript e não o envia ao Capacitor', () => {
    expect(SESSION_VAULT_PUBLIC_FIELDS).not.toContain('refreshToken')
    expect(SESSION_VAULT_PUBLIC_FIELDS).not.toContain('idempotencyKey')
    expect(SESSION_VAULT_METHODS).toEqual(['read', 'clear'])
    expect(SESSION_VAULT_CHANNEL).toBe('vamulaVault')
    expect(ANDROID_REFRESH_CONTRACT).toBe('android-refresh-v1')

    const plugin = readFileSync('android/app/src/main/java/pt/vamula/app/vault/SessionVaultPlugin.java', 'utf8')
    expect(plugin).not.toContain('getString(')
    const channel = readFileSync('android/app/src/main/java/pt/vamula/app/vault/VaultChannel.java', 'utf8')
    expect(channel).not.toContain('Logger')
    expect(channel).not.toContain('Log.')
    expect(channel).not.toContain('addJavascriptInterface')
    expect(channel).toContain('https://localhost')
    const activity = readFileSync('android/app/src/main/java/pt/vamula/app/MainActivity.java', 'utf8')
    expect(activity).not.toContain('addJavascriptInterface')
    const capacitor = readFileSync(
      'node_modules/@capacitor/android/capacitor/src/main/java/com/getcapacitor/Bridge.java',
      'utf8',
    )
    expect(capacitor).toContain('call.getData().toString()')
    const writer = readFileSync('src/features/auth/androidSession.ts', 'utf8')
    expect(writer).not.toContain('console.')
    expect(writer).not.toContain('localStorage')
    expect(writer).toContain('vamulaVault')
    expect(writer).not.toContain('VamulaSessionVault')
  })
})
