import i18n from '../i18n'

/**
 * Copy sobre pagamento no fluxo passageiro.
 * O PaymentIntent é criado na aceitação pelo motorista (não no POST /trips).
 */

const STRIPE_MOCK = import.meta.env.VITE_STRIPE_MOCK === 'true'

export function passengerPaymentDisclosureConfirming(): string {
  return STRIPE_MOCK
    ? i18n.t('passenger:payment.mockConfirming')
    : i18n.t('passenger:payment.cardConfirming')
}

export function passengerPaymentDisclosureSearching(): string {
  return STRIPE_MOCK
    ? i18n.t('passenger:payment.mockSearching')
    : i18n.t('passenger:payment.cardSearching')
}

/** @deprecated Use passengerPaymentDisclosureConfirming() */
export const PASSENGER_PAYMENT_DISCLOSURE_CONFIRMING = import.meta.env.VITE_STRIPE_MOCK === 'true'
  ? 'Pagamento simulado neste ambiente. Não há cobrança nem cartão.'
  : 'Pagamento por cartão. A autorização ou confirmação no banco só ocorre quando um motorista aceitar o pedido; confirmar aqui não cobra imediatamente o valor da viagem.'

/** @deprecated Use passengerPaymentDisclosureSearching() */
export const PASSENGER_PAYMENT_DISCLOSURE_SEARCHING = import.meta.env.VITE_STRIPE_MOCK === 'true'
  ? 'Pagamento simulado — não é preciso introduzir cartão neste ambiente.'
  : 'Tens o cartão acessível? Quando houver aceitação, o banco pode pedir confirmação extra (por exemplo 3-D Secure).'
