import { describe, expect, it } from 'vitest'
import {
  PASSENGER_PAYMENT_DISCLOSURE_CONFIRMING,
  PASSENGER_PAYMENT_DISCLOSURE_SEARCHING,
} from './passengerPaymentCopy'

describe('passengerPaymentCopy', () => {
  it('has non-empty disclosure strings', () => {
    expect(PASSENGER_PAYMENT_DISCLOSURE_CONFIRMING.length).toBeGreaterThan(40)
    expect(PASSENGER_PAYMENT_DISCLOSURE_SEARCHING.length).toBeGreaterThan(20)
  })
})
