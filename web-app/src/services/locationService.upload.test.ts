import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GPS_CONTRACT_FIX_V1, GPS_CONTRACT_HEADER } from './driverLocationUpload'
import { sendDriverLocation } from './locationService'

const FIX_TS = 1_700_000_000_000

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
    await sendDriverLocation(38.7, -9.3, 'jwt', 'device_gps', FIX_TS)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/drivers/location')
    const init = fetchMock.mock.calls[0][1] as { body: string; headers: Record<string, string> }
    expect(JSON.parse(init.body)).toEqual({ lat: 38.7, lng: -9.3, timestamp: FIX_TS })
    expect(init.headers[GPS_CONTRACT_HEADER]).toBe(GPS_CONTRACT_FIX_V1)
  })

  it('does not POST device_gps without a fix timestamp', async () => {
    await sendDriverLocation(38.7, -9.3, 'jwt', 'device_gps')
    expect(fetchMock).not.toHaveBeenCalled()
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

  it('POSTs mock when VITE_E2E=true without the real-fix header', async () => {
    vi.stubEnv('VITE_E2E', 'true')
    await sendDriverLocation(38.7, -9.3, 'jwt', 'mock')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const init = fetchMock.mock.calls[0][1] as { body: string; headers?: Record<string, string> }
    expect(init.headers?.[GPS_CONTRACT_HEADER]).toBeUndefined()
    expect(JSON.parse(init.body).timestamp).not.toBe(FIX_TS)
  })

  it('real coordinates at Oeiras with device_gps still POSTs', async () => {
    await sendDriverLocation(38.6973, -9.30836, 'jwt', 'device_gps', FIX_TS)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const init = fetchMock.mock.calls[0][1] as { body: string; headers: Record<string, string> }
    expect(JSON.parse(init.body).timestamp).toBe(FIX_TS)
    expect(init.headers[GPS_CONTRACT_HEADER]).toBe(GPS_CONTRACT_FIX_V1)
  })
})
