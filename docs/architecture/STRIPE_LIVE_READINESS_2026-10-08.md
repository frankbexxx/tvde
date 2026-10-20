# Stripe Live — readiness (auditoria 2026-10-08)

| Campo | Valor |
|-------|--------|
| **id** | AUD-PAY-STRIPE-LIVE-2026-10-08 |
| **type** | AUDIT |
| **created** | 2026-10-08 |
| **status** | FECHADO (snapshot imutável) |
| **owner** | Frank |

> **Não é documento vivo** (GOV-DOC-006). Findings abertos → [`FINDINGS.md`](../registers/FINDINGS.md) (`STRIPE-LIVE-01…03`).  
> **Documento vivo futuro:** `STRIPE_LIVE_READINESS.md` (filename estável, sem data) — a criar quando aplicável.

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
| 3DS/SCA | **READY (V1 STAGING TEST)** — fluxo complete → SCA passageiro → retry complete validado **B v2** 2026-10-19; abandono/cancel challenge **não** smokeado |
| UI | **PARCIAL** (wallet + histórico + SCA no complete **V1**; sem refund) |
| Rollback | **PARCIAL** (procedimento mock documentado; PIs Live permanecem no Stripe) |
| 1.º teste Live | **PARCIAL / DEPENDE MANEL** |

**Bloqueio global:** Live continua **bloqueado** até decisões externas (Manel, Stripe KYB, fiscal, jurídico aplicável) + **GO explícito**.

---

## 2. Findings confirmados — 2026-10-08

### FINDING STRIPE-LIVE-01 — 3DS/SCA no `complete_trip`

**Facto (histórico 2026-10-08 / B v1):**

- `complete_trip` devolve **409** `payment_requires_action` quando Stripe exige SCA no confirm server-side;
- **B v1 (2026-10-15):** gap confirmado — FE sem recovery 3DS da viagem · copy motorista técnica.

**Resolução V1 (2026-10-19, STAGING TEST):**

- PR [#758](https://github.com/frankbexxx/tvde/pull/758) (`974dc061`): `payment_intent_status` + secret no GET passageiro; copy motorista; painel passageiro + `stripe.handleNextAction`.
- PR [#759](https://github.com/frankbexxx/tvde/pull/759) (`f3b48447`): merge poll/bootstrap preserva campos PI; `payment_requires_action` nunca cru no motorista.
- **Smoke B v2 — happy path PASS:** trip `59ddcd8f-ac75-44f7-95e2-a24ed68bbbcd` · PI `pi_3USEzh8jcCqT4zTo1AcafJge` · 3220 · 3DS COMPLETE → retry complete → capture · trip **completed** · payment **succeeded** · 4,50 €.
- **Smoke B v2 — SCA fail PASS:** trip `f852e935-ffc3-4442-924d-a530ac131160` · PI `pi_3USFul8jcCqT4zTo0r8r2fTJ` · 3DS FAIL → webhook `payment_failed` · payment **failed** · trip **ongoing** · copy humana pax/motorista · sem capture.

**Fora de scope V1 validado:** retry após **abandono/cancelamento** do challenge (modal TEST Stripe expôs apenas **FAIL** / **COMPLETE**, sem acção distinta de abandon).

**Estado:** **`FECHADO`** (scope V1 STAGING TEST) — registo [`FINDINGS.md`](../registers/FINDINGS.md).

**Evidência:** [`PILOT_STRIPE_STAGING_CHECKLIST.md`](../runbooks/PILOT_STRIPE_STAGING_CHECKLIST.md) §B v1 + §B v2 · `backend/app/services/trips.py` (fail-closed inalterado) · web-app STRIPE-LIVE-01.

---

### FINDING STRIPE-LIVE-02 — refunds

**Facto (pré-F1/F2 · smoke I · 2026-10-19):**

- refund manual via Stripe Dashboard no runbook;
- webhook **não** sincronizava refund → BD;
- divergência Stripe ↔ BD confirmada na viagem `390f3924-…`.

**Resolução técnica V1 (F1/F2 · PR #761 · smoke I′ · 2026-10-20):**

- webhook **`charge.refunded`** activo STAGING; assinatura validada;
- sync `amount_refunded` → `payments.refunded_amount`; `refund_status` derivado na API;
- **`Payment.status`** mantém-se (ex. `succeeded` após refund total); Trip/`final_price` inalterados;
- idempotência por evento; logs `stripe_webhook_payment_refunded`.

**Estado:** **`FECHADO` tecnicamente** · 2026-10-20 (sync Stripe → webhook → BD/API). **UI refund (F3), botão Refund Admin, fiscal/NC e reconcile refund-aware** — scope separado / fase posterior.

**Evidência:** [`PILOT_STRIPE_REFUND.md`](../runbooks/PILOT_STRIPE_REFUND.md) smoke I′ · trip `2bf290b8-af20-45fe-8a94-9f088d7aec03` · PI `pi_3USbkn8jcCqT4zTo1yNByk6r` · evt `evt_3USbkn8jcCqT4zTo1nVuAYkt` · checklist §I′.

---

### FINDING STRIPE-LIVE-03 — STAGING Stripe TEST

**Facto:**

- checklist STAGING existe ([`PILOT_STRIPE_STAGING_CHECKLIST.md`](../runbooks/PILOT_STRIPE_STAGING_CHECKLIST.md));
- smokes **A–J PASS** em staging (2026-10-15/19); checklist **B1 completo**;
- webhook Test: `payment_intent.succeeded` / **`payment_failed`** + tabela **`stripe_webhook_events`** (D/E/F); reconcile G/H; refund manual I; logs/audit J (viagem `390f3924-…`, secrets audit **0 hits**, read-only).

**Estado:** `FECHADO` (STAGING TEST checklist B1) — registo [`FINDINGS.md`](../registers/FINDINGS.md) · **STRIPE-LIVE-02** fechado tecnicamente 2026-10-20 (smoke I′)

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
| `charge.refunded` | **Sim** | `refunded_amount` + `refund_status` derivado; `Payment.status` inalterado |
| `refund.created` / `refund.updated` / `refund.failed` | **Não** (V1) | Fonte canónica = `charge.refunded` apenas |

Outros tipos: ack 200 sem alterar pagamento quando há `pi_` válido ou skip documentado.

---

## 6. Bloqueadores antes de Stripe Live

### Técnicos

- ~~Resolver fluxo **`payment_requires_action`** / SCA no complete (**STRIPE-LIVE-01**).~~ **Fechado** V1 STAGING 2026-10-19 (B v2).
- ~~Tratar refund → BD/webhook (**STRIPE-LIVE-02**).~~ **Fechado tecnicamente** 2026-10-20 (smoke I′ STAGING). UI refund / botão Admin = fase **F3**.
- ~~Executar smokes Stripe **TEST** em STAGING (STRIPE-LIVE-03).~~ **Concluído** 2026-10-19 (**A–J PASS**).
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
2. ~~Executar smokes Stripe TEST em STAGING; actualizar checklist.~~ **Feito** (B1 **A–J** · 2026-10-19).
3. ~~Reavaliar STRIPE-LIVE-01.~~ **Fechado** (B v2 STAGING). ~~**STRIPE-LIVE-02** sync refund.~~ **Fechado tecnicamente** 2026-10-20 (I′).
4. UI refund / comunicação passageiro (**F3**) e fiscal (**Q-EXT-FIS-005**) — fora do fechamento técnico 02.
5. Live: repetir smoke B (3DS) em ambiente Live **após** GO — TEST passado não prova Live.
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

**Estado:** circuito PaymentIntent + manual capture + webhooks principais **tecnicamente sólido**; smokes STAGING **A–J PASS** + **B v2 3DS PASS** + **I′ refund sync PASS** (STRIPE-LIVE-01, **02** e **03** fechados tecnicamente em STAGING); readiness Live **parcial** — UI refund/F3, fiscal, decisões externas e validação Live explícita.
