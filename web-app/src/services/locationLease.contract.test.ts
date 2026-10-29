import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { sendDriverLocation } from './locationService'

const fetchMock = vi.fn()

vi.mock('../api/client', () => ({
  apiFetch: (...args: unknown[]) => fetchMock(...args),
}))

describe('webview location lease', () => {
  afterEach(() => {
    delete window.vamulaGps
    fetchMock.mockReset()
  })

  it('keeps begin and end in the same request and has no timeout release', () => {
    const source = readFileSync(resolve('src/services/locationService.ts'), 'utf8')
    const ownership = readFileSync(resolve('src/services/gpsOwnership.ts'), 'utf8')
    expect(source).toContain('endWebViewLocationSend()')
    expect(source).toContain('finally')
    expect(source).not.toContain('setTimeout')
    expect(ownership).not.toContain('setTimeout')
    expect(ownership).not.toContain('OPEN_SEND_BOUND')
  })

  it('does not end the lease before the request settles', async () => {
    const end = vi.fn()
    window.vamulaGps = {
      nativeOwnsUpload: () => false,
      beginWebViewSend: () => true,
      endWebViewSend: end,
      sessionChanged: () => undefined,
    }
    let release: (value: void) => void = () => undefined
    fetchMock.mockReturnValue(new Promise<void>((resolve) => {
      release = resolve
    }))
    const pending = sendDriverLocation(1, 2, 'token', 'device_gps', 1_700_000_000_000)
    await Promise.resolve()
    expect(end).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    release()
    await pending
    expect(end).toHaveBeenCalledTimes(1)
  })

  it('does not end a lease that was refused', async () => {
    const end = vi.fn()
    window.vamulaGps = {
      nativeOwnsUpload: () => true,
      beginWebViewSend: () => false,
      endWebViewSend: end,
      sessionChanged: () => undefined,
    }
    const result = await sendDriverLocation(1, 2, 'token', 'device_gps', 1_700_000_000_000)
    expect(result).toBe('blocked')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(end).not.toHaveBeenCalled()
  })
})
