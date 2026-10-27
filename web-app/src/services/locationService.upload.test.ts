import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sendDriverLocation } from './locationService'

const fetchMock = vi.fn()

vi.mock('../api/client', () => ({
  apiFetch: (...args: unknown[]) => fetchMock(...args),
}))

describe('sendDriverLocation upload gate (G2-DRV-GPS-08)', () => {
  beforeEach(() => {
    fetchMock.mockClear()
    fetchMock.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('POSTs when origin is device_gps', async () => {
    await sendDriverLocation(38.7, -9.3, 'jwt', 'device_gps')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/drivers/location')
  })

  it('does not POST presentation_fallback', async () => {
    await sendDriverLocation(38.6973, -9.30836, 'jwt', 'presentation_fallback')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not POST demo', async () => {
    await sendDriverLocation(38.6973, -9.30836, 'jwt', 'demo')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not POST mock without VITE_E2E', async () => {
    vi.stubEnv('VITE_E2E', '')
    await sendDriverLocation(38.7, -9.3, 'jwt', 'mock')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('POSTs mock when VITE_E2E=true', async () => {
    vi.stubEnv('VITE_E2E', 'true')
    await sendDriverLocation(38.7, -9.3, 'jwt', 'mock')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('real coordinates at Oeiras with device_gps still POSTs', async () => {
    await sendDriverLocation(38.6973, -9.30836, 'jwt', 'device_gps')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
