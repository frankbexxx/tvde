import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import {
  PASSENGER_SEARCH_FALLBACK_AFTER_SEC,
  passengerSearchFallbackVisible,
  usePassengerSearchFallback,
} from './usePassengerSearchFallback'

const T0 = new Date('2026-10-06T15:00:00.000Z').getTime()

describe('passengerSearchFallbackVisible', () => {
  it('shows only after the threshold since creation or last continue', () => {
    const at = (sec: number) => T0 + sec * 1000
    expect(passengerSearchFallbackVisible({ nowMs: at(24), createdAtMs: T0, continuedAtMs: null })).toBe(false)
    expect(passengerSearchFallbackVisible({ nowMs: at(25), createdAtMs: T0, continuedAtMs: null })).toBe(true)
    expect(passengerSearchFallbackVisible({ nowMs: at(40), createdAtMs: T0, continuedAtMs: at(30) })).toBe(false)
    expect(passengerSearchFallbackVisible({ nowMs: at(55), createdAtMs: T0, continuedAtMs: at(30) })).toBe(true)
  })

  it('never shows for an unparseable creation time', () => {
    expect(passengerSearchFallbackVisible({ nowMs: T0, createdAtMs: Number.NaN, continuedAtMs: null })).toBe(false)
  })
})

describe('usePassengerSearchFallback', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(T0)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  const createdAtIso = new Date(T0).toISOString()

  it('G1: a long wait only flips the notice — it keeps reporting the same trip for minutes', () => {
    const { result } = renderHook(() =>
      usePassengerSearchFallback({ tripId: 't1', createdAtIso, searching: true })
    )
    expect(result.current.showFallback).toBe(false)
    act(() => {
      vi.advanceTimersByTime(PASSENGER_SEARCH_FALLBACK_AFTER_SEC * 1000)
    })
    expect(result.current.showFallback).toBe(true)
    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000)
    })
    expect(result.current.showFallback).toBe(true)
  })

  it('G2: continue waiting hides the notice for the same trip and it returns after another threshold', () => {
    const { result } = renderHook(() =>
      usePassengerSearchFallback({ tripId: 't1', createdAtIso, searching: true })
    )
    act(() => {
      vi.advanceTimersByTime(30_000)
    })
    expect(result.current.showFallback).toBe(true)
    act(() => {
      result.current.continueWaiting()
    })
    expect(result.current.showFallback).toBe(false)
    act(() => {
      vi.advanceTimersByTime((PASSENGER_SEARCH_FALLBACK_AFTER_SEC - 1) * 1000)
    })
    expect(result.current.showFallback).toBe(false)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.showFallback).toBe(true)
  })

  it('a continue for another trip does not suppress the notice', () => {
    const { result, rerender } = renderHook(
      (p: { tripId: string }) => usePassengerSearchFallback({ tripId: p.tripId, createdAtIso, searching: true }),
      { initialProps: { tripId: 't1' } }
    )
    act(() => {
      vi.advanceTimersByTime(30_000)
      result.current.continueWaiting()
    })
    rerender({ tripId: 't2' })
    expect(result.current.showFallback).toBe(true)
  })

  it('stays hidden when not searching', () => {
    const { result } = renderHook(() =>
      usePassengerSearchFallback({ tripId: 't1', createdAtIso, searching: false })
    )
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(result.current.showFallback).toBe(false)
  })
})
