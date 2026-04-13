# A033-B — Validation & hardening (playbook real)

## Objetivo

Provar que o sistema em **produção** é **confiável**, **consistente** e **operável** — não implementar features novas.

**Relacionado:** [`docs/TODO_CODIGO_TVDE.md`](../TODO_CODIGO_TVDE.md) (seção PROD_VALIDATION), [`OPERATION_CHECKLIST.md`](../ops/OPERATION_CHECKLIST.md), [`docs/CRON_JOB_ORG_INSTRUCOES.md`](../CRON_JOB_ORG_INSTRUCOES.md).

---

## Fase 1 — Snapshot (≈2 min, obrigatório)

```bash
git fetch
git status
```

**Critério:** alinhado com `origin/main`; sem alterações locais indesejadas (ou saber o que está pendente).

---

## Fase 2 — Env check (Render)

**Onde:** Render → serviço **tvde-api** (ou nome equivalente) → **Environment**.

### Confirmar (valores reais, não commitar no repo)

| Variável                      | Notas                                                         |
| ----------------------------- | ------------------------------------------------------------- |
| `DATABASE_URL`                | Postgres correto; não placeholder                             |
| `STRIPE_SECRET_KEY`           | **`sk_live_...`** em produção                                 |
| `STRIPE_WEBHOOK_SECRET`       | **`whsec_...`** preenchido                                    |
| `ENV` ou política equivalente | Produção real (ex. `production` / `prod` conforme `Settings`) |
| `CRON_SECRET`                 | Definido; endpoint `/cron/jobs` sem secret → 503              |

### Red flags

- `sk_test_...` em ambiente que serve utilizadores reais
- `STRIPE_WEBHOOK_SECRET` vazio em prod
- `DATABASE_URL` apontar para BD errada / local

**Execução:** humano no dashboard. O agente **não** tem credenciais Render; reportar resultado textualmente antes de avançar.

---

## Fase 3 — Webhook (crítico)

### 3.1 Endpoint

`https://<teu-api>/webhooks/stripe` (método **POST** no Stripe; path conforme `main.py`).

### 3.2 Stripe Dashboard

**Developers → Webhooks**

- Endpoint **ativo**
- Eventos mínimos: `payment_intent.succeeded`, `payment_intent.payment_failed`

### 3.3 Teste real

No Stripe: **Send test event** (ou evento real em modo controlado).

**Esperado:** backend recebe; logs com processamento; estado na BD coerente com o evento.

---

## Fase 4 — Cron job

### 4.1 Teste manual

```bash
curl "https://<api>/cron/jobs?secret=<CRON_SECRET>"
```

**Esperado:** resposta OK (ex. 200); logs com execução (timeouts, expiry, cleanup conforme implementação).

### 4.2 Validar efeitos

- Ofertas expiram como esperado?
- Estados de viagem / redispatch coerentes?

### 4.3 Agendamento

Garantir job externo: **cron-job.org**, **GitHub Actions** (scheduled), **Render cron**, etc. — frequência sugerida 30–60 s (ver `OPERATION_CHECKLIST.md`).

---

## Fase 5 — E2E real (momento da verdade)

**Meios:** 2 dispositivos ou 2 browsers (passageiro + motorista).

**Fluxo:** criar trip → motorista aceita → iniciar → terminar.

**Validar 3 eixos:**

1. **BD:** `trip` → estado terminal coerente (ex. `completed`)
2. **Stripe:** PaymentIntent → `succeeded` (ou fluxo capturado conforme modelo)
3. **Webhook:** atualização de estado **via** webhook Stripe, não só manipulação manual no backend

---

## Fase 6 — Migrações

Checklist:

- **A025** aplicado em **PROD**?
- Constraint **única** em `stripe_payment_intent_id` (nullable-safe) ativa?
- Teste rápido: tentativa de segundo pagamento com mesmo PI onde deve falhar / rejeitar
- Query: sem duplicados de `stripe_payment_intent_id` não nulo

Script de referência: `backend/sql/a025_payments_stripe_pi_unique.sql`

---

## Fase 7 — Backup mínimo

```bash
pg_dump "<DATABASE_URL>" > backup_YYYYMMDD.sql
```

Guardar em local seguro. Opcional: restore numa BD vazia local e validar.

---

## Fase 8 — Hardening final (checklist)

- CORS **restrito** em prod (não `*` com credentials indevidas — ver política A023)
- Endpoints **dev** desligados em produção
- Tokens JWT válidos / expiração aceitável
- Logs **sem** secrets nem PII desnecessária

---

## Fase 9 — System health

`GET /admin/system-health` com JWT **admin**.

**Esperado:** `stuck_payments` vazio ou 0; sem erros críticos listados.

---

## Critério de sucesso (A033-B passa)

| #   | Item                    |
| --- | ----------------------- |
| ✔   | Webhook funciona (real) |
| ✔   | Cron funciona (real)    |
| ✔   | E2E funciona (real)     |
| ✔   | Pagamentos consistentes |
| ✔   | Sem estados presos      |

## Se falhar

**Não avançar** com features novas. **Não ignorar.** Corrigir → repetir A033-B.

---

## Modo de execução (com agente)

1. Agente executa **Fase 1** no repo.
2. Humano executa **Fase 2** no Render e **reporta** (sem colar secrets completos no chat; basta “ok / red flag X”).
3. Só depois se avança fase a fase conforme orientação — **não saltar** para o fim sem validar cada bloco.

---

## Agora (entrada padrão)

👉 **Fase 2 — Env check (Render)** (humano), após Fase 1 verde no Git.

---

**FIM**
