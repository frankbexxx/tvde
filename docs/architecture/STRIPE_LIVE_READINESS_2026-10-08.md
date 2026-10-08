# Stripe Live — readiness (auditoria 2026-10-08)

**Tipo:** factos técnicos e operacionais confirmados no repo  
**Modo:** read-only persistido · **sem activação Live** · **sem alteração de código nesta tarefa**  
**Contexto:** fase controlada inicial **sem** Stripe Live; Live só após GO explícito + decisões externas.

**Referências:** [`docs/diagrams/03_PAYMENTS.md`](../diagrams/03_PAYMENTS.md) · [`docs/runbooks/PILOT_STRIPE_STAGING_CHECKLIST.md`](../runbooks/PILOT_STRIPE_STAGING_CHECKLIST.md) · [`docs/runbooks/PILOT_PAYMENT_RECONCILIATION.md`](../runbooks/PILOT_PAYMENT_RECONCILIATION.md) · [`docs/runbooks/PILOT_STRIPE_REFUND.md`](../runbooks/PILOT_STRIPE_REFUND.md) · [`docs/env/ENV_SINGLE_REALITY.md`](../env/ENV_SINGLE_REALITY.md)

---

## 1. Estado geral

| Área | Classificação |
|------|---------------|
| PaymentIntent | **READY** |
| Manual capture | **READY** |
| Webhook principal | **READY** (código) · **PARCIAL** (configuração endpoint/secret **Live** no Stripe + Render) |
| Reconciliação | **PARCIAL** (ferramenta admin + runbook; execução manual) |
| Refund | **PARCIAL** (runbook manual; BD/UI não seguem) |
| 3DS/SCA | **PARCIAL / RISCO** |
| UI | **PARCIAL** (wallet + histórico; sem refund / SCA no complete) |
| Rollback | **PARCIAL** (procedimento mock documentado; PIs Live permanecem no Stripe) |
| 1.º teste Live | **PARCIAL / DEPENDE MANEL** |

**Bloqueio global:** Live continua **bloqueado** até decisões externas (Manel, Stripe KYB, fiscal, jurídico aplicável) + **GO explícito**.

---

## 2. Findings confirmados — 2026-10-08

### FINDING STRIPE-LIVE-01 — 3DS/SCA no `complete_trip`

**Facto:**

- `complete_trip` pode devolver **409** `payment_requires_action`;
- o backend detecta `requires_action` após `confirm_payment_intent`;
- web-app / fluxo motorista **não** tem UI para concluir novo challenge SCA nesse momento;
- refresh / recovery desse estado **não** está implementado.

**Impacto:** cartão que exija autenticação adicional **no confirm do complete** pode deixar pagamento incompleto (viagem não fecha pagamento de forma autónoma).

**Estado:** `GAP TÉCNICO CONFIRMADO`

**Evidência:** `backend/app/services/trips.py` · `backend/tests/test_passenger_payment_attach.py` · ausência de `payment_requires_action` no web-app.

---

### FINDING STRIPE-LIVE-02 — refunds

**Facto:**

- refund manual via Stripe Dashboard está no runbook;
- eventos `charge.refunded` / `refund.*` **não** são tratados no webhook;
- `Payment.status` **não** muda após refund;
- UI passageiro **não** mostra refund;
- divergência Stripe ↔ BD/UI depende de processo manual + notas ops.

**Estado:** `GAP TÉCNICO + OPERACIONAL CONFIRMADO`

**Evidência:** `backend/app/api/routers/webhooks/stripe.py` · [`docs/runbooks/PILOT_STRIPE_REFUND.md`](../runbooks/PILOT_STRIPE_REFUND.md).

---

### FINDING STRIPE-LIVE-03 — STAGING Stripe TEST

**Facto:**

- checklist STAGING existe ([`PILOT_STRIPE_STAGING_CHECKLIST.md`](../runbooks/PILOT_STRIPE_STAGING_CHECKLIST.md));
- smokes humanos Stripe TEST na tabela continuam **`NOT RUN`**.

**Estado:** `PENDENTE EXECUÇÃO`

---

## 3. O que já está sólido

- Wallet / saved payment methods (Customer + default PM).
- SetupIntent + registo PM (`confirmCardSetup` no FE quando mock off).
- PaymentIntent com `capture_method=manual`, placeholder no accept, amount final no complete.
- Guards amount/currency (webhook succeeded fail-closed; capture blocked on mismatch).
- Webhook: assinatura `construct_event`, idempotência `stripe_webhook_events`, retries via 500 em erro BD.
- Reconciliação admin (`stripe-sync`, single trip) alinhada às mesmas regras de amount.
- Histórico passageiro com estado de pagamento (sem factura legal / refund).
- Separação mock / test / live por env (`STRIPE_MOCK`, `VITE_STRIPE_MOCK`, prefixos `sk_` / `pk_`).
- Política operacional: mock por defeito em piloto ([`ENV_SINGLE_REALITY.md`](../env/ENV_SINGLE_REALITY.md)).

---

## 4. Configuração Live necessária (só nomes)

### Backend (`tvde-api`)

| Variável |
|----------|
| `STRIPE_MOCK` |
| `STRIPE_SECRET_KEY` |
| `STRIPE_WEBHOOK_SECRET` |
| `ENV` / `ENVIRONMENT` |
| `DATABASE_URL` |
| `CRON_SECRET` |

### Frontend (`tvde-app`, build-time)

| Variável |
|----------|
| `VITE_STRIPE_MOCK` |
| `VITE_STRIPE_PUBLISHABLE_KEY` |
| `VITE_API_URL` |

**Notas:**

- Frontend exige **rebuild** ao mudar publishable key ou modo mock.
- API exige **redeploy** ao mudar secret key / webhook secret / `STRIPE_MOCK`.
- **Test e Live não podem ser misturados** (par `sk_*` / `pk_*` / `whsec_*` do mesmo modo).
- Valores actuais no Render **não** foram auditados nesta tarefa — confirmar no painel ([`ENV_VARS_VERIFICATION.md`](../env/ENV_VARS_VERIFICATION.md)).

---

## 5. Eventos webhook efectivos

**Endpoint:** `POST /webhooks/stripe`

| Evento Stripe | Tratado | Efeito principal |
|---------------|---------|------------------|
| `payment_intent.succeeded` | **Sim** | `Payment` → succeeded se amount/currency OK |
| `payment_intent.payment_failed` | **Sim** | `Payment` → failed |
| `charge.payment_failed` | **Sim** | `Payment` → failed (resolve `pi_` do charge) |
| `charge.refunded` / `refund.*` | **Não** | — |

Outros tipos: ack 200 sem alterar pagamento quando há `pi_` válido ou skip documentado.

---

## 6. Bloqueadores antes de Stripe Live

### Técnicos

- Resolver ou decidir fluxo para **`payment_requires_action`** no complete (STRIPE-LIVE-01).
- Executar smokes Stripe **TEST** em STAGING (STRIPE-LIVE-03).
- Validar **URL webhook PROD** actual (host pode diferir de exemplos antigos em docs de deploy).
- Preparar **rebuild frontend** Live (`pk_live`, `VITE_STRIPE_MOCK=false`).

### Operacionais

- Atribuir responsáveis por **reconcile** e **refund** manual.
- Fechar procedimento do **primeiro teste Live** (critérios sucesso/aborto + evidência).
- Política explícita: **não misturar** Test/Live no mesmo endpoint/credenciais.

### Externos

- **Manel:** GO Live, conta, acessos Dashboard, IBAN, env Render.
- **Stripe:** KYB / activação Live.
- **Contabilista:** factura, comissão 15%, refunds contabilísticos.
- **Jurídico:** blockers aplicáveis à cobrança real.
- **Seguradora:** cobertura para viagens reais (fora do circuito Stripe, gate operação).

---

## 7. Ordem recomendada

1. Persistir esta auditoria (este documento).
2. Executar smokes Stripe TEST em STAGING; actualizar checklist.
3. Reavaliar findings STRIPE-LIVE-01…03.
4. Corrigir 3DS/SCA no complete **se** STAGING/Live exigir (produto).
5. Corrigir refund → BD/UI/webhook **se** necessário para Live/piloto pago.
6. Reavaliar readiness por área (§1).
7. Só então preparar activação Live (keys + webhook Live + GO).

---

## 8. Princípios

- **TEST passado não prova Live.**
- **Stripe Dashboard não substitui** o estado da app (`Payment`, UI).
- Sucesso Stripe **sem** sucesso BD/UI **não** conta como fluxo fechado.
- **Rollback** (mock/test) **não** apaga PIs, charges, eventos ou evidência já criados em Live.
- **Live só após GO explícito** do responsável de produto/operações.

---

## Estado (uma linha)

**Estado:** circuito PaymentIntent + manual capture + webhook principal **tecnicamente sólido**; readiness Live **parcial** — bloqueado por findings 01–03, smokes STAGING pendentes e decisões externas.
