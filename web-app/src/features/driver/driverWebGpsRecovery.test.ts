import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  GPS_RECOVERY_BACKOFF_MS,
  GPS_RECOVERY_COOLDOWN_MS,
  GPS_RECOVERY_MAX_FAILURES,
  GPS_RECOVERY_OBSERVE_MS,
  GPS_RECOVERY_TIMEOUT_MS,
  GPS_RECOVERY_TRIGGER_AGE_MS,
  MATCHING_MAX_AGE_MS,
  gpsRecoveryAction,
  isNewerGpsTimestamp,
  isWebGpsRecoveryEnabled,
} from './driverWebGpsRecovery'
import { useDriverWebGpsRecovery } from './useDriverWebGpsRecovery'

const T0 = 1_700_000_000_000

function decision(
  overrides: Partial<Parameters<typeof gpsRecoveryAction>[0]> = {},
): 'request' | 'idle' {
  return gpsRecoveryAction({
    enabled: true,
    visible: true,
    inFlight: false,
    consecutiveFailures: 0,
    nowMs: T0,
    nextAttemptAtMs: null,
    waitingSinceMs: T0,
    lastFixTimestampMs: T0,
    ...overrides,
  })
}

describe('driver web GPS recovery decisions', () => {
  it('T1 asks for a reading when the last fix reaches 20s, before the 45s window', () => {
    expect(GPS_RECOVERY_TRIGGER_AGE_MS + GPS_RECOVERY_TIMEOUT_MS).toBeLessThan(MATCHING_MAX_AGE_MS)
    expect(decision({ lastFixTimestampMs: T0 - 19_000 })).toBe('idle')
    expect(decision({ lastFixTimestampMs: T0 - GPS_RECOVERY_TRIGGER_AGE_MS })).toBe('request')
    expect(decision({ lastFixTimestampMs: null, waitingSinceMs: T0 - GPS_RECOVERY_TRIGGER_AGE_MS })).toBe(
      'request',
    )
  })

  it('T2 rejects a timestamp that is not strictly newer', () => {
    expect(isNewerGpsTimestamp(5_000, 5_000)).toBe(false)
    expect(isNewerGpsTimestamp(5_000, 4_999)).toBe(false)
    expect(isNewerGpsTimestamp(5_000, 5_001)).toBe(true)
  })

  it('T4 stays idle when the driver is not operational', () => {
    expect(decision({ enabled: false, lastFixTimestampMs: T0 - 40_000 })).toBe('idle')
  })

  it('T5 does not start a periodic read while the tab is hidden', () => {
    expect(decision({ visible: false, lastFixTimestampMs: T0 - 40_000 })).toBe('idle')
  })

  it('T7 waits out the backoff and stops after the failure limit', () => {
    expect(decision({ nextAttemptAtMs: T0 + 1, lastFixTimestampMs: T0 - 40_000 })).toBe('idle')
    expect(
      decision({
        nextAttemptAtMs: T0,
        nowMs: T0 + GPS_RECOVERY_BACKOFF_MS,
        lastFixTimestampMs: T0 - 40_000,
      }),
    ).toBe('request')
    expect(
      decision({
        consecutiveFailures: GPS_RECOVERY_MAX_FAILURES,
        nextAttemptAtMs: T0 + GPS_RECOVERY_COOLDOWN_MS,
        lastFixTimestampMs: T0 - 40_000,
      }),
    ).toBe('idle')
    expect(
      decision({
        consecutiveFailures: GPS_RECOVERY_MAX_FAILURES,
        nextAttemptAtMs: T0,
        nowMs: T0 + GPS_RECOVERY_COOLDOWN_MS,
        lastFixTimestampMs: T0 - 40_000,
      }),
    ).toBe('request')
    expect(decision({ inFlight: true, lastFixTimestampMs: T0 - 40_000 })).toBe('idle')
  })

  it('T9 leaves native Android out of web recovery', () => {
    expect(
      isWebGpsRecoveryEnabled({
        reporting: true,
        nativePlatform: true,
        mock: false,
        demo: false,
      }),
    ).toBe(false)
    expect(
      isWebGpsRecoveryEnabled({
        reporting: true,
        nativePlatform: false,
        mock: false,
        demo: false,
      }),
    ).toBe(true)
    const cadence = readFileSync(
      resolve(__dirname, '../../../android/app/src/main/java/pt/vamula/app/location/DriverLocationCadence.java'),
      'utf8',
    )
    expect(cadence).toContain('INTERVAL_MILLIS = 10_000L')
    expect(cadence).toContain('MATCHING_MAX_AGE_MILLIS = 45_000L')
    expect(cadence).not.toContain('getCurrentPosition')
  })
})

describe('useDriverWebGpsRecovery', () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    })
  })

  function position(timestamp: number, lat = 38.72, lng = -9.14): GeolocationPosition {
    return {
      coords: {
        latitude: lat,
        longitude: lng,
        accuracy: 5,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        toJSON() {
          return {}
        },
      },
      timestamp,
      toJSON() {
        return {}
      },
    }
  }

  it('T1 and T3 request one fresh reading and adopt equal coordinates with a newer timestamp', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(T0)
    const adopt = vi.fn(() => true)
    const getCurrentPosition = vi.fn<Geolocation['getCurrentPosition']>((success) => {
      success(position(T0 - 10_000))
    })
    renderHook(() =>
      useDriverWebGpsRecovery({
        enabled: true,
        lastFixTimestampMs: T0 - GPS_RECOVERY_TRIGGER_AGE_MS,
        adoptFix: adopt,
        geolocation: { getCurrentPosition },
      }),
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(getCurrentPosition).toHaveBeenCalledTimes(1)
    expect(getCurrentPosition.mock.calls[0][2]).toMatchObject({
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: GPS_RECOVERY_TIMEOUT_MS,
    })
    expect(adopt).toHaveBeenCalledWith({
      lat: 38.72,
      lng: -9.14,
      timestamp: T0 - 10_000,
    })
  })

  it('T2 does not adopt a repeated timestamp', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(T0)
    const adopt = vi.fn(() => true)
    const stamp = T0 - 30_000
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success(position(stamp))
    })
    renderHook(() =>
      useDriverWebGpsRecovery({
        enabled: true,
        lastFixTimestampMs: stamp,
        adoptFix: adopt,
        geolocation: { getCurrentPosition },
      }),
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(adopt).not.toHaveBeenCalled()
  })

  it('T5 and T6 skip hidden tabs and read again when the tab returns', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(T0)
    let visibility: DocumentVisibilityState = 'hidden'
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibility,
    })

    const getCurrentPosition = vi.fn()
    const view = renderHook(
      (props: { enabled: boolean; lastFixTimestampMs: number }) =>
        useDriverWebGpsRecovery({
          enabled: props.enabled,
          lastFixTimestampMs: props.lastFixTimestampMs,
          adoptFix: () => true,
          geolocation: { getCurrentPosition },
        }),
      { initialProps: { enabled: true, lastFixTimestampMs: T0 - 40_000 } },
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(GPS_RECOVERY_OBSERVE_MS * 3)
    })
    expect(getCurrentPosition).not.toHaveBeenCalled()

    await act(async () => {
      visibility = 'visible'
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(getCurrentPosition).toHaveBeenCalledTimes(1)
    view.unmount()
  })

  it('T7 limits error retries', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(T0)
    const getCurrentPosition = vi.fn((_success: PositionCallback, error?: PositionErrorCallback | null) => {
      error?.({
        code: 3,
        message: 'timeout',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      })
    })
    const view = renderHook(() =>
      useDriverWebGpsRecovery({
        enabled: true,
        lastFixTimestampMs: T0 - 40_000,
        adoptFix: () => true,
        geolocation: { getCurrentPosition },
      }),
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(getCurrentPosition).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(GPS_RECOVERY_BACKOFF_MS)
    })
    expect(getCurrentPosition).toHaveBeenCalledTimes(2)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(GPS_RECOVERY_BACKOFF_MS)
    })
    expect(getCurrentPosition).toHaveBeenCalledTimes(3)
    expect(view.result.current.attention).toBe('cooldown')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(GPS_RECOVERY_COOLDOWN_MS - GPS_RECOVERY_OBSERVE_MS)
    })
    expect(getCurrentPosition).toHaveBeenCalledTimes(3)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(GPS_RECOVERY_OBSERVE_MS)
    })
    expect(getCurrentPosition).toHaveBeenCalledTimes(4)
    expect(view.result.current.attention).toBe('cooldown')
  })

  it('T4 stops requesting when reporting is turned off', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(T0)
    const getCurrentPosition = vi.fn()
    const view = renderHook(
      (props: { enabled: boolean }) =>
        useDriverWebGpsRecovery({
          enabled: props.enabled,
          lastFixTimestampMs: T0 - 40_000,
          adoptFix: () => true,
          geolocation: { getCurrentPosition },
        }),
      { initialProps: { enabled: true } },
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(getCurrentPosition).toHaveBeenCalledTimes(1)
    view.rerender({ enabled: false })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(GPS_RECOVERY_OBSERVE_MS * 4)
    })
    expect(getCurrentPosition).toHaveBeenCalledTimes(1)
  })

  it('T8 ignores a late reading after unmount or when disabled', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(T0)
    let success: PositionCallback | null = null
    const adopt = vi.fn(() => true)
    const getCurrentPosition = vi.fn((onSuccess: PositionCallback) => {
      success = onSuccess
    })
    const view = renderHook(
      (props: { enabled: boolean }) =>
        useDriverWebGpsRecovery({
          enabled: props.enabled,
          lastFixTimestampMs: T0 - 40_000,
          adoptFix: adopt,
          geolocation: { getCurrentPosition },
        }),
      { initialProps: { enabled: true } },
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    view.unmount()
    act(() => {
      success?.(positionStamp(T0))
    })
    expect(adopt).not.toHaveBeenCalled()
  })

  it('retries once after the cooldown without a visibility change and adopts a newer timestamp', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(T0)
    const adopt = vi.fn(() => true)
    let fail = true
    const getCurrentPosition = vi.fn((success: PositionCallback, error?: PositionErrorCallback | null) => {
      if (fail) {
        error?.({
          code: 3,
          message: 'timeout',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        })
        return
      }
      success(position(T0 + GPS_RECOVERY_BACKOFF_MS * 2 + GPS_RECOVERY_COOLDOWN_MS))
    })
    const view = renderHook(
      (props: { enabled: boolean; lastFixTimestampMs: number }) =>
        useDriverWebGpsRecovery({
          enabled: props.enabled,
          lastFixTimestampMs: props.lastFixTimestampMs,
          adoptFix: adopt,
          geolocation: { getCurrentPosition },
        }),
      { initialProps: { enabled: true, lastFixTimestampMs: T0 - 40_000 } },
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(GPS_RECOVERY_BACKOFF_MS * 2)
    })
    expect(getCurrentPosition).toHaveBeenCalledTimes(3)
    expect(view.result.current.attention).toBe('cooldown')

    fail = false
    await act(async () => {
      await vi.advanceTimersByTimeAsync(GPS_RECOVERY_COOLDOWN_MS)
    })
    expect(getCurrentPosition).toHaveBeenCalledTimes(4)
    const renewedAt = T0 + GPS_RECOVERY_BACKOFF_MS * 2 + GPS_RECOVERY_COOLDOWN_MS
    expect(adopt).toHaveBeenCalledWith({ lat: 38.72, lng: -9.14, timestamp: renewedAt })
    view.rerender({ enabled: true, lastFixTimestampMs: renewedAt })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(GPS_RECOVERY_OBSERVE_MS)
    })
    expect(getCurrentPosition).toHaveBeenCalledTimes(4)
    expect(view.result.current.attention).toBe('none')
  })

  it('does not read again while offline or hidden during the cooldown', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(T0)
    let visibility: DocumentVisibilityState = 'visible'
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibility,
    })
    const getCurrentPosition = vi.fn((_success: PositionCallback, error?: PositionErrorCallback | null) => {
      error?.({
        code: 3,
        message: 'timeout',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      })
    })
    const view = renderHook(
      (props: { enabled: boolean }) =>
        useDriverWebGpsRecovery({
          enabled: props.enabled,
          lastFixTimestampMs: T0 - 40_000,
          adoptFix: () => true,
          geolocation: { getCurrentPosition },
        }),
      { initialProps: { enabled: true } },
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(GPS_RECOVERY_BACKOFF_MS * 2)
    })
    expect(getCurrentPosition).toHaveBeenCalledTimes(3)

    view.rerender({ enabled: false })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(GPS_RECOVERY_COOLDOWN_MS)
    })
    expect(getCurrentPosition).toHaveBeenCalledTimes(3)

    view.rerender({ enabled: true })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(GPS_RECOVERY_BACKOFF_MS * 2)
    })
    const afterRestart = getCurrentPosition.mock.calls.length
    visibility = 'hidden'
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(GPS_RECOVERY_COOLDOWN_MS)
    })
    expect(getCurrentPosition).toHaveBeenCalledTimes(afterRestart)
  })

  it('does not start a second read while one is in flight', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(T0)
    const getCurrentPosition = vi.fn()
    renderHook(() =>
      useDriverWebGpsRecovery({
        enabled: true,
        lastFixTimestampMs: T0 - 40_000,
        adoptFix: () => true,
        geolocation: { getCurrentPosition },
      }),
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(GPS_RECOVERY_OBSERVE_MS * 4)
    })
    expect(getCurrentPosition).toHaveBeenCalledTimes(1)
  })

  it('lets a newer watch fix clear the cooldown without another read', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(T0)
    const getCurrentPosition = vi.fn((_success: PositionCallback, error?: PositionErrorCallback | null) => {
      error?.({
        code: 3,
        message: 'timeout',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      })
    })
    const view = renderHook(
      (props: { lastFixTimestampMs: number }) =>
        useDriverWebGpsRecovery({
          enabled: true,
          lastFixTimestampMs: props.lastFixTimestampMs,
          adoptFix: () => true,
          geolocation: { getCurrentPosition },
        }),
      { initialProps: { lastFixTimestampMs: T0 - 40_000 } },
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(GPS_RECOVERY_BACKOFF_MS * 2)
    })
    expect(getCurrentPosition).toHaveBeenCalledTimes(3)
    expect(view.result.current.attention).toBe('cooldown')

    view.rerender({ lastFixTimestampMs: T0 + GPS_RECOVERY_BACKOFF_MS * 2 })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(GPS_RECOVERY_OBSERVE_MS)
    })
    expect(getCurrentPosition).toHaveBeenCalledTimes(3)
    expect(view.result.current.attention).toBe('none')
  })
})

function positionStamp(timestamp: number): GeolocationPosition {
  return {
    coords: {
      latitude: 1,
      longitude: 2,
      accuracy: 1,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      toJSON() {
        return {}
      },
    },
    timestamp,
    toJSON() {
      return {}
    },
  }
}
