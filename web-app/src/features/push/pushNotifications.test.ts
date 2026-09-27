import { beforeEach, describe, expect, it, vi } from 'vitest'

const native = vi.hoisted(() => ({ value: false }))
const push = vi.hoisted(() => {
  const listeners = new Map<string, (payload: { value?: string }) => void>()
  return {
    listeners,
    checkPermissions: vi.fn(async (): Promise<{ receive: string }> => ({ receive: 'granted' })),
    requestPermissions: vi.fn(async (): Promise<{ receive: string }> => ({ receive: 'granted' })),
    register: vi.fn(async () => {}),
    createChannel: vi.fn(async () => {}),
    addListener: vi.fn(async (event: string, handler: (payload: { value?: string }) => void) => {
      listeners.set(event, handler)
      return { remove: async () => {} }
    }),
    emit(event: string, payload: { value?: string }) {
      listeners.get(event)?.(payload)
    },
  }
})

const api = vi.hoisted(() => ({
  apiFetch: vi.fn(async () => ({})),
  getStoredAccessToken: vi.fn(() => 'session-token'),
}))

vi.mock('../auth/capacitorPlatform', () => ({
  isCapacitorNative: () => native.value,
}))

vi.mock('@capacitor/push-notifications', () => ({
  PushNotifications: push,
}))

vi.mock('../../api/client', () => ({
  apiFetch: api.apiFetch,
}))

vi.mock('../../utils/authStorage', () => ({
  getStoredAccessToken: api.getStoredAccessToken,
}))

import {
  attachPushIfAlreadyGranted,
  deactivatePushOnLogout,
  requestTripNotificationPermission,
  resetPushRegistrationForTests,
} from './pushNotifications'

describe('pushNotifications', () => {
  beforeEach(() => {
    native.value = false
    resetPushRegistrationForTests()
    push.listeners.clear()
    push.checkPermissions.mockReset()
    push.requestPermissions.mockReset()
    push.register.mockClear()
    push.createChannel.mockClear()
    push.addListener.mockClear()
    api.apiFetch.mockClear()
    api.getStoredAccessToken.mockReturnValue('session-token')
    push.checkPermissions.mockResolvedValue({ receive: 'granted' })
    push.requestPermissions.mockResolvedValue({ receive: 'granted' })
  })

  it('no browser não inicializa o plugin', async () => {
    await expect(requestTripNotificationPermission()).resolves.toBe('skipped')
    await expect(attachPushIfAlreadyGranted()).resolves.toBe('skipped')
    expect(push.addListener).not.toHaveBeenCalled()
    expect(api.apiFetch).not.toHaveBeenCalled()
  })

  it('permissão recusada não rebenta e não regista', async () => {
    native.value = true
    push.checkPermissions.mockResolvedValue({ receive: 'denied' })
    await expect(requestTripNotificationPermission()).resolves.toBe('denied')
    expect(push.register).not.toHaveBeenCalled()
    expect(api.apiFetch).not.toHaveBeenCalled()
  })

  it('registration envia o token ao backend', async () => {
    native.value = true
    await requestTripNotificationPermission()
    push.emit('registration', { value: 'fcm-device-token-value-ok' })
    await vi.waitFor(() => expect(api.apiFetch).toHaveBeenCalled())
    expect(api.apiFetch).toHaveBeenCalledWith(
      '/push/tokens',
      expect.objectContaining({
        method: 'POST',
        token: 'session-token',
        body: JSON.stringify({ token: 'fcm-device-token-value-ok', platform: 'android' }),
      })
    )
  })

  it('registrationError não rebenta a UI', async () => {
    native.value = true
    await requestTripNotificationPermission()
    expect(() => push.emit('registrationError', {})).not.toThrow()
  })

  it('logout desactiva o token registado', async () => {
    native.value = true
    await requestTripNotificationPermission()
    push.emit('registration', { value: 'fcm-device-token-value-ok' })
    await vi.waitFor(() => expect(api.apiFetch).toHaveBeenCalled())
    api.apiFetch.mockClear()
    deactivatePushOnLogout('session-token')
    expect(api.apiFetch).toHaveBeenCalledWith(
      '/push/tokens/unregister',
      expect.objectContaining({
        method: 'POST',
        token: 'session-token',
      })
    )
  })

  it('outro utilizador volta a registar o mesmo aparelho', async () => {
    native.value = true
    await attachPushIfAlreadyGranted()
    api.getStoredAccessToken.mockReturnValue('next-user')
    push.emit('registration', { value: 'fcm-device-token-value-ok' })
    await vi.waitFor(() => expect(api.apiFetch).toHaveBeenCalled())
    const call = api.apiFetch.mock.calls[0] as unknown as [string, { token?: string }]
    expect(call[1].token).toBe('next-user')
  })

  it('monta os listeners uma vez', async () => {
    native.value = true
    await attachPushIfAlreadyGranted()
    await requestTripNotificationPermission()
    const events = push.addListener.mock.calls.map((call) => call[0])
    expect(events).toEqual([
      'registration',
      'registrationError',
      'pushNotificationReceived',
      'pushNotificationActionPerformed',
    ])
  })
})
