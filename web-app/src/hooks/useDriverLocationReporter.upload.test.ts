import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useDriverLocationReporter } from './useDriverLocationReporter'

const sendSpy = vi.fn().mockResolvedValue(undefined)

vi.mock('../services/locationService', () => ({
  sendDriverLocation: (...args: unknown[]) => sendSpy(...args),
}))

describe('useDriverLocationReporter upload origin', () => {
  beforeEach(() => {
    sendSpy.mockClear()
  })

  it('calls sendDriverLocation when origin is device_gps', async () => {
    renderHook(() =>
      useDriverLocationReporter({
        enabled: true,
        uploadOrigin: 'device_gps',
        accessToken: 'jwt-test',
        lat: 1,
        lng: 2,
        hasActiveTrip: false,
      })
    )

    await waitFor(() =>
      expect(sendSpy).toHaveBeenCalledWith(1, 2, 'jwt-test', 'device_gps')
    )
  })

  it('never calls send when origin is presentation_fallback', async () => {
    renderHook(() =>
      useDriverLocationReporter({
        enabled: true,
        uploadOrigin: 'presentation_fallback',
        accessToken: 'jwt-test',
        lat: 38.6973,
        lng: -9.30836,
        hasActiveTrip: false,
      })
    )

    await new Promise((r) => setTimeout(r, 50))
    expect(sendSpy).not.toHaveBeenCalled()
  })

  it('never calls send when origin is demo', async () => {
    renderHook(() =>
      useDriverLocationReporter({
        enabled: true,
        uploadOrigin: 'demo',
        accessToken: 'jwt-test',
        lat: 38.6973,
        lng: -9.30836,
        hasActiveTrip: true,
      })
    )

    await new Promise((r) => setTimeout(r, 50))
    expect(sendSpy).not.toHaveBeenCalled()
  })

  it('resumes send when origin changes from fallback to device_gps', async () => {
    const { rerender } = renderHook(
      (props: { origin: import('../services/driverLocationUpload').DriverLocationUploadOrigin }) =>
        useDriverLocationReporter({
          enabled: true,
          uploadOrigin: props.origin,
          accessToken: 'jwt-test',
          lat: 38.6973,
          lng: -9.30836,
          hasActiveTrip: false,
        }),
      { initialProps: { origin: 'presentation_fallback' as import('../services/driverLocationUpload').DriverLocationUploadOrigin } }
    )

    await new Promise((r) => setTimeout(r, 50))
    expect(sendSpy).not.toHaveBeenCalled()

    rerender({ origin: 'device_gps' })

    await waitFor(() =>
      expect(sendSpy).toHaveBeenCalledWith(38.6973, -9.30836, 'jwt-test', 'device_gps')
    )
  })
})
