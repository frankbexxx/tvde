import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const dir = dirname(fileURLToPath(import.meta.url))

/**
 * Garante que não voltamos a introduzir console.log explícito do JWT no fluxo de login.
 */
describe('AuthContext (política de logs)', () => {
  it('não contém log de token de sessão', () => {
    const src = readFileSync(join(dir, 'AuthContext.tsx'), 'utf8')
    expect(src).not.toMatch(/LOGIN\s+TOKEN/i)
    expect(src).not.toMatch(/console\.log\([^)]*access_token|console\.log\([^)]*\btoken\b/i)
  })
})
