import { apiFetch } from './client'

export type PassengerPaymentMethod = {
  id: string
  payment_method_id: string
  brand: string
  last4: string
  exp_month?: number | null
  exp_year?: number | null
  is_default: boolean
}

export type SetupIntentResponse = {
  customer_id: string
  setup_intent_id: string
  client_secret: string
}

export async function createPaymentSetupIntent(
  token: string
): Promise<SetupIntentResponse> {
  return apiFetch<SetupIntentResponse>('/payments/setup-intent', {
    method: 'POST',
    token,
  })
}

export async function listPaymentMethods(
  token: string
): Promise<PassengerPaymentMethod[]> {
  const res = await apiFetch<{ methods: PassengerPaymentMethod[] }>(
    '/payments/methods',
    { method: 'GET', token }
  )
  return res.methods ?? []
}

export async function getDefaultPaymentMethod(
  token: string
): Promise<PassengerPaymentMethod | null> {
  try {
    return await apiFetch<PassengerPaymentMethod>('/payments/methods/default', {
      method: 'GET',
      token,
    })
  } catch (e) {
    const err = e as { status?: number; detail?: string }
    if (err?.status === 404 || err?.detail === 'payment_method_required') return null
    throw e
  }
}

export async function registerPaymentMethodFromSetupIntent(
  token: string,
  setupIntentId: string
): Promise<PassengerPaymentMethod> {
  return apiFetch<PassengerPaymentMethod>('/payments/methods', {
    method: 'POST',
    token,
    body: JSON.stringify({ setup_intent_id: setupIntentId }),
  })
}

export async function setDefaultPaymentMethod(
  token: string,
  methodId: string
): Promise<PassengerPaymentMethod> {
  return apiFetch<PassengerPaymentMethod>(
    `/payments/methods/${encodeURIComponent(methodId)}/default`,
    { method: 'POST', token }
  )
}

export async function deletePaymentMethod(
  token: string,
  methodId: string
): Promise<void> {
  await apiFetch<void>(`/payments/methods/${encodeURIComponent(methodId)}`, {
    method: 'DELETE',
    token,
  })
}

export function formatPaymentMethodLabel(m: Pick<PassengerPaymentMethod, 'brand' | 'last4'>): string {
  const brand = (m.brand || 'Cartão').replace(/^./, (c) => c.toUpperCase())
  return `${brand} •••• ${m.last4}`
}
