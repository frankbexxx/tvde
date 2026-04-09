import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useDriverLocationReporter } from './useDriverLocationReporter'

const sendSpy = vi.fn().mockResolvedValue(undefined)

vi.mock('../services/locationService', () => ({
  sendDriverLocation: (...args: unknown[]) => sendSpy(...args),
}))

describe('useDriverLocationReporter', () => {
  beforeEach(() => {
    sendSpy.mockClear()
  })

  it('calls sendDriverLocation shortly after mount when enabled', async () => {
    renderHook(() =>
      useDriverLocationReporter({
        enabled: true,
        accessToken: 'jwt-test',
        lat: 1,
        lng: 2,
        hasActiveTrip: false,
      })
    )

    await waitFor(() => expect(sendSpy).toHaveBeenCalledWith(1, 2, 'jwt-test'))
  })

  it('does not send when disabled', () => {
    renderHook(() =>
      useDriverLocationReporter({
        enabled: false,
        accessToken: 'jwt-test',
        lat: 1,
        lng: 2,
        hasActiveTrip: true,
      })
    )

    expect(sendSpy).not.toHaveBeenCalled()
  })
})
