export const GOOGLE_OAUTH_STATE_KEY = 'tvde_google_oauth_state'

/** Nonce/state opaco. Não é um segredo de longa duração. */
export function createOauthNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
