import type { PaymentWebhookAnomaliesHealthBlock } from '../../api/admin'

export type PaymentWebhookAnomaliesUxState =
  | 'collection_disabled'
  | 'collection_active_empty'
  | 'anomalies_present'
  | 'data_unavailable'

export function resolvePaymentWebhookAnomaliesUxState(
  block: PaymentWebhookAnomaliesHealthBlock | null | undefined,
): PaymentWebhookAnomaliesUxState | null {
  if (!block) return null
  if (block.data_available === false) return 'data_unavailable'
  if (block.total_in_window > 0) return 'anomalies_present'
  if (block.persist_enabled) return 'collection_active_empty'
  return 'collection_disabled'
}
