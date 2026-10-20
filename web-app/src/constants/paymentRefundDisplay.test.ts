import { beforeEach, describe, expect, it } from 'vitest'
import i18n from '../i18n'
import {
  formatRefundDisplayLine,
  formatRefundStatusLabel,
  shouldShowRefund,
} from './paymentRefundDisplay'

describe('paymentRefundDisplay', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('pt')
  })

  it('shouldShowRefund is false for none and zero', () => {
    expect(shouldShowRefund('none', 4.5)).toBe(false)
    expect(shouldShowRefund('full', 0)).toBe(false)
    expect(shouldShowRefund('partial', -1)).toBe(false)
    expect(formatRefundDisplayLine('none', 4.5)).toBeNull()
    expect(formatRefundDisplayLine('full', 0)).toBeNull()
  })

  it('formats partial refund line in EUR PT', () => {
    expect(formatRefundDisplayLine('partial', 2)).toBe('Reembolso parcial: 2,00\u00a0€')
  })

  it('formats full refund line in EUR PT', () => {
    expect(formatRefundDisplayLine('full', 4.5)).toBe('Reembolso total: 4,50\u00a0€')
  })

  it('formatRefundStatusLabel returns human labels only', () => {
    expect(formatRefundStatusLabel('none')).toBeNull()
    expect(formatRefundStatusLabel('partial')).toBe('Reembolso parcial')
    expect(formatRefundStatusLabel('full')).toBe('Reembolso total')
  })
})
