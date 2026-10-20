import type { RefundStatus } from '../api/trips'
import { formatMoneyEur } from '../i18n/format'

export function shouldShowRefund(
  status: RefundStatus | undefined | null,
  amount: number | undefined | null,
): boolean {
  if (status !== 'partial' && status !== 'full') return false
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return false
  return true
}

/** Linha única para passageiro (histórico lista + detalhe). */
export function formatRefundDisplayLine(
  status: RefundStatus | undefined | null,
  amount: number | undefined | null,
): string | null {
  if (!shouldShowRefund(status, amount)) return null
  const money = formatMoneyEur(amount!)
  if (status === 'full') return `Reembolso total: ${money}`
  return `Reembolso parcial: ${money}`
}

/** Estado legível para admin (sem códigos API). */
export function formatRefundStatusLabel(status: RefundStatus | undefined | null): string | null {
  if (status === 'full') return 'Reembolso total'
  if (status === 'partial') return 'Reembolso parcial'
  return null
}
