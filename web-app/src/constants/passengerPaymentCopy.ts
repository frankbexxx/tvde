/**
 * Copy sobre pagamento no fluxo passageiro.
 * O PaymentIntent é criado na aceitação pelo motorista (não no POST /trips).
 *
 * Em STRIPE_MOCK (build-time via VITE_STRIPE_MOCK=true), trocamos o copy por
 * algo coerente com o ambiente — não há cartão nem banco neste fluxo.
 */

const STRIPE_MOCK = import.meta.env.VITE_STRIPE_MOCK === 'true'

export const PASSENGER_PAYMENT_DISCLOSURE_CONFIRMING = STRIPE_MOCK
  ? 'Pagamento simulado neste ambiente. Não há cobrança nem cartão.'
  : 'Pagamento por cartão. A autorização ou confirmação no banco só ocorre quando um motorista aceitar o pedido; confirmar aqui não cobra imediatamente o valor da viagem.'

export const PASSENGER_PAYMENT_DISCLOSURE_SEARCHING = STRIPE_MOCK
  ? 'Pagamento simulado — não é preciso introduzir cartão neste ambiente.'
  : 'Tens o cartão acessível? Quando houver aceitação, o banco pode pedir confirmação extra (por exemplo 3-D Secure).'
