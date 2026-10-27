import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { OEIRAS_FALLBACK, useGeolocation } from './useGeolocation'

describe('useGeolocation upload origin (G2-DRV-GPS-08)', () => {
  const watchCallbacks: {
    success?: PositionCallback
    error?: PositionErrorCallback
  } = {}

  const clearWatch = vi.fn()

  beforeEach(() => {
    watchCallbacks.success = undefined
    watchCallbacks.error = undefined
    clearWatch.mockClear()
    sessionStorage.clear()
    vi.stubGlobal('navigator', {
      geolocation: {
        watchPosition: (success: PositionCallback, error?: PositionErrorCallback) => {
          watchCallbacks.success = success
          watchCallbacks.error = error
          return 1
        },
        clearWatch,
      },
    })
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  function coords(lat: number, lng: number): GeolocationCoordinates {
    return {
      latitude: lat,
      longitude: lng,
      accuracy: 8,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      toJSON() {
        return {}
      },
    }
  }

  function position(lat: number, lng: number): GeolocationPosition {
    return {
      coords: coords(lat, lng),
      timestamp: Date.now(),
      toJSON() {
        return {}
      },
    }
  }

  it('marks presentation_fallback when geolocation errors', async () => {
    const { result } = renderHook(() =>
      useGeolocation({ mockRole: 'driver', watchEnabled: true })
    )

    await act(async () => {
      watchCallbacks.error?.({
        code: 1,
        message: 'denied',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      })
    })

    await waitFor(() => {
      expect(result.current.usedFallback).toBe(true)
      expect(result.current.locationOrigin).toBe('presentation_fallback')
      expect(result.current.position).toEqual({
        lat: OEIRAS_FALLBACK.lat,
        lng: OEIRAS_FALLBACK.lng,
      })
    })
  })

  it('marks device_gps after successful fix (including at Oeiras coordinates)', async () => {
    const { result } = renderHook(() =>
      useGeolocation({ mockRole: 'driver', watchEnabled: true })
    )

    await act(async () => {
      watchCallbacks.success?.(position(OEIRAS_FALLBACK.lat, OEIRAS_FALLBACK.lng))
    })

    await waitFor(() => {
      expect(result.current.locationOrigin).toBe('device_gps')
      expect(result.current.usedFallback).toBe(false)
    })
  })

  it('recovers origin to device_gps after fallback when GPS returns', async () => {
    sessionStorage.setItem('tvde_geolocation_failed', '1')
    const { result } = renderHook(() =>
      useGeolocation({ mockRole: 'driver', watchEnabled: true })
    )

    await waitFor(() => {
      expect(result.current.locationOrigin).toBe('presentation_fallback')
    })

    await act(async () => {
      watchCallbacks.success?.(position(38.72, -9.14))
    })

    await waitFor(() => {
      expect(result.current.locationOrigin).toBe('device_gps')
      expect(result.current.usedFallback).toBe(false)
    })
  })
})
