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
2. Webhook: a app **não** trata hoje um evento dedicado de refund para actualizar `Payment` — o estado interno pode continuar `succeeded`.  
3. Não “corrigir” a BD à mão sem procedimento. Registar o incidente e, se necessário, nota operacional no Admin.  
4. Informar o passageiro pelo canal de suporte.

## O que não fazer

- Não implementar botão Refund na app nesta fase.  
- Não usar Connect / payouts.  
- Não misturar chaves Test e Live.  
- Não expor secrets em tickets públicos.
