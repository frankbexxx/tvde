# Piloto V1 — Refund manual (Stripe)

**Âmbito:** Piloto comercial V1.  
**Regra:** refunds **não** existem na app — só no Stripe Dashboard (test ou live, conforme o ambiente).

## Quando usar

- Passageiro pede reembolso justificado após cobrança.  
- Cobrança indevida / valor errado confirmado pela operação.  
- Incidente de suporte com PaymentIntent `succeeded` e acordo de reembolso.

## Quem pode

- Operação / Admin com acesso ao Stripe Dashboard da conta correcta (**Test** vs **Live**).  
- Não partilhar chaves Stripe; usar o Dashboard com conta pessoal autorizada.

## Como identificar o pagamento

1. Abrir a viagem no **Admin → Viagens**.  
2. Anotar: referência da viagem, estado da viagem, estado do pagamento, **Payment Intent** (`pi_…`) se visível.  
3. Confirmar o valor cobrado (preço final da viagem).  
4. Abrir o mesmo `pi_…` no Stripe Dashboard (modo Test/Live correspondente).

## Como fazer o refund

1. Stripe Dashboard → Payment → PaymentIntent / Charge correcto.  
2. Confirmar valor e moeda (EUR).  
3. **Refund** (parcial ou total conforme acordo).  
4. Registar o motivo no Dashboard (campo de nota Stripe) **e** no canal interno de suporte (referência da viagem + motivo + valor).

## O que verificar depois

1. Stripe: Charge/PaymentIntent reflecte refund.  
2. Webhook (V1): a app sincroniza **`charge.refunded`** → `payments.refunded_amount` + `refund_status` derivado na API. **`Payment.status` mantém-se** (ex.: `succeeded` após reembolso total).  
3. **Pré-condição smoke / staging:** o endpoint  
   `https://tvde-staging-api.onrender.com/webhooks/stripe`  
   deve estar subscrito a **`charge.refunded`** no Stripe Dashboard (Test) — **não assumir** que já está activo; confirmar manualmente antes do smoke I′.  
4. Eventos `refund.created` / `refund.updated` / `refund.failed` **não** actualizam a BD (fonte canónica V1 = **`charge.refunded`** apenas).  
5. Reconcile admin **não** substitui webhook para refunds (fase posterior).  
6. Informar o passageiro pelo canal de suporte (UI dedicada a refunds = fase posterior).

## O que não fazer

- Não implementar botão Refund na app nesta fase.  
- Não usar Connect / payouts.  
- Não misturar chaves Test e Live.  
- Não expor secrets em tickets públicos.
