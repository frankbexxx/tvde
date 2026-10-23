export const GOOGLE_OAUTH_STATE_KEY = 'tvde_google_oauth_state'
/** @deprecated Prefer {@link GOOGLE_OAUTH_PENDING_KEY} — kept in sync for one release of reads. */
export const GOOGLE_OAUTH_INTENT_KEY = 'tvde_google_oauth_intent'
/** @deprecated Prefer pending record returnPath. */
export const GOOGLE_OAUTH_RETURN_KEY = 'tvde_google_oauth_return'
export const GOOGLE_OAUTH_PENDING_KEY = 'tvde_google_oauth_pending'
export const ADD_IDENTITY_INTENT = 'add_identity'

export const GOOGLE_OAUTH_PENDING_TTL_MS = 15 * 60 * 1000

export type GoogleOAuthFlow = 'login' | 'add_identity'

export type GoogleOAuthPending = {
  state: string
  flow: GoogleOAuthFlow
  returnPath?: string
  startedAt: number
}

/** Nonce/state opaco. Não é um segredo de longa duração. */
export function createOauthNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function syncLegacyKeys(pending: GoogleOAuthPending): void {
  sessionStorage.setItem(GOOGLE_OAUTH_STATE_KEY, pending.state)
  if (pending.flow === 'add_identity') {
    sessionStorage.setItem(GOOGLE_OAUTH_INTENT_KEY, ADD_IDENTITY_INTENT)
    if (pending.returnPath) {
      sessionStorage.setItem(GOOGLE_OAUTH_RETURN_KEY, pending.returnPath)
    } else {
      sessionStorage.removeItem(GOOGLE_OAUTH_RETURN_KEY)
    }
  } else {
    sessionStorage.removeItem(GOOGLE_OAUTH_INTENT_KEY)
    sessionStorage.removeItem(GOOGLE_OAUTH_RETURN_KEY)
  }
}

export function saveGoogleOAuthPending(pending: GoogleOAuthPending): void {
  sessionStorage.setItem(GOOGLE_OAUTH_PENDING_KEY, JSON.stringify(pending))
  syncLegacyKeys(pending)
}

export function clearGoogleOAuthPending(): void {
  sessionStorage.removeItem(GOOGLE_OAUTH_PENDING_KEY)
  sessionStorage.removeItem(GOOGLE_OAUTH_STATE_KEY)
  sessionStorage.removeItem(GOOGLE_OAUTH_INTENT_KEY)
  sessionStorage.removeItem(GOOGLE_OAUTH_RETURN_KEY)
}

function readPendingJson(): GoogleOAuthPending | null {
  const raw = sessionStorage.getItem(GOOGLE_OAUTH_PENDING_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as GoogleOAuthPending
    if (typeof parsed.state !== 'string' || !parsed.state.trim()) return null
    if (parsed.flow !== 'login' && parsed.flow !== 'add_identity') return null
    if (typeof parsed.startedAt !== 'number' || !Number.isFinite(parsed.startedAt)) return null
    return parsed
  } catch {
    return null
  }
}

function legacyPendingForState(returnedState: string): GoogleOAuthPending | null {
  const legacyState = sessionStorage.getItem(GOOGLE_OAUTH_STATE_KEY)
  if (legacyState !== returnedState) return null
  const intent = sessionStorage.getItem(GOOGLE_OAUTH_INTENT_KEY)
  if (intent !== ADD_IDENTITY_INTENT) return null
  return {
    state: returnedState,
    flow: 'add_identity',
    returnPath: sessionStorage.getItem(GOOGLE_OAUTH_RETURN_KEY) ?? undefined,
    startedAt: Date.now(),
  }
}

function isExpired(pending: GoogleOAuthPending, now: number): boolean {
  return now - pending.startedAt > GOOGLE_OAUTH_PENDING_TTL_MS
}

/**
 * Valida o `state` devolvido pela Google contra o registo local iniciado neste browser.
 * O fluxo (login vs add identity) só é confiável se vier do JSON atómico ou do par legacy coerente.
 */
/** Lê o pedido OAuth local activo (sem validar `state` na URL). Útil em cancelamentos `?error=`. */
export function peekGoogleOAuthPending(now: number = Date.now()): GoogleOAuthPending | null {
  const fromJson = readPendingJson()
  if (!fromJson) return null
  if (isExpired(fromJson, now)) return null
  return fromJson
}

export function resolveGoogleOAuthPending(
  returnedState: string | null | undefined,
  now: number = Date.now(),
): GoogleOAuthPending | null {
  const state = returnedState?.trim()
  if (!state) return null

  const fromJson = readPendingJson()
  if (fromJson && fromJson.state === state) {
    if (isExpired(fromJson, now)) {
      clearGoogleOAuthPending()
      return null
    }
    return fromJson
  }

  const legacy = legacyPendingForState(state)
  if (!legacy) return null
  if (isExpired(legacy, now)) {
    clearGoogleOAuthPending()
    return null
  }
  return legacy
}

/** Inicia OAuth web: substitui qualquer pedido pendente (evita intents antigos). */
export function beginGoogleOAuthFlow(flow: GoogleOAuthFlow, returnPath?: string): string {
  clearGoogleOAuthPending()
  const state = createOauthNonce()
  const pending: GoogleOAuthPending = {
    state,
    flow,
    startedAt: Date.now(),
    ...(flow === 'add_identity' ? { returnPath: returnPath ?? undefined } : {}),
  }
  saveGoogleOAuthPending(pending)
  return state
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
