import { apiFetch } from '../../api/client'
import { isCapacitorNative } from '../auth/capacitorPlatform'
import { getStoredAccessToken } from '../../utils/authStorage'

/** Canal Android único nesta fase. Ofertas reais entram em P2. */
export const TRIPS_NOTIFICATION_CHANNEL_ID = 'trips'

type PushPermissionState = 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale'

type PushPlugin = {
  checkPermissions: () => Promise<{ receive: PushPermissionState }>
  requestPermissions: () => Promise<{ receive: PushPermissionState }>
  register: () => Promise<void>
  createChannel: (channel: {
    id: string
    name: string
    description?: string
    importance?: number
    visibility?: number
  }) => Promise<void>
  addListener: (
    event: string,
    handler: (payload: { value?: string }) => void
  ) => Promise<{ remove: () => Promise<void> }>
}

let listenersReady = false
let currentPushToken: string | null = null

async function plugin(): Promise<PushPlugin> {
  const mod = await import('@capacitor/push-notifications')
  return mod.PushNotifications as PushPlugin
}

async function publishToken(fcmToken: string): Promise<void> {
  const access = getStoredAccessToken()
  if (!access) return
  currentPushToken = fcmToken
  await apiFetch('/push/tokens', {
    method: 'POST',
    body: JSON.stringify({ token: fcmToken, platform: 'android' }),
    token: access,
  })
}

/** Listeners de registo. Não trata eventos de viagem (P2/P3). */
export async function ensurePushListeners(): Promise<void> {
  if (listenersReady || !isCapacitorNative()) return
  const push = await plugin()
  await push.addListener('registration', (payload) => {
    const value = payload.value
    if (!value) return
    void publishToken(value).catch(() => {
      /* o login e os dashboards continuam sem push */
    })
  })
  await push.addListener('registrationError', () => {
    /* recusa ou falha do plugin não rebenta a UI */
  })
  await push.addListener('pushNotificationReceived', () => {})
  await push.addListener('pushNotificationActionPerformed', () => {})
  listenersReady = true
}

async function registerGranted(): Promise<void> {
  const push = await plugin()
  await ensurePushListeners()
  try {
    await push.createChannel({
      id: TRIPS_NOTIFICATION_CHANNEL_ID,
      name: 'Viagens',
      description: 'Avisos de viagens',
      importance: 5,
      visibility: 1,
    })
  } catch {
    /* o canal é Android; a falta dele não bloqueia a sessão */
  }
  await push.register()
}

/**
 * Depois de uma sessão válida, se a permissão já tiver sido dada.
 * Não mostra o diálogo do sistema.
 */
export async function attachPushIfAlreadyGranted(): Promise<'registered' | 'skipped'> {
  if (!isCapacitorNative()) return 'skipped'
  try {
    const push = await plugin()
    const current = await push.checkPermissions()
    if (current.receive !== 'granted') return 'skipped'
    await registerGranted()
    return 'registered'
  } catch {
    return 'skipped'
  }
}

/**
 * Pede a permissão no momento do produto (motorista a ficar disponível,
 * passageiro depois do primeiro pedido). A recusa não bloqueia o fluxo.
 */
export async function requestTripNotificationPermission(): Promise<'registered' | 'denied' | 'skipped'> {
  if (!isCapacitorNative()) return 'skipped'
  try {
    const push = await plugin()
    let current = await push.checkPermissions()
    if (current.receive === 'prompt' || current.receive === 'prompt-with-rationale') {
      current = await push.requestPermissions()
    }
    if (current.receive !== 'granted') return 'denied'
    await registerGranted()
    return 'registered'
  } catch {
    return 'denied'
  }
}

/** Desactiva o token deste aparelho antes de apagar a sessão. */
export function deactivatePushOnLogout(accessToken: string | null): void {
  const fcmToken = currentPushToken
  currentPushToken = null
  if (!accessToken || !fcmToken || !isCapacitorNative()) return
  void apiFetch('/push/tokens/unregister', {
    method: 'POST',
    body: JSON.stringify({ token: fcmToken }),
    token: accessToken,
  }).catch(() => {
    /* logout local segue mesmo se a rede falhar */
  })
}

export function resetPushRegistrationForTests(): void {
  listenersReady = false
  currentPushToken = null
}
