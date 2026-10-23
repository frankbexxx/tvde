import { beforeEach, describe, expect, it } from 'vitest'
import {
  ADD_IDENTITY_INTENT,
  beginGoogleOAuthFlow,
  clearGoogleOAuthPending,
  GOOGLE_OAUTH_INTENT_KEY,
  GOOGLE_OAUTH_PENDING_KEY,
  GOOGLE_OAUTH_PENDING_TTL_MS,
  GOOGLE_OAUTH_STATE_KEY,
  peekGoogleOAuthPending,
  resolveGoogleOAuthPending,
  saveGoogleOAuthPending,
} from './googleOauthState'

describe('google OAuth pending (atomic state)', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('stores flow and state in one JSON write (add identity)', () => {
    const state = beginGoogleOAuthFlow('add_identity', '/passenger/account')
    const raw = sessionStorage.getItem(GOOGLE_OAUTH_PENDING_KEY)
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!) as { flow: string; state: string; returnPath: string }
    expect(parsed.flow).toBe('add_identity')
    expect(parsed.state).toBe(state)
    expect(parsed.returnPath).toBe('/passenger/account')
    expect(sessionStorage.getItem(GOOGLE_OAUTH_STATE_KEY)).toBe(state)
    expect(sessionStorage.getItem(GOOGLE_OAUTH_INTENT_KEY)).toBe(ADD_IDENTITY_INTENT)
  })

  it('clears add_identity markers when starting login', () => {
    beginGoogleOAuthFlow('add_identity', '/passenger')
    const loginState = beginGoogleOAuthFlow('login')
    expect(sessionStorage.getItem(GOOGLE_OAUTH_INTENT_KEY)).toBeNull()
    expect(resolveGoogleOAuthPending(loginState)?.flow).toBe('login')
  })

  it('resolves add_identity from JSON even if legacy intent key was removed', () => {
    const state = beginGoogleOAuthFlow('add_identity', '/passenger')
    sessionStorage.removeItem(GOOGLE_OAUTH_INTENT_KEY)
    const resolved = resolveGoogleOAuthPending(state)
    expect(resolved?.flow).toBe('add_identity')
  })

  it('rejects forged state without matching pending record', () => {
    beginGoogleOAuthFlow('login')
    expect(resolveGoogleOAuthPending('attacker-state')).toBeNull()
  })

  it('expires stale pending flows', () => {
    const state = beginGoogleOAuthFlow('add_identity')
    const now = Date.now() + GOOGLE_OAUTH_PENDING_TTL_MS + 1
    expect(resolveGoogleOAuthPending(state, now)).toBeNull()
    expect(sessionStorage.getItem(GOOGLE_OAUTH_PENDING_KEY)).toBeNull()
  })

  it('rejects legacy state-only without pending JSON (no implicit login)', () => {
    sessionStorage.setItem(GOOGLE_OAUTH_STATE_KEY, 'legacy-login')
    expect(resolveGoogleOAuthPending('legacy-login')).toBeNull()
  })

  it('legacy add_identity requires intent key when JSON missing', () => {
    sessionStorage.setItem(GOOGLE_OAUTH_STATE_KEY, 'legacy-add')
    sessionStorage.setItem(GOOGLE_OAUTH_INTENT_KEY, ADD_IDENTITY_INTENT)
    const resolved = resolveGoogleOAuthPending('legacy-add')
    expect(resolved?.flow).toBe('add_identity')
  })

  it('state without intent and without JSON does not guess login (T2 gap)', () => {
    sessionStorage.setItem(GOOGLE_OAUTH_STATE_KEY, 'split-bug')
    expect(resolveGoogleOAuthPending('split-bug')).toBeNull()
  })

  it('peekGoogleOAuthPending reads active flow without URL state', () => {
    beginGoogleOAuthFlow('add_identity', '/passenger/account')
    expect(peekGoogleOAuthPending()?.flow).toBe('add_identity')
    expect(peekGoogleOAuthPending()?.returnPath).toBe('/passenger/account')
  })

  it('saveGoogleOAuthPending keeps legacy keys aligned', () => {
    saveGoogleOAuthPending({
      state: 's1',
      flow: 'add_identity',
      returnPath: '/x',
      startedAt: Date.now(),
    })
    expect(sessionStorage.getItem(GOOGLE_OAUTH_STATE_KEY)).toBe('s1')
    clearGoogleOAuthPending()
    expect(sessionStorage.getItem(GOOGLE_OAUTH_STATE_KEY)).toBeNull()
  })
})
