import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  PASSENGER_STATUS_PUSH_DOM_EVENT,
  PASSENGER_STATUS_PUSH_STORAGE_KEY,
  applyTripStatusPushNavigation,
  noteForegroundTripStatusPush,
  takePassengerTerminalPush,
} from './passengerStatusPush'

describe('passengerStatusPush', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.stubGlobal('location', { pathname: '/driver', assign: vi.fn() })
  })

  it('foreground não navega', () => {
    expect(
      noteForegroundTripStatusPush({ event: 'trip_status', trip_id: 't1', status: 'ongoing' })
    ).toBe('noted')
    expect(location.assign).not.toHaveBeenCalled()
    expect(sessionStorage.getItem(PASSENGER_STATUS_PUSH_STORAGE_KEY)).toBeNull()
  })

  it('toque activo abre /passenger e não marca a viagem como terminal', () => {
    expect(
      applyTripStatusPushNavigation({ event: 'trip_status', trip_id: 't1', status: 'accepted' })
    ).toBe('passenger')
    expect(location.assign).toHaveBeenCalledWith('/passenger')
    expect(takePassengerTerminalPush()).toBeNull()
  })

  it('toque terminal já em /passenger pede o histórico sem recarregar', () => {
    vi.stubGlobal('location', { pathname: '/passenger', assign: vi.fn() })
    const seen = vi.fn()
    window.addEventListener(PASSENGER_STATUS_PUSH_DOM_EVENT, seen)
    expect(
      applyTripStatusPushNavigation({ event: 'trip_status', trip_id: 't9', status: 'completed' })
    ).toBe('passenger')
    expect(location.assign).not.toHaveBeenCalled()
    expect(seen).toHaveBeenCalledOnce()
    expect(takePassengerTerminalPush()).toEqual({ tripId: 't9', status: 'completed' })
    expect(takePassengerTerminalPush()).toBeNull()
    window.removeEventListener(PASSENGER_STATUS_PUSH_DOM_EVENT, seen)
  })

  it('payload desconhecido ou sem viagem é ignorado', () => {
    expect(applyTripStatusPushNavigation({ event: 'trip_status', status: 'cancelled' })).toBe('ignored')
    expect(applyTripStatusPushNavigation({ event: 'trip_status', trip_id: 't1', status: 'requested' })).toBe(
      'ignored'
    )
    expect(noteForegroundTripStatusPush({ event: 'other' })).toBe('ignored')
    expect(location.assign).not.toHaveBeenCalled()
  })
})
