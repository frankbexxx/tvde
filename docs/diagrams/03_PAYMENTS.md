# Diagrama — pagamento (`PaymentStatus` + Stripe)

Estados internos em `PaymentStatus` (`enums.py`). A captura/autorização concreta segue a política documentada em `docs/PRICING_DECISION.md` e testes Stripe.

```mermaid
stateDiagram-v2
  [*] --> pending

  pending --> processing: intenção / confirmação\nem curso
  processing --> succeeded
  processing --> failed

  succeeded --> [*]
  failed --> [*]
```

## Fluxo cartão V1 (manual capture)

1. **Accept:** cria PaymentIntent `capture_method=manual`, `payment_method_types=["card"]`, amount **€0,50** (placeholder Stripe EUR). `Payment.status=processing`.
2. **Passageiro (Stripe real / staging test):** a API expõe `payment_intent_client_secret`; o Passageiro **anexa** um PaymentMethod (`POST /trips/{id}/payment-method`) **sem** confirmar o €0,50 — assim o amount ainda pode ser actualizado no complete.
3. **Complete:** calcula `final_price` → `update` amount → `confirm` (com PM anexado; se `requires_action` → 409 `payment_requires_action` para SCA no cliente) → `capture`. Sem PM → 409 `payment_method_required`.
4. **Webhook** `payment_intent.succeeded`: marca `Payment.succeeded` **só** se amount/currency coincidem com `final_price` (ou `total_amount`).
5. **Fail-closed:** PI em `requires_capture` com amount ≠ final (ex. placeholder ainda €0,50) → **não** capturar; log `payment_capture_blocked_amount_mismatch`; payment permanece `processing` para ops.

`ENABLE_CONFIRM_ON_ACCEPT` / confirm antecipado do placeholder: **continua desligado em prod e staging live** (bloqueio de early confirm). A exposição do `client_secret` em Stripe real serve para **attach**, não para confirmar o €0,50.

**MB WAY:** fase 2 — não usa este fluxo de hold; ver discovery A1.2.

**Piloto V1:** refunds manuais no Dashboard — [`docs/runbooks/PILOT_STRIPE_REFUND.md`](../runbooks/PILOT_STRIPE_REFUND.md). Inconsistências: [`docs/runbooks/PILOT_PAYMENT_RECONCILIATION.md`](../runbooks/PILOT_PAYMENT_RECONCILIATION.md).


## Fluxo externo (alto nível)

```mermaid
sequenceDiagram
  participant App as Web / API
  participant API as FastAPI
  participant S as Stripe

  App->>API: criar / confirmar pagamento\n(conforme endpoint)
  API->>S: API Stripe
  S-->>API: webhook (eventos)
  API->>API: idempotência + amount guard\n+ actualiza PaymentStatus
```

## Eventos Stripe tratados no webhook

Endpoint: `POST /webhooks/stripe` (`backend/app/api/routers/webhooks/stripe.py`). Só altera `Payment` quando existe linha com `stripe_payment_intent_id` = `pi_…` deduzido do evento. **Idempotência:** `stripe_event_id` (prefixo `evt_`) em `StripeWebhookEvent` — reentrega = ack 200 sem duplicar efeito.

| `event_type` (Stripe) | Efeito na nossa `Payment` |
| ----------------------- | ------------------------- |
| `payment_intent.succeeded` | → **succeeded** se amount/currency OK; senão log mismatch e **mantém** `processing` |
| `payment_intent.payment_failed` | → **failed** |
| `charge.payment_failed` | → **failed** (resolve `payment_intent` a partir do charge) |

Outros tipos: ack **200** sem mudar pagamento (ou log + skip se não houver `pi_` válido).

Admin reconcile (`stripe-sync` / single): a mesma regra — Stripe `succeeded` **não** basta sem amount/currency alinhados.

Índice: [README.md](README.md)
