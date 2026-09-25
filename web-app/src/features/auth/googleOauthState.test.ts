import { describe, expect, it } from 'vitest'
import { createOauthNonce } from './googleOauthState'

describe('createOauthNonce', () => {
  it('returns a 32-char hex nonce', () => {
    const nonce = createOauthNonce()
    expect(nonce).toMatch(/^[0-9a-f]{32}$/)
    expect(createOauthNonce()).not.toBe(nonce)
  })
})