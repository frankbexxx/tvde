import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const dir = dirname(fileURLToPath(import.meta.url))

/**
 * Garante que não voltamos a introduzir console.log explícito do JWT no fluxo de login,
 * nem a regressão L-FE-14 (`isAdmin = !!tokens?.admin`).
 */
describe('AuthContext (política de logs e admin)', () => {
  it('não contém log de token de sessão', () => {
    const src = readFileSync(join(dir, 'AuthContext.tsx'), 'utf8')
    expect(src).not.toMatch(/LOGIN\s+TOKEN/i)
    expect(src).not.toMatch(/console\.log\([^)]*access_token|console\.log\([^)]*\btoken\b/i)
  })

  it('não deriva isAdmin da existência do slot tokens.admin', () => {
    const src = readFileSync(join(dir, 'AuthContext.tsx'), 'utf8')
    expect(src).not.toMatch(/isAdmin\s*=\s*!!tokens\?\.admin/)
    expect(src).not.toMatch(/!!tokens\?\.admin/)
    expect(src).toMatch(/isAdminFromSessionRole\(sessionRole\)/)
  })

  it('usa resolveAuthBootstrapMode para decidir login vs /dev/tokens', () => {
    const src = readFileSync(join(dir, 'AuthContext.tsx'), 'utf8')
    expect(src).toMatch(/resolveAuthBootstrapMode/)
    expect(src).toMatch(/authBootstrapMode === 'login_session'/)
  })
})
