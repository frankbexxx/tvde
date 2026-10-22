import { describe, expect, it } from 'vitest'
import { resolvePaymentWebhookAnomaliesUxState } from './adminPaymentWebhookAnomaliesUx'
import type { PaymentWebhookAnomaliesHealthBlock } from '../../api/admin'
import { countCriticalHealthSignalRows } from './adminDashboardHelpers'
import type { SystemHealthResponse } from '../../api/admin'

const blockBase: PaymentWebhookAnomaliesHealthBlock = {
  persist_enabled: false,
  data_available: true,
  window_hours: 24,
  total_in_window: 0,
  counts_by_type: [],
  counts_by_severity: {},
  recent: [],
}

describe('resolvePaymentWebhookAnomaliesUxState (PR2)', () => {
  it('collection_disabled when flag off and zero rows', () => {
    expect(
      resolvePaymentWebhookAnomaliesUxState({ ...blockBase, persist_enabled: false }),
    ).toBe('collection_disabled')
  })

  it('collection_active_empty when flag on and zero rows', () => {
    expect(
      resolvePaymentWebhookAnomaliesUxState({ ...blockBase, persist_enabled: true }),
    ).toBe('collection_active_empty')
  })

  it('data_unavailable when table/read not available (not zero anomalies)', () => {
    expect(
      resolvePaymentWebhookAnomaliesUxState({
        ...blockBase,
        persist_enabled: true,
        data_available: false,
        total_in_window: 0,
      }),
    ).toBe('data_unavailable')
  })

  it('anomalies_present when rows in window (even if flag off)', () => {
    expect(
      resolvePaymentWebhookAnomaliesUxState({
        ...blockBase,
        persist_enabled: false,
        total_in_window: 2,
        recent: [
          {
            id: 'a',
            anomaly_type: 'webhook_payment_not_found',
            severity: 'warning',
            created_at: '2026-01-01T00:00:00+00:00',
            payment_intent_id: 'pi_x',
            trip_id: null,
            payment_id: null,
            event_type: null,
            stripe_event_id: 'evt_x',
            environment: 'test',
            stripe_mode: 'mock',
            payload: {},
          },
        ],
      }),
    ).toBe('anomalies_present')
  })
})

describe('critical health unchanged with webhook anomalies (Q4 A)', () => {
  it('does not count payment_webhook_anomalies toward critical rows', () => {
    const h: SystemHealthResponse = {
      status: 'ok',
      warnings: [],
      informational_warnings: [],
      trips_accepted_too_long: [],
      trips_ongoing_too_long: [],
      stuck_payments: [],
      drivers_unavailable_too_long: [],
      missing_payment_records: [],
      inconsistent_financial_state: [],
      payment_webhook_anomalies: {
        ...blockBase,
        data_available: true,
        persist_enabled: true,
        total_in_window: 5,
        counts_by_type: [{ anomaly_type: 'webhook_payment_not_found', count: 5 }],
        counts_by_severity: { warning: 5 },
        recent: [],
      },
    }
    expect(countCriticalHealthSignalRows(h)).toBe(0)
  })
})
