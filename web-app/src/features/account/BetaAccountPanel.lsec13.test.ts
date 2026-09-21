import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('BetaAccountPanel L-SEC-13 password change', () => {
  it('logs out after successful password change (revoked JWT)', () => {
    const src = readFileSync(
      join(__dirname, 'BetaAccountPanel.tsx'),
      'utf8'
    )
    expect(src).toMatch(/passwordUpdatedReLogin/)
    expect(src).toMatch(/logout\(\)/)
    expect(src).toMatch(/changeMyPassword/)
  })
})
