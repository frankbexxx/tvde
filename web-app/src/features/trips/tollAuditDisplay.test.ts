import { describe, expect, it } from 'vitest'
import {
  chargedTollsDisplay,
  formatDeltaOrDash,
  formatEuroOrDash,
  observedTollsDisplay,
  sanitizeTollAuditText,
} from './tollAuditDisplay'

describe('tollAuditDisplay (PORTAGENS F3)', () => {
  it('formats euros and dash for missing', () => {
    expect(formatEuroOrDash(0.4)).toBe('0.40 €')
    expect(formatEuroOrDash(null)).toBe('—')
    expect(formatEuroOrDash(undefined)).toBe('—')
  })

  it('formats delta with sign', () => {
    expect(formatDeltaOrDash(1.85)).toBe('+1.85 €')
    expect(formatDeltaOrDash(-0.3)).toBe('-0.30 €')
    expect(formatDeltaOrDash(null)).toBe('—')
  })

  it('prefers charged_tolls_amount over tolls_amount', () => {
    expect(chargedTollsDisplay({ charged_tolls_amount: 0.4, tolls_amount: 9 })).toBe('0.40 €')
    expect(chargedTollsDisplay({ tolls_amount: 0 })).toBe('0.00 €')
    expect(chargedTollsDisplay({})).toBe('—')
  })

  it('observed amount or status', () => {
    expect(observedTollsDisplay({ observed_tolls_amount: 2.25 })).toBe('2.25 €')
    expect(observedTollsDisplay({ observed_tolls_status: 'error' })).toBe('error')
    expect(observedTollsDisplay({})).toBe('—')
  })

  it('never leaves apiKey in display text', () => {
    expect(sanitizeTollAuditText('here?apiKey=super-secret')).toContain('[REDACTED]')
    expect(sanitizeTollAuditText('here?apiKey=super-secret')).not.toContain('super-secret')
  })
})
