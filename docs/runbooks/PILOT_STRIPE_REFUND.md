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

---

## Smoke I′ (STAGING) — sync webhook **PASS** · 2026-10-20

Validação pós-merge **B4 F1/F2** ([PR #761](https://github.com/frankbexxx/tvde/pull/761)): refund manual Stripe TEST → **`charge.refunded`** → webhook STAGING → BD/API.

| Campo | Valor |
|-------|--------|
| **Trip** | `2bf290b8-af20-45fe-8a94-9f088d7aec03` |
| **Payment** | `93332b24-f8ee-4f10-a491-7ec550b16fa1` |
| **PaymentIntent** | `pi_3USbkn8jcCqT4zTo1yNByk6r` |
| **Stripe event** | `evt_3USbkn8jcCqT4zTo1nVuAYkt` |
| **Valor** | **4,50 EUR** (refund total manual Dashboard TEST) |

### Antes do refund

| Entidade | Estado |
|----------|--------|
| Trip | `completed` · `final_price` = 4,50 |
| Payment | `succeeded` · `refunded_amount` = 0 |

### Depois do refund (BD/API)

| Entidade | Estado |
|----------|--------|
| Trip | `completed` · `final_price` = 4,50 (**inalterado**) |
| Payment | `succeeded` (**inalterado**) · `refunded_amount` = 4,50 · `refund_status` derivado = **`full`** |

### Log estruturado (webhook)

Evento `stripe_webhook_payment_refunded` — campos observados:

- `previous_refunded_amount` = 0,0  
- `stripe_refunded_amount` = 4,5  
- `refunded_amount_after` = 4,5  
- `refund_status` = `full`  
- `payment_status` = `succeeded`  
- `changed` = `True`

### Cadeia validada

`Stripe refund` → `charge.refunded` → webhook STAGING (assinatura OK) → Charge → PaymentIntent → Payment local → API/modelo reflecte refund **sem** alterar Trip/Payment status originais.

### Critérios técnicos (PASS)

- [x] Webhook `charge.refunded` activo em STAGING  
- [x] Assinatura Stripe validada  
- [x] Mapping Charge → PaymentIntent → Payment  
- [x] Idempotência por `stripe_event_id`  
- [x] `amount_refunded` sincronizado em `payments.refunded_amount`  
- [x] Refund total suportado (`refund_status` = full)  
- [x] `Payment.status` permanece `succeeded`  
- [x] Trip permanece `completed`; `final_price` inalterado  
- [x] Sem alteração automática de comissão/payout  
- [x] Logs estruturados existentes  

### Notas de fechamento (**STRIPE-LIVE-02**)

- **Fechamento técnico (2026-10-20):** sync Stripe → webhook → BD/API — **concluído** em STAGING (smoke I′).  
- **Fora de scope deste fechamento:** UI passageiro/admin de refund (fase **F3**); botão Refund / refund initiation no Admin; modelo/tabela Refund dedicada; alteração de `PaymentStatus`; fiscal/nota de crédito (decisão contabilística separada — ver Q-EXT-FIS-005); reconcile admin **refund-aware** (fase posterior se prevista).

### Histórico — smoke I (2026-10-19)

Smoke **I** na viagem `390f3924-…` confirmou o **gap** pré-F1/F2 (refund Stripe OK; BD sem `refunded_amount`). Ver [`PILOT_STRIPE_STAGING_CHECKLIST.md`](PILOT_STRIPE_STAGING_CHECKLIST.md) §I.
