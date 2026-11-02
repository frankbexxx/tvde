import { beforeEach, describe, expect, it, vi } from 'vitest'

const android = vi.hoisted(() => ({
  result: { kind: 'refreshed', accessToken: 'access-new' } as { kind: string; accessToken?: string | null },
}))

vi.mock('../features/auth/capacitorPlatform', () => ({
  isCapacitorNative: () => true,
}))

vi.mock('../features/auth/androidSession', () => ({
  activateAndroidRefreshIfReady: async () => undefined,
  androidRefreshEnabled: () => true,
  logoutAndroidSession: async () => undefined,
  refreshAndroidSession: async () => android.result,
  resetAndroidRefreshForTests: () => undefined,
}))

import { currentSessionFamily, noteSessionFamily, resetSessionFamilyForTests } from '../features/driver/driverSessionFamily'
import { resetGpsNeedLogForTests } from '../services/gpsNeedLog'
import { refreshSession, resetSessionRefreshState } from './sessionRefresh'

describe('renovação Android observada como web', () => {
  beforeEach(() => {
    resetSessionRefreshState()
    resetGpsNeedLogForTests()
    resetSessionFamilyForTests()
    noteSessionFamily('family-a')
    android.result = { kind: 'refreshed', accessToken: 'access-new' }
    delete window.vamulaGps
  })

  it('sucesso regista início e sucesso sem família nem comando GPS', async () => {
    const refresh = vi.fn()
    const setServiceNeeded = vi.fn()
    window.vamulaGps = {
      nativeOwnsUpload: () => false,
      beginWebViewSend: () => true,
      endWebViewSend: () => undefined,
      sessionChanged: () => undefined,
      logGpsRefresh: refresh,
      setServiceNeeded,
    }
    await expect(refreshSession()).resolves.toBe('refreshed')
    expect(refresh.mock.calls).toEqual([
      ['refresh-start', 'web'],
      ['refresh-success', 'web'],
    ])
    expect(currentSessionFamily()).toBe('family-a')
    expect(setServiceNeeded).not.toHaveBeenCalled()
    expect(JSON.stringify(refresh.mock.calls)).not.toContain('access-')
  })

  it('falha regista início e falha', async () => {
    android.result = { kind: 'invalid', accessToken: null }
    const refresh = vi.fn()
    const setServiceNeeded = vi.fn()
    window.vamulaGps = {
      nativeOwnsUpload: () => false,
      beginWebViewSend: () => true,
      endWebViewSend: () => undefined,
      sessionChanged: () => undefined,
      logGpsRefresh: refresh,
      setServiceNeeded,
    }
    await expect(refreshSession()).resolves.toBe('invalid')
    expect(refresh.mock.calls).toEqual([
      ['refresh-start', 'web'],
      ['refresh-failed', 'web'],
    ])
    expect(currentSessionFamily()).toBe('family-a')
    expect(setServiceNeeded).not.toHaveBeenCalled()
  })
})
