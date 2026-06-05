import { afterEach, describe, expect, it } from 'vitest'
import {
  getDriverNavAutoPickupOnAccept,
  setDriverNavAutoPickupOnAccept,
} from './driverNavAutoPickup'

describe('driverNavAutoPickup', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('defaults to false when storage empty', () => {
    expect(getDriverNavAutoPickupOnAccept()).toBe(false)
  })

  it('persists enabled preference', () => {
    setDriverNavAutoPickupOnAccept(true)
    expect(getDriverNavAutoPickupOnAccept()).toBe(true)
    expect(localStorage.getItem('tvde_driver_nav_auto_pickup_on_accept')).toBe('1')
  })

  it('persists disabled preference', () => {
    setDriverNavAutoPickupOnAccept(true)
    setDriverNavAutoPickupOnAccept(false)
    expect(getDriverNavAutoPickupOnAccept()).toBe(false)
  })
})
