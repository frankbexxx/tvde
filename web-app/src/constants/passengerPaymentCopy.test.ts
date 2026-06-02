import { describe, expect, it } from 'vitest'
import {
  passengerPaymentDisclosureConfirming,
  passengerPaymentDisclosureSearching,
} from './passengerPaymentCopy'

describe('passengerPaymentCopy', () => {
  it('has non-empty disclosure strings', () => {
    expect(passengerPaymentDisclosureConfirming().length).toBeGreaterThan(40)
    expect(passengerPaymentDisclosureSearching().length).toBeGreaterThan(20)
  })
})
