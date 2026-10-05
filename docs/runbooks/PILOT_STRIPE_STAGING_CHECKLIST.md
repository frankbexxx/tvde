# Piloto V1 — Stripe Staging Readiness (checklist)

**Objectivo:** validar o fluxo com **Stripe Test keys** em staging.  
**Proibido nesta fase:** `sk_live` / `pk_live` / dinheiro real / Connect.

## Variáveis externas (nomes — sem valores)

**Backend (staging)**

- `ENVIRONMENT` ou `ENV` = `staging`
- `STRIPE_MOCK` = `false`
- `STRIPE_SECRET_KEY` = `sk_test_…`
- `STRIPE_WEBHOOK_SECRET` = `whsec_…` (endpoint Test apontado a `https://<staging-api>/webhooks/stripe`)

**Web-app (build staging)**

- `VITE_STRIPE_MOCK` = `false`
- `VITE_STRIPE_PUBLISHABLE_KEY` = `pk_test_…`

## Fluxo esperado (test mode)

`pedido → accept (PI) → passageiro guarda cartão (attach) → viagem → complete (update amount → confirm → captura) → webhook → Payment.succeeded`

Cartões de teste Stripe: normal (`4242…`), 3DS (`4000000000003220` ou documentação Stripe actual).

## Checklist de smoke (humano em staging)

| Cenário | Resultado | Notas |
|---------|-----------|-------|
| A. Cartão normal | NOT RUN até secrets staging | |
| B. Cartão 3DS | NOT RUN até secrets staging | SCA no confirm do complete / handleCardAction |
| C. Cancel antes de captura | NOT RUN | Taxa 3 € registada, não cobrada |
| D. Webhook | NOT RUN | Assinatura + succeeded |
| E. Webhook retry | NOT RUN | Idempotência `evt_` |
| F. Falha captura | NOT RUN | Trip não completed; Admin vê processing |
| G. Completed + payment inconsistente | NOT RUN | Ver runbook reconciliação |
| H. Admin reconciliação | código PRONTO | Ops + detail |
| I. Refund manual test | procedimento PRONTO | Dashboard Test; app pode não reflectir |
| J. Logs/audit | código PRONTO | `payment_*` events sem secrets |

Actualizar esta tabela após smoke staging real.
