import { describe, expect, it } from 'vitest'
import { createOauthNonce, nativeGoogleNonce, sha256Hex } from './googleOauthState'

describe('createOauthNonce', () => {
  it('returns a 32-char hex nonce', () => {
    const nonce = createOauthNonce()
    expect(nonce).toMatch(/^[0-9a-f]{32}$/)
    expect(createOauthNonce()).not.toBe(nonce)
  })
})

describe('nativeGoogleNonce', () => {
  it('gives the plugin a sha256 hex and keeps the raw nonce for the backend', async () => {
    const { pluginNonce, backendNonce } = await nativeGoogleNonce()
    expect(backendNonce).toMatch(/^[0-9a-f]{32}$/)
    expect(pluginNonce).toMatch(/^[0-9a-f]{64}$/)
    expect(pluginNonce).not.toBe(backendNonce)
    expect(pluginNonce).toBe(await sha256Hex(backendNonce))
  })

  it('hashes a known string to lowercase hex', async () => {
    expect(await sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })
})