export const GOOGLE_OAUTH_STATE_KEY = 'tvde_google_oauth_state'

/** Nonce/state opaco. Não é um segredo de longa duração. */
export function createOauthNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** SHA-256 hex minúsculo. O Credential Manager Android ecoa o nonce que recebe. */
export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * O plugin recebe o hash. O backend recebe o raw e calcula o mesmo SHA-256.
 * Nunca passar o raw ao plugin: a Google devolve-o tal como o recebe.
 */
export async function nativeGoogleNonce(): Promise<{ pluginNonce: string; backendNonce: string }> {
  const backendNonce = createOauthNonce()
  const pluginNonce = await sha256Hex(backendNonce)
  return { pluginNonce, backendNonce }
}
