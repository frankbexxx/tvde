# Piloto V1 — Stripe Staging Readiness (checklist)

**Objectivo:** validar o fluxo com **Stripe Test keys** em staging.  
**Proibido nesta fase:** `sk_live` / `pk_live` / dinheiro real / Connect.

**Última actualização:** 2026-10-19 (cenários **A**–**J** fechados · **B1** completo operacionalmente).

## Variáveis externas (nomes — sem valores)

**Backend (staging)**

- `ENVIRONMENT` ou `ENV` = `staging`
- `STRIPE_MOCK` = `false`
- `STRIPE_SECRET_KEY` = `sk_test_…`
- `STRIPE_WEBHOOK_SECRET` = `whsec_…` (endpoint Test apontado a `https://<staging-api>/webhooks/stripe`)

**Web-app (build staging)**

- `VITE_STRIPE_MOCK` = `false`
- `VITE_STRIPE_PUBLISHABLE_KEY` = `pk_test_…`

**Staging actual:** API `tvde-staging-api` · auth PI `allow_redirects=never` ([PR #750](https://github.com/frankbexxx/tvde/pull/750)) · Payment `failed` após cancel com PI real ([PR #753](https://github.com/frankbexxx/tvde/pull/753)).

## Fluxo esperado (test mode)

`pedido → accept (PI) → passageiro guarda cartão (attach) → viagem → complete (update amount → confirm → captura) → webhook → Payment.succeeded`

Cartões de teste Stripe: normal (`4242…`), 3DS (`4000000000003220` ou documentação Stripe actual).

## Regras operacionais de smoke (humano)

| Regra | Motivo |
|-------|--------|
| Passageiro e motorista em **browsers separados** (ou perfis distintos), **não** duas janelas privadas do mesmo browser | Evitar contaminação de sessão/storage — ver finding **SESSION-PRIVATE** |
| Após fix PI, **nova viagem**; não reutilizar PIs criados antes de #750 com `allow_redirects=always` | Idempotency / params Stripe imutáveis no PI antigo |
| PROD intocado; sem alterações Dashboard Stripe nestes smokes | Escopo piloto staging |

## Checklist de smoke (humano em staging)

| Cenário | Resultado | Notas |
|---------|-----------|-------|
| **A. Cartão normal** | **PASS** · 2026-10-15 | Manual UI (Francisco) + evidência técnica prévia/API. Visa `4242` · 4,50 € · motorista 3,82 € / comissão 0,68 € · «Pagamento concluído» · sem `502 Payment confirmation failed`. Fix #750. |
| **B. Cartão 3DS** | **PASS v1** · 2026-10-15 | Manual UI · PM default `4000000000003220` · complete **409** `payment_requires_action` · trip **ongoing** · sem capture/completed/502 · UI erro técnico · gap **STRIPE-LIVE-01** confirmado |
| **C. Cancel antes de captura** | **PASS** · 2026-10-16 | Pax cancel pós-accept · taxa **3 €** na Trip · **não** cobrada Stripe · PI `canceled` · Payment `failed` · trip `ad242d60-…` · #753 |
| **D. Webhook succeeded** | **PASS** · 2026-10-16 | Viagem `144fb05d-…` · PI `pi_3UR8Sr…` · `evt_3UR8Sr…KlUxy8E` · 1.ª entrega **200** · `processing→succeeded` · marker `stripe_webhook_events` = 1 |
| **E. Webhook retry (`evt_`)** | **PASS** · 2026-10-16 | Resend **mesmo** `evt_…` · 2.ª entrega **200** · count evt **1** · sem 2.º succeeded/capture/trip change *(log textual duplicate não indexado Render)* |
| **F. Falha confirm/capture no complete** | **PASS** · 2026-10-19 | Cartão **0341** · complete **502** `Payment confirmation failed.` · trip `80a24f0c-…` · Payment **`failed`** (webhook) · sem capture/commit |
| **G. Completed + payment inconsistente** | **PASS** · 2026-10-19 | Single-trip reconcile · `144fb05d-…` · dry-run → apply · Trip **`completed`** · Payment **`processing→succeeded`** |
| **H. Admin reconciliação (batch)** | **PASS** · 2026-10-19 | Preview + `stripe-sync` dry-run/apply · mesma trip (setup one-off) · `updated_succeeded` · preview **0** pós-apply |
| **I. Refund manual test** | **PASS** · 2026-10-19 | Viagem descartável `390f3924-…` · refund TEST **450 eur** · app **`succeeded`** · gap **STRIPE-LIVE-02** confirmado |
| **J. Logs/audit** | **PASS** · 2026-10-19 | Viagem I `390f3924-…` · cadeia `payment_*` + webhook · grep secrets **0 hits** · read-only |

**B1 piloto Stripe staging:** **PASS / COMPLETO** (**A**–**J** · 2026-10-15/19). **PASS ideal B** (SCA + retry + viagem paga) **não** existe ainda — gap **STRIPE-LIVE-01** permanece.

---

## Cenário A — evidência consolidada (2026-10-15)

| Camada | Evidência |
|--------|-----------|
| **Código / deploy** | PR [#750](https://github.com/frankbexxx/tvde/pull/750) → `8155e893` · `tvde-staging-api` live |
| **Stripe (fluxo)** | accept 200 · confirm OK · capture OK · PI succeeded · Payment succeeded · webhook 200 |
| **Manual UI** | Passageiro: viagem manual → histórico → avaliação; «Viagem concluída» + «Pagamento concluído» · Visa •••• 4242 · 4,50 €. Motorista: «Viagem concluída» · 4,50 € / 3,82 € / 0,68 €. Browsers separados pax/driver. |
| **Regressão conhecida** | Sem novo `502 Payment confirmation failed` (falha pré-#750 com `allow_redirects=always`) |

---

## Findings separados (não bloqueiam A–F)

| ID | Resumo | Classificação |
|----|--------|---------------|
| **UX-PAY-COPY** | Copy «A confirmar pagamento…» em accepted/arriving/ongoing; V1 confirma PI só no **complete** → copy enganadora | UX · não blocker A · [`FINDINGS.md`](../registers/FINDINGS.md) |
| **MAPTILER-403** | `GET api.maptiler.com/…` 403 no console; mapa via fallback/OSM | Infra FE · investigar depois · não blocker B1-A |
| **SESSION-PRIVATE** | Sessão partilhada entre janelas privadas do mesmo browser | Regra operacional de teste |

**STRIPE-LIVE-01 (3DS UX):** reproduzido no smoke **B v1** — ver secção B abaixo.

---

## Cenário B — evidência consolidada **PASS v1** (2026-10-15)

| Campo | Valor |
|-------|--------|
| **Veredito** | **B — PASS v1** (comportamento actual documentado; não PASS ideal) |
| **Cartão** | `4000 0000 0000 3220` (default na wallet) |
| **trip_id** | `660feccc-d52e-4119-a34a-3f57f650faf6` |
| **payment_id** | `0a8841c3-69e6-4cbe-8ef6-662b2770fcdb` |
| **payment_intent_id** | `pi_3UQpjJ8jcCqT4zTo1r5vYEBb` |

| Camada | Evidência |
|--------|-----------|
| **Manual UI** | Viagem criada → accept → chegada → início → complete · motorista vê erro técnico `payment_requires_action` · viagem **não** concluída |
| **API** | `POST …/complete` → **409** · `detail`: `payment_requires_action` (ex. 14:34:47 UTC staging) |
| **Backend logs** | `payment_confirm_requires_action` · **sem** `payment_capture_success` nesta trip |
| **Estado esperado pós-smoke** | **Trip:** `ongoing` · **Payment:** incompleto (ex. `processing`) · **PI Stripe:** `requires_action` (confirm server-side bloqueado até SCA client-side) |

**Pós-smoke ops:** viagem `660feccc-…` **cancelada em ops** (2026-10-16); **não** repetir complete nem confirm/capture manual no PI.

---

## Cenário C — evidência consolidada **PASS** (2026-10-16)

Cancelamento **passageiro** após **accept**, **antes** de complete/capture.

| Campo | Valor |
|-------|--------|
| **Trip** | `ad242d60-5ef0-4441-a5d8-f237c5ecfe8b` |
| **PaymentIntent** | `pi_3UR6dE8jcCqT4zTo0yRTWk4m` |
| **Cancel HTTP** | **200** (`accepted → cancelled`) |

| Entidade | Estado |
|----------|--------|
| **Trip** | `cancelled` · `cancelled_by=passenger` · **`cancellation_fee=3.00`** · `final_price=null` |
| **Payment** | **`failed`** (pós #753) · **não** `succeeded` |
| **PI Stripe** | **`canceled`** · `amount_received=0` · `amount_capturable=0` · `latest_charge=null` |

**Interpretação V1:** taxa 3 € **registada** na Trip (`CANCELLATION_FEE_EUR`); **não** cobrada via Stripe neste fluxo (PI cancelado, sem capture). **Sem refund** (nunca houve capture/succeeded).

**Logs:** sem `payment_capture_success` · sem `payment_intent.succeeded` para este PI · webhook **200** no cancel do PI. Pax/motorista **sem** trip activa.

---

## Cenário D — evidência consolidada **PASS** (2026-10-16)

Webhook **`payment_intent.succeeded`** após complete/capture (viagem dedicada smoke D; cartão normal 4242).

| Campo | Valor |
|-------|--------|
| **Trip** | `144fb05d-88d0-4438-b152-2b3afb986ac9` · `completed` · **`final_price=4.50`** |
| **Payment** | `794a7c55-e3e4-47a5-a022-4c229699c8ca` · **`succeeded`** |
| **PaymentIntent** | `pi_3UR8Sr8jcCqT4zTo0g04knVw` · Stripe **`succeeded`** |
| **Stripe event** | `evt_3UR8Sr8jcCqT4zTo0KlUxy8E` |

| Camada | Evidência |
|--------|-----------|
| **Complete** | `payment_capture_success` · `trip_completion_commit` com **`payment_status=processing`** |
| **1.ª entrega webhook** | `POST /webhooks/stripe` **200** (10:34:36 UTC) · `stripe_webhook_payment_succeeded` · **`processing→succeeded`** · 450/450 ct |
| **Idempotência (marker)** | **`stripe_webhook_events`:** **1** linha para `evt_…` |

Endpoint staging: `https://tvde-staging-api.onrender.com/webhooks/stripe`.

---

## Cenário E — evidência consolidada **PASS** (2026-10-16)

**Resend** Stripe Dashboard do **mesmo** `evt_3UR8Sr8jcCqT4zTo0KlUxy8E` (idempotência `evt_`).

| Verificação | Resultado |
|-------------|-----------|
| **2.ª entrega HTTP** | **200** · 10:53:07 UTC · IP Stripe |
| **Payment.status** | Permanece **`succeeded`** |
| **`stripe_webhook_events`** | Count **`evt_…` = 1** (sem duplicar linha) |
| **Sem efeitos duplicados** | **Sem** 2.º `stripe_webhook_payment_succeeded` · **sem** nova `state_changed` / complete · **sem** 2.ª capture |

**Observabilidade:** mensagem `webhook: duplicate Stripe delivery (evt idempotent)` **não** apareceu nos logs Render indexados; **não** abre finding — idempotência confirmada por BD + ausência de reprocessamento + 2.º **200**.

---

## Cenário F — evidência consolidada **PASS** (2026-10-19)

Falha Stripe no **`complete`** (confirm server-side) com cartão TEST **decline after attach** · **0341**.

| Campo | Valor |
|-------|--------|
| **Trip** | `80a24f0c-d6ea-44c9-9c20-0dfbcc994b62` |
| **Payment** | `75b59754-db07-40ca-89a3-512ebaa452d4` |
| **PaymentIntent** | `pi_3USBaq8jcCqT4zTo0wezaHyZ` |
| **Webhook** | `evt_3USBaq8jcCqT4zTo0J8sEC5d` · `payment_intent.payment_failed` |

| Camada | Evidência |
|--------|-----------|
| **Complete** | **502** · `Payment confirmation failed.` · log `Stripe confirm failed` · **`payment_capture_started`** · **sem** `payment_capture_success` · **sem** `trip_completion_commit` |
| **Trip pós-falha** | **`ongoing`** · `final_price=null` · `completed_at=null` |
| **Payment pós-falha** | **`failed`** (webhook **`processing→failed`**) · PI **`requires_payment_method`** · `card_declined` / `generic_decline` · PM **•••• 0341** |
| **Webhook** | Entrega **200** (08:07:15 UTC) · `stripe_webhook_payment_failed` |

**Nota checklist:** linha histórica «Admin vê processing» reflecte o instante pós-502; neste smoke o webhook marcou **`failed`** segundos depois — ambos coerentes com fail-closed (trip **não** completed).

**Pós-smoke ops:** cancel **passageiro** (mesmo fluxo que C) · 2026-10-19 · trip **`cancelled`** · Payment **`failed`** · PI **`canceled`** · sem retry complete / confirm / capture manual.

---

## Cenário G — evidência consolidada **PASS** (2026-10-19)

Reconcile **single-trip** · viagem **`completed`** + Payment **`processing`** · PI Stripe **`succeeded`** (setup controlado pós-smoke D).

| Campo | Valor |
|-------|--------|
| **Trip** | `144fb05d-88d0-4438-b152-2b3afb986ac9` |
| **Payment** | `794a7c55-e3e4-47a5-a022-4c229699c8ca` |
| **PI** | `pi_3UR8Sr8jcCqT4zTo0g04knVw` |

| Acção | Evidência |
|-------|-----------|
| **Dry-run** | `POST …/reconcile-payment-stripe` · **200** · `dry_run_succeeded` · amount **450/450** |
| **Apply** | **200** · `updated_succeeded` · Trip **`completed`** · Payment **`succeeded`** |
| **Idempotência** | 2.º apply · **200** · `skipped` · `payment_not_processing` |
| **Audit** | `admin.reconcile_single_payment_stripe_succeeded` |

---

## Cenário H — evidência consolidada **PASS** (2026-10-19)

Reconcile **batch** · `POST /admin/ops/reconcile-payments/stripe-sync`.

| Acção | Evidência |
|-------|-----------|
| **Preview** | `count=1` · trip `144fb05d-…` |
| **Dry-run** | **200** · item `dry_run_succeeded` |
| **Apply** | **200** · item `updated_succeeded` |
| **Pós-apply** | preview **`count=0`** · 2.º apply **`items=[]`** |
| **Audit / log** | `admin.reconcile_payment_stripe_succeeded` · `admin_reconcile_stripe_sync` |

---

## Cenário I — evidência consolidada **PASS** (2026-10-19)

Refund manual **Stripe Dashboard TEST** · runbook [`PILOT_STRIPE_REFUND.md`](PILOT_STRIPE_REFUND.md) · **sem** alterar BD.

| Campo | Valor |
|-------|--------|
| **Trip** | `390f3924-d9e6-439d-bf28-ec933d505caf` |
| **Payment** | `7e2e72fa-3d89-4ab7-a3d8-74c2a4a1b58b` |
| **PI** | `pi_3USCzT8jcCqT4zTo0YzU4bp2` |
| **Charge** | `ch_3USCzT8jcCqT4zTo0BYof19D` |
| **Refund** | `re_3USCzT8jcCqT4zTo0J4uexOX` · **450 eur** · **succeeded** |

| Camada | Evidência |
|--------|-----------|
| **Stripe** | `charge.refunded=true` · `amount_refunded=450` · PI **`succeeded`** |
| **BD** | Trip **`completed`** · Payment **`succeeded`** (gap V1 — **não** FAIL) |
| **Eventos Stripe** | `refund.created` · `charge.refunded` · `refund.updated` (`evt_…CnnY3JX` · `…Uf76nY5` · `…04CYjoow`) |
| **Webhook staging** | Entrega refund **não evidenciada** em logs/`stripe_webhook_events` — **observação ops**; **não** invalida I-PASS |
| **2.º refund** | Dashboard · **`charge_already_refunded`** |
| **Finding** | **STRIPE-LIVE-02** confirmado (webhook refund não actualiza `Payment`/UI) |

---

## Cenário J — evidência consolidada **PASS** (2026-10-19)

Observabilidade read-only · logs `tvde-staging-api` (Render) · **sem** writes BD/Stripe/reconcile.

| Campo | Valor |
|-------|--------|
| **Trip** | `390f3924-d9e6-439d-bf28-ec933d505caf` |
| **Payment** | `7e2e72fa-3d89-4ab7-a3d8-74c2a4a1b58b` |
| **PI** | `pi_3USCzT8jcCqT4zTo0YzU4bp2` |
| **Janela** | ~**09:36 UTC** 2026-10-19 |

| Evento (UTC) | Evidência |
|--------------|-----------|
| 09:36:24 | `payment_method_attached` |
| 09:36:25 | `payment_capture_started` |
| 09:36:27 | `payment_capture_success` · `stripe_mock=False` |
| 09:36:27 | `trip_completion_commit` · `payment_status=processing` |
| 09:36:28 | `stripe_webhook_payment_succeeded` · **450/450** ct · `processing→succeeded` |

| Camada | Evidência |
|--------|-----------|
| **Webhook** | `payment_intent.succeeded` · `POST /webhooks/stripe` **200** · `evt_3USCzT8jcCqT4zTo0vTasBpB` · sem payload Stripe bruto nos logs amostrados |
| **Correlação** | trip / payment / `pi_` presentes nos eventos críticos |
| **Secrets audit** | `client_secret` · `whsec_` · `sk_*` · `pk_*` · Bearer/JWT · PAN completo → **0 hits** (índice Render, janela viagem) |
| **Admin audit (G/H)** | `admin.reconcile_single_payment_stripe_succeeded` · `admin.reconcile_payment_stripe_succeeded` (trip `144fb05d-…`; evidência prévia, **sem** novo reconcile em J) |

**Observabilidade menor:** cada `log_event` pode aparecer duplicado (plain + `INFO [tvde]`) — não bloqueia J.

### Referência — definição e critérios B (pré-execução)

Definição alinhada a este checklist + [`03_PAYMENTS.md`](../diagrams/03_PAYMENTS.md) + [`STRIPE_LIVE_READINESS_2026-10-08.md`](../architecture/STRIPE_LIVE_READINESS_2026-10-08.md) §STRIPE-LIVE-01.

### Cartão / payment method de teste

| Uso | Valor |
|-----|--------|
| **Cartão Stripe Test (3DS2)** | `4000000000003220` (ou PM de teste equivalente que exija autenticação **em cada pagamento**, conforme [Stripe Testing — 3D Secure](https://docs.stripe.com/testing#regulatory-cards)) |
| **Cartão normal (controlo negativo)** | `4242` — já validado no **A**; **não** substitui o B |
| **Wallet** | Adicionar o cartão 3DS via fluxo normal: SetupIntent → `confirmCardSetup` (SCA no setup **pode** aparecer aqui) → `POST /payments/methods` como default **antes** de criar viagem |

### Fase onde surge `requires_action`

| Momento | Comportamento esperado (modelo V1) |
|---------|-------------------------------------|
| SetupIntent (wallet) | Possível challenge 3DS ao **adicionar** cartão — independente do cenário B no complete |
| **Accept** | PI criado `confirm=false`, `requires_confirmation`; **sem** confirm server-side |
| **Complete** | `update` amount → **`confirm_payment_intent` server-side** → Stripe pode devolver PI `requires_action` (next_action / client_secret) |

Backend: [`trips.py`](../../backend/app/services/trips.py) — se `conf_status == "requires_action"` → **409** `payment_requires_action`, rollback, **sem** capture. Teste: `test_complete_requires_action_returns_409`.

### Resposta backend esperada (smoke B)

| HTTP | `detail` | Trip | Payment |
|------|----------|------|---------|
| **409** | `payment_requires_action` | Permanece **`ongoing`** (complete não commita sucesso) | Permanece em fluxo incompleto (ex. `processing`) |
| **502** | `Payment confirmation failed.` | **FAIL** inesperado para B (erro Stripe genérico) |
| **200** complete + succeeded | — | **Ambíguo/FAIL** se o cartão 3220 exigir SCA no confirm e não houver challenge concluído |

**Nota técnica (#750):** Smoke B v1 **não** ficou BLOCKED — Stripe devolveu `requires_action` no confirm server-side; fluxo client-side 3DS da viagem continua **em falta** (STRIPE-LIVE-01).

### Comportamento UI actual esperado (web-app staging)

- **Sem** handler grepável para `payment_requires_action` no FE (gap **STRIPE-LIVE-01**).
- Motorista: complete pode falhar com erro genérico ou 409 não tratado especificamente — **não** assumir «Viagem concluída» + pagamento OK.
- Passageiro: **não** há fluxo documentado de `confirmCardPayment` / `handleCardAction` ligado ao PI da viagem no complete; copy «A confirmar pagamento…» (**UX-PAY-COPY**) continua potencialmente activa antes do complete.

### Critérios PASS / FAIL / BLOCKED (proposta smoke B v1)

| Veredito | Critérios |
|----------|-----------|
| **PASS (documentado / gap conhecido)** | Cartão 3DS default na wallet · fluxo até complete · **409** `payment_requires_action` **ou** PI em `requires_action` observável (logs/Stripe Dashboard) · trip **não** completed · sem 502 de confirm · finding STRIPE-LIVE-01 reproduzido de forma controlada |
| **PASS (produto ideal — fora do estado actual)** | Challenge SCA concluído no cliente · retry complete · capture · Payment succeeded · trip completed *(requer UI/recovery — não expectativa hoje)* |
| **FAIL** | 502 inesperado · trip completed com pagamento inconsistente · succeeded sem autenticação quando Stripe exige action · crash UI silencioso |
| **BLOCKED** | Impossível registar cartão 3DS na wallet · staging keys/mock · ou Stripe recusa confirm/3DS por `allow_redirects=never` sem alternativa |

### Próximo bloco recomendado (produto / engenharia)

| Prioridade | Bloco | Notas |
|------------|-------|-------|
| **P1** | **STRIPE-LIVE-01 / 3DS UX** | Tratar `409 payment_requires_action` no complete: `client_secret`, `confirmCardPayment` / `handleCardAction`, retry complete pós-SCA |
| **P2** | **STRIPE-LIVE-02** | Refund → BD/UI (pós-piloto) |
| **P2** | **UX-PAY-COPY** | Copy «A confirmar pagamento…» vs confirm só no complete |

---

Actualizar esta tabela após cada smoke staging real.
