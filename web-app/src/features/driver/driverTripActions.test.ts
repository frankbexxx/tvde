import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../api/trips', () => ({
  acceptTrip: vi.fn(),
  markArriving: vi.fn(),
  startTrip: vi.fn(),
  completeTrip: vi.fn(),
  cancelTripByDriver: vi.fn(),
}))

import * as trips from '../../api/trips'
import {
  driverPerformAccept,
  driverPerformCancel,
  driverPerformComplete,
  driverPerformStartFromAccepted,
  driverPerformStartFromArriving,
} from './driverTripActions'

const ok = (status: string) => ({ trip_id: 't1', status } as const)

beforeEach(() => {
  vi.mocked(trips.acceptTrip).mockResolvedValue(ok('accepted'))
  vi.mocked(trips.markArriving).mockResolvedValue(ok('arriving'))
  vi.mocked(trips.startTrip).mockResolvedValue(ok('ongoing'))
  vi.mocked(trips.completeTrip).mockResolvedValue(ok('completed'))
  vi.mocked(trips.cancelTripByDriver).mockResolvedValue(ok('cancelled'))
  vi.clearAllMocks()
})

describe('driverPerformAccept', () => {
  it('calls acceptTrip with trip id and token', async () => {
    await driverPerformAccept('abc', 'tok')
    expect(trips.acceptTrip).toHaveBeenCalledTimes(1)
    expect(trips.acceptTrip).toHaveBeenCalledWith('abc', 'tok')
  })
})

describe('driverPerformStartFromAccepted', () => {
  it('calls markArriving then startTrip in order', async () => {
    const order: string[] = []
    vi.mocked(trips.markArriving).mockImplementation(async () => {
      order.push('arriving')
      return ok('arriving')
    })
    vi.mocked(trips.startTrip).mockImplementation(async () => {
      order.push('start')
      return ok('ongoing')
    })
    await driverPerformStartFromAccepted('abc', 'tok')
    expect(trips.markArriving).toHaveBeenCalledWith('abc', 'tok')
    expect(trips.startTrip).toHaveBeenCalledWith('abc', 'tok')
    expect(order).toEqual(['arriving', 'start'])
  })
})

describe('driverPerformStartFromArriving', () => {
  it('calls startTrip only', async () => {
    await driverPerformStartFromArriving('abc', 'tok')
    expect(trips.startTrip).toHaveBeenCalledWith('abc', 'tok')
    expect(trips.markArriving).not.toHaveBeenCalled()
  })
})

describe('driverPerformComplete', () => {
  it('calls completeTrip', async () => {
    await driverPerformComplete('abc', 'tok')
    expect(trips.completeTrip).toHaveBeenCalledWith('abc', 'tok')
  })
})

describe('driverPerformCancel', () => {
  it('calls cancelTripByDriver', async () => {
    await driverPerformCancel('abc', 'tok')
    expect(trips.cancelTripByDriver).toHaveBeenCalledWith('abc', 'tok')
  })
})
