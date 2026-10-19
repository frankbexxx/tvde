import { describe, expect, it } from 'vitest'
import {
  formatPaymentRequiresActionDriverMessage,
  isPaymentRequiresActionDetail,
  resolveApiErrorDetail,
} from './apiErrors'

describe('payment_requires_action (STAGING complete shape)', () => {
  it('detects string detail from FastAPI body', () => {
    expect(isPaymentRequiresActionDetail('payment_requires_action')).toBe(true)
  })

  it('detects nested detail object', () => {
    expect(isPaymentRequiresActionDetail({ detail: 'payment_requires_action' })).toBe(true)
  })

  it('resolveApiErrorDetail never returns raw code', () => {
    const msg = resolveApiErrorDetail('payment_requires_action')
    expect(msg).not.toBe('payment_requires_action')
    expect(msg).toContain('Pagamento por autenticar')
    expect(msg).toContain('O passageiro precisa de autenticar')
  })

  it('formatPaymentRequiresActionDriverMessage matches driver copy', () => {
    const msg = formatPaymentRequiresActionDriverMessage()
    expect(msg).toContain('Pagamento por autenticar')
    expect(msg).toContain('O passageiro precisa de autenticar')
  })
})
