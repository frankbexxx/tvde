import { apiFetch } from '../../api/client'
import { isCapacitorNative } from '../auth/capacitorPlatform'
import { getStoredAccessToken, setStoredAppRouteRole } from '../../utils/authStorage'

/** Canal Android das ofertas de viagem. */
export const TRIPS_NOTIFICATION_CHANNEL_ID = 'trips'

type PushPermissionState = 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale'

type PushListenerPayload = {
  value?: string
  notification?: { data?: Record<string, unknown> }
}

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
    handler: (payload: PushListenerPayload) => void
  ) => Promise<{ remove: () => Promise<void> }>
}

export type OfferPushRoute = 'driver' | 'ignored'

function pushData(payload: PushListenerPayload | undefined): Record<string, unknown> | undefined {
  const data = payload?.notification?.data
  return data && typeof data === 'object' ? data : undefined
}

/** Foreground: a UI de ofertas já faz polling. Não abre outra notificação. */
export function noteForegroundOfferPush(
  data: Record<string, unknown> | undefined
): 'noted' | 'ignored' {
  if (data?.event !== 'new_trip_offer') return 'ignored'
  return 'noted'
}

/**
 * Toque na notificação. Sessão válida abre /driver.
 * Sem sessão, /driver mostra o login já com o papel de motorista.
 */
export function applyOfferPushNavigation(
  data: Record<string, unknown> | undefined
): OfferPushRoute {
  if (!data || data.event !== 'new_trip_offer') return 'ignored'
  setStoredAppRouteRole('driver')
  if (window.location.pathname !== '/driver') {
    window.location.assign('/driver')
  }
  return 'driver'
}

let listenersReady = false
let currentPushToken: string | null = null

async function loadPush(): Promise<{ push: PushPlugin }> {
  const mod = await import('@capacitor/push-notifications')
  // O objecto do plugin é thenable. Await directo chama .then(), que no Android não existe.
  return { push: mod.PushNotifications as PushPlugin }
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

/** Listeners de registo e do toque numa oferta. */
export async function ensurePushListeners(): Promise<void> {
  if (listenersReady || !isCapacitorNative()) return
  const { push } = await loadPush()
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
  await push.addListener('pushNotificationReceived', (payload) => {
    try {
      noteForegroundOfferPush(pushData(payload))
    } catch {
      /* um payload desconhecido não rebenta a UI */
    }
  })
  await push.addListener('pushNotificationActionPerformed', (payload) => {
    try {
      applyOfferPushNavigation(pushData(payload))
    } catch {
      /* um payload desconhecido não rebenta a UI */
    }
  })
  listenersReady = true
}

async function registerGranted(): Promise<void> {
  const { push } = await loadPush()
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
    const { push } = await loadPush()
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
    const { push } = await loadPush()
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
