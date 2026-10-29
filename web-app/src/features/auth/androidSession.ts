import { isCapacitorNative } from './capacitorPlatform'

export const ANDROID_REFRESH_CONTRACT = 'android-refresh-v1'

interface VaultBridge {
  postMessage: (message: string) => void
  onmessage: ((event: MessageEvent) => void) | null
}

interface VaultReply {
  id?: string
  ok?: boolean
  contract?: string
  error?: string
  kind?: string
  access_token?: string
  user_id?: string
  role?: string
  phone?: string
  display_name?: string
  revoked?: boolean
}

declare global {
  interface Window {
    vamulaVault?: VaultBridge
  }
}

export interface AndroidRefreshResult {
  kind: 'refreshed' | 'stale' | 'invalid' | 'transient' | 'unavailable'
  accessToken: string | null
}

export interface AndroidRestoreResult {
  kind: 'ready' | 'refreshed' | 'empty' | 'offline' | 'revoked' | 'unavailable'
  accessToken: string | null
  userId: string | null
  role: string | null
  phone: string | null
  displayName: string | null
}

let probed = false
let enabled = false
let probing: Promise<boolean> | null = null
const pending = new Map<string, (reply: VaultReply) => void>()
let listening = false

export function androidRefreshEnabled(): boolean {
  return enabled
}

export function resetAndroidRefreshForTests(): void {
  probed = false
  enabled = false
  probing = null
  pending.clear()
  listening = false
}

export function activateAndroidRefreshIfReady(): Promise<boolean> {
  if (probed) return Promise.resolve(enabled)
  if (!probing) {
    probing = probe().finally(() => {
      probing = null
    })
  }
  return probing
}

async function probe(): Promise<boolean> {
  if (!isCapacitorNative()) {
    probed = true
    enabled = false
    return false
  }
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (window.vamulaVault?.postMessage) {
      try {
        const reply = await call('contract', {})
        enabled = reply.ok === true && reply.contract === ANDROID_REFRESH_CONTRACT
      } catch {
        enabled = false
      }
      probed = true
      return enabled
    }
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  probed = true
  enabled = false
  return false
}

export async function commitAndroidLogin(input: {
  accessToken: string
  refreshToken: string
  familyId: string
  absoluteExpiresAt: string | null
}): Promise<boolean> {
  try {
    const reply = await call('commit', {
      api_base: apiBase(),
      access_token: input.accessToken,
      refresh_token: input.refreshToken,
      session_id: input.familyId,
      absolute_expires_at: input.absoluteExpiresAt,
    })
    return reply.ok === true
  } catch {
    return false
  }
}

export async function sealAndroidIssuer<T>(body: T): Promise<T> {
  const record = body as T & Record<string, unknown>
  const refresh = record.refresh_token
  const access = record.access_token
  const family = record.session_id
  if (
    typeof refresh !== 'string' ||
    refresh.length === 0 ||
    typeof access !== 'string' ||
    access.length === 0 ||
    typeof family !== 'string' ||
    family.length === 0
  ) {
    throw { status: 503, detail: 'refresh_unavailable' }
  }
  const absolute = typeof record.absolute_expires_at === 'string' ? record.absolute_expires_at : null
  const committed = await commitAndroidLogin({
    accessToken: access,
    refreshToken: refresh,
    familyId: family,
    absoluteExpiresAt: absolute,
  })
  if (!committed) {
    throw { status: 503, detail: 'refresh_unavailable' }
  }
  const { refresh_token: _omitted, ...rest } = record
  void _omitted
  return rest as T
}

export async function refreshAndroidSession(): Promise<AndroidRefreshResult> {
  try {
    const reply = await call('refresh', { api_base: apiBase() })
    const kind = reply.kind
    if (kind === 'refreshed' || kind === 'stale' || kind === 'invalid' || kind === 'transient' || kind === 'unavailable') {
      return { kind, accessToken: typeof reply.access_token === 'string' ? reply.access_token : null }
    }
    return { kind: 'invalid', accessToken: null }
  } catch {
    return { kind: 'transient', accessToken: null }
  }
}

export async function logoutAndroidSession(): Promise<void> {
  try {
    await call('logout', { api_base: apiBase() })
  } catch {
    // Sem ponte, a limpeza web segue. O cofre só fecha quando a mensagem chega.
  }
}

export async function restoreAndroidSession(): Promise<AndroidRestoreResult> {
  const empty: AndroidRestoreResult = {
    kind: 'unavailable',
    accessToken: null,
    userId: null,
    role: null,
    phone: null,
    displayName: null,
  }
  try {
    const reply = await call('restore', { api_base: apiBase() })
    const kind = reply.kind
    if (kind !== 'ready' && kind !== 'refreshed' && kind !== 'empty' && kind !== 'offline' && kind !== 'revoked' && kind !== 'unavailable') {
      return { ...empty, kind: 'unavailable' }
    }
    return {
      kind,
      accessToken: typeof reply.access_token === 'string' ? reply.access_token : null,
      userId: typeof reply.user_id === 'string' ? reply.user_id : null,
      role: typeof reply.role === 'string' ? reply.role : null,
      phone: typeof reply.phone === 'string' ? reply.phone : null,
      displayName: typeof reply.display_name === 'string' ? reply.display_name : null,
    }
  } catch {
    return empty
  }
}

function apiBase(): string {
  const value = import.meta.env.VITE_API_URL
  return typeof value === 'string' ? value : ''
}

function call(op: string, fields: Record<string, unknown>): Promise<VaultReply> {
  const bridge = window.vamulaVault
  if (!bridge?.postMessage) {
    return Promise.reject(new Error('vault_unavailable'))
  }
  listen(bridge)
  const id = crypto.randomUUID()
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id)
      reject(new Error('vault_timeout'))
    }, 20_000)
    pending.set(id, (reply) => {
      clearTimeout(timer)
      resolve(reply)
    })
    try {
      bridge.postMessage(JSON.stringify({ id, op, ...fields }))
    } catch {
      clearTimeout(timer)
      pending.delete(id)
      reject(new Error('vault_unavailable'))
    }
  })
}

function listen(bridge: VaultBridge): void {
  if (listening) return
  listening = true
  bridge.onmessage = (event: MessageEvent) => {
    const data = typeof event.data === 'string' ? event.data : ''
    let reply: VaultReply
    try {
      reply = JSON.parse(data) as VaultReply
    } catch {
      return
    }
    if (!reply.id) return
    const waiter = pending.get(reply.id)
    if (!waiter) return
    pending.delete(reply.id)
    waiter(reply)
  }
}
