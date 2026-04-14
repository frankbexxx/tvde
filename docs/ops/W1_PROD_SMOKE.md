# W1 — smoke operacional (PROD / «teste real»)

Checklist **curta** para fechar a onda **W1** do [`TODOdoDIA.md`](../../TODOdoDIA.md) (cron + webhook + env). Não substitui o playbook completo **[A033-B](../prompts/A033_B_VALIDATION_HARDENING_PLAYBOOK.md)** — usa-o para contexto e red flags.

---

## 1. Pré-requisitos

- `git pull` na `main`; saber o **URL base da API** em produção (ex.: Render `tvde-api`).
- Acesso ao **Render** (env) e ao **Stripe Dashboard** (webhooks + logs).
- Valores de `CRON_SECRET` e `STRIPE_WEBHOOK_SECRET` **no painel** — **não** colar aqui nem no Git.

---

## 2. Variáveis de ambiente (olho humano)

| Variável | Verificar |
| -------- | --------- |
| `CRON_SECRET` | Definido; sem ele o endpoint de cron responde **503** (`CRON_SECRET not configured`). |
| `STRIPE_WEBHOOK_SECRET` | Definido (`whsec_…`); sem assinatura válida o webhook falha. |
| `STRIPE_SECRET_KEY` | Em prod com utilizadores reais: **live** (`sk_live_…`), não `sk_test_…`. |
| `DATABASE_URL` | Aponta para a BD de produção correcta. |

---

## 3. Cron — pedido manual

Equivalente ao **A033 Fase 4** e a [`docs/CRON_JOB_ORG_INSTRUCOES.md`](../CRON_JOB_ORG_INSTRUCOES.md).

**Query string (exemplo de forma, substituir host e segredo):**

```bash
curl -sS "https://<API_HOST>/cron/jobs?secret=<CRON_SECRET>"
```

**Ou header** (preferível em logs sem query visível em alguns proxies):

```bash
curl -sS "https://<API_HOST>/cron/jobs" -H "X-Cron-Secret: <CRON_SECRET>"
```

**Esperado:** HTTP **200** e corpo JSON com contagens (`timeouts`, `offers`, `cleanup`, … conforme versão actual da API). **401** = segredo errado; **503** = `CRON_SECRET` não configurado no servidor.

**Agendador externo:** confirma no cron-job.org (ou outro) que a URL bate **na mesma** base + segredo que testaste com `curl`.

---

## 4. Webhook Stripe

1. Stripe → **Developers → Webhooks** → endpoint `POST https://<API_HOST>/webhooks/stripe` **activo**.
2. Eventos mínimos alinhados ao código: `payment_intent.succeeded`, `payment_intent.payment_failed` (e falhas via `charge` tratadas no handler — ver [`docs/diagrams/03_PAYMENTS.md`](../diagrams/03_PAYMENTS.md)).
3. **Send test event** (ou tráfego controlado) e confirmar nos **logs** da API processamento sem erro; na BD, `stripe_webhook_events` com `evt_…` na primeira entrega e **idempotência** em reentrega.

---

## 5. Fecho W1 (critério «feito»)

- [ ] `curl` ao cron com 200 e JSON coerente.
- [ ] Agendador externo documentado (URL + frequência) e a bater o mesmo endpoint.
- [ ] Webhook Stripe: entrega testada + verificação de assinatura + pelo menos uma linha de evidência (log ou evento Stripe «delivered»).

Quando isto estiver **verdadeiro**, podes marcar W1 como fechada no teu ritual (e uma linha no **Fecho** do `TODOdoDIA`).

---

## 6. Parceiro / papelada (paralelo)

O envio do [`PARCEIRO_TVDE_CHECKLIST`](../legal/PARCEIRO_TVDE_CHECKLIST.md) a parceiros, contabilista e mentor **não bloqueia** W1 — mantém-se em curso até haver respostas para preencher §9.
