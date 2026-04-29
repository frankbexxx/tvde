import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getDriverVehicleCategories,
  setDriverVehicleCategories,
  type DriverVehicleCategory,
} from './driverVehicleCategories'

describe('driverVehicleCategories', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('defaults to x when storage empty', () => {
    expect(getDriverVehicleCategories()).toEqual(['x'])
  })

  it('persists selected categories', () => {
    const next: DriverVehicleCategory[] = ['x', 'pet', 'electric']
    setDriverVehicleCategories(next)
    expect(getDriverVehicleCategories()).toEqual(['x', 'pet', 'electric'])
  })

  it('keeps at least one category selected', () => {
    setDriverVehicleCategories([])
    expect(getDriverVehicleCategories()).toEqual(['x'])
  })
})

