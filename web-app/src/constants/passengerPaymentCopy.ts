/**
 * Copy sobre pagamento no fluxo passageiro.
 * O PaymentIntent é criado na aceitação pelo motorista (não no POST /trips).
 */

export const PASSENGER_PAYMENT_DISCLOSURE_CONFIRMING =
  'Pagamento por cartão. A autorização ou confirmação no banco só ocorre quando um motorista aceitar o pedido; confirmar aqui não cobra imediatamente o valor da viagem.'

export const PASSENGER_PAYMENT_DISCLOSURE_SEARCHING =
  'Tens o cartão acessível? Quando houver aceitação, o banco pode pedir confirmação extra (por exemplo 3-D Secure).'
