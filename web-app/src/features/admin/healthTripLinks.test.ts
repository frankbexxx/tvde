import { describe, expect, it } from 'vitest'
import { tripIdFromHealthRow } from './healthTripLinks'

const T1 = '11111111-1111-4111-8111-111111111111'
const T2 = '22222222-2222-4222-8222-222222222222'

describe('tripIdFromHealthRow', () => {
  it('uses trip_id from stuck_payments shape', () => {
    expect(
      tripIdFromHealthRow({
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        trip_id: T1,
        status: 'processing',
      })
    ).toBe(T1)
  })

  it('uses id for accepted / ongoing trip rows', () => {
    expect(tripIdFromHealthRow({ id: T2, status: 'accepted', payment_id: null })).toBe(T2)
    expect(tripIdFromHealthRow({ id: T2, status: 'ongoing', payment_id: 'x' })).toBe(T2)
  })

  it('returns null for driver-only rows', () => {
    expect(
      tripIdFromHealthRow({
        driver_id: '33333333-3333-4333-8333-333333333333',
        is_available: false,
      })
    ).toBeNull()
  })

  it('returns null for non-uuid garbage', () => {
    expect(tripIdFromHealthRow({ trip_id: 'not-a-uuid' })).toBeNull()
  })
})
