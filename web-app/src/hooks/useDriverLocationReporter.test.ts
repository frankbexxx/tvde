import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import {
  resetDriverLocationReporterDedupeForTests,
  useDriverLocationReporter,
} from './useDriverLocationReporter'

const sendSpy = vi.fn().mockResolvedValue(undefined)

vi.mock('../services/locationService', () => ({
  sendDriverLocation: (...args: unknown[]) => sendSpy(...args),
}))

describe('useDriverLocationReporter', () => {
  beforeEach(() => {
    sendSpy.mockClear()
    resetDriverLocationReporterDedupeForTests()
  })

  it('calls sendDriverLocation shortly after mount when enabled', async () => {
    renderHook(() =>
      useDriverLocationReporter({
        enabled: true,
        uploadOrigin: 'device_gps',
        accessToken: 'jwt-test',
        lat: 1,
        lng: 2,
        fixTimestampMs: 1_700_000_000_000,
        hasActiveTrip: false,
      })
    )

    await waitFor(() =>
      expect(sendSpy).toHaveBeenCalledWith(1, 2, 'jwt-test', 'device_gps', 1_700_000_000_000)
    )
  })

  it('does not send when disabled', () => {
    renderHook(() =>
      useDriverLocationReporter({
        enabled: false,
        uploadOrigin: 'device_gps',
        accessToken: 'jwt-test',
        lat: 1,
        lng: 2,
        fixTimestampMs: 1_700_000_000_000,
        hasActiveTrip: true,
      })
    )

    expect(sendSpy).not.toHaveBeenCalled()
  })

  it('uploads a newer fix with the same coordinates and ignores silence, duplicates, and older fixes', async () => {
    vi.useFakeTimers()
    const { rerender } = renderHook(
      (props: { lat: number; lng: number; fixTimestampMs: number; hasActiveTrip: boolean }) =>
        useDriverLocationReporter({
          enabled: true,
          uploadOrigin: 'device_gps',
          accessToken: 'jwt-test',
          lat: props.lat,
          lng: props.lng,
          fixTimestampMs: props.fixTimestampMs,
          hasActiveTrip: props.hasActiveTrip,
        }),
      { initialProps: { lat: 38.72, lng: -9.14, fixTimestampMs: 5_000, hasActiveTrip: false } }
    )

    await vi.waitFor(() => expect(sendSpy).toHaveBeenCalledTimes(1))
    expect(sendSpy).toHaveBeenLastCalledWith(38.72, -9.14, 'jwt-test', 'device_gps', 5_000)

    await vi.advanceTimersByTimeAsync(60_000)
    expect(sendSpy).toHaveBeenCalledTimes(1)

    rerender({ lat: 38.72, lng: -9.14, fixTimestampMs: 5_000, hasActiveTrip: false })
    expect(sendSpy).toHaveBeenCalledTimes(1)

    rerender({ lat: 38.8, lng: -9.2, fixTimestampMs: 4_000, hasActiveTrip: true })
    expect(sendSpy).toHaveBeenCalledTimes(1)

    rerender({ lat: 38.72, lng: -9.14, fixTimestampMs: 6_000, hasActiveTrip: true })
    await vi.waitFor(() => expect(sendSpy).toHaveBeenCalledTimes(2))
    expect(sendSpy).toHaveBeenLastCalledWith(38.72, -9.14, 'jwt-test', 'device_gps', 6_000)

    vi.useRealTimers()
  })

  it('posts the current fix immediately when reporting turns on', async () => {
    const { rerender } = renderHook(
      (props: { enabled: boolean }) =>
        useDriverLocationReporter({
          enabled: props.enabled,
          uploadOrigin: 'device_gps',
          accessToken: 'jwt-online',
          lat: 38.72,
          lng: -9.14,
          fixTimestampMs: 8_000,
          hasActiveTrip: false,
        }),
      { initialProps: { enabled: false } }
    )

    expect(sendSpy).not.toHaveBeenCalled()
    rerender({ enabled: true })
    await waitFor(() =>
      expect(sendSpy).toHaveBeenCalledWith(38.72, -9.14, 'jwt-online', 'device_gps', 8_000)
    )
  })

  it('posts the same fix again after going offline and back online', async () => {
    const { rerender } = renderHook(
      (props: { enabled: boolean }) =>
        useDriverLocationReporter({
          enabled: props.enabled,
          uploadOrigin: 'device_gps',
          accessToken: 'jwt-toggle',
          lat: 38.72,
          lng: -9.14,
          fixTimestampMs: 9_000,
          hasActiveTrip: false,
        }),
      { initialProps: { enabled: true } }
    )

    await waitFor(() => expect(sendSpy).toHaveBeenCalledTimes(1))
    rerender({ enabled: false })
    rerender({ enabled: true })
    await waitFor(() => expect(sendSpy).toHaveBeenCalledTimes(2))
    expect(sendSpy).toHaveBeenLastCalledWith(38.72, -9.14, 'jwt-toggle', 'device_gps', 9_000)
  })

  it('does not upload again when the dashboard remounts with the same fix', async () => {
    const props = {
      enabled: true,
      uploadOrigin: 'device_gps' as const,
      accessToken: 'jwt-remount',
      lat: 38.72,
      lng: -9.14,
      fixTimestampMs: 10_000,
      hasActiveTrip: false,
    }
    const first = renderHook(() => useDriverLocationReporter(props))
    await waitFor(() => expect(sendSpy).toHaveBeenCalledTimes(1))
    first.unmount()
    renderHook(() => useDriverLocationReporter(props))
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(sendSpy).toHaveBeenCalledTimes(1)
  })
})
