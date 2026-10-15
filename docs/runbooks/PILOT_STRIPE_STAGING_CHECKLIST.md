# Piloto V1 — Stripe Staging Readiness (checklist)

**Objectivo:** validar o fluxo com **Stripe Test keys** em staging.  
**Proibido nesta fase:** `sk_live` / `pk_live` / dinheiro real / Connect.

**Última actualização:** 2026-10-15 (cenários **A** e **B v1** fechados; **C–J** por correr).

## Variáveis externas (nomes — sem valores)

**Backend (staging)**

- `ENVIRONMENT` ou `ENV` = `staging`
- `STRIPE_MOCK` = `false`
- `STRIPE_SECRET_KEY` = `sk_test_…`
- `STRIPE_WEBHOOK_SECRET` = `whsec_…` (endpoint Test apontado a `https://<staging-api>/webhooks/stripe`)

**Web-app (build staging)**

- `VITE_STRIPE_MOCK` = `false`
- `VITE_STRIPE_PUBLISHABLE_KEY` = `pk_test_…`

**Staging actual (B1-A):** API `tvde-staging-api` · deploy live @ merge `8155e893` ([PR #750](https://github.com/frankbexxx/tvde/pull/750)) — auth PI com `automatic_payment_methods.allow_redirects = never` para confirm server-side no complete sem `return_url`.

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
| C. Cancel antes de captura | NOT RUN | Taxa 3 € registada, não cobrada |
| D. Webhook | NOT RUN | Assinatura + succeeded *(A já viu webhook 200 no complete)* |
| E. Webhook retry | NOT RUN | Idempotência `evt_` |
| F. Falha captura | NOT RUN | Trip não completed; Admin vê processing |
| G. Completed + payment inconsistente | NOT RUN | Ver runbook reconciliação |
| H. Admin reconciliação | código PRONTO | Ops + detail |
| I. Refund manual test | procedimento PRONTO | Dashboard Test; app pode não reflectir |
| J. Logs/audit | código PRONTO | `payment_*` events sem secrets |

**B1 piloto Stripe staging:** **não fechado** enquanto **C–J** (ou o subconjunto acordado) não correrem. **Cenários A (B1-A)** e **B v1 (3DS gap conhecido)** estão **fechados**. **PASS ideal B** (SCA + retry + viagem paga) **não** existe ainda.

---

## Cenário A — evidência consolidada (2026-10-15)

| Camada | Evidência |
|--------|-----------|
| **Código / deploy** | PR [#750](https://github.com/frankbexxx/tvde/pull/750) → `8155e893` · `tvde-staging-api` live |
| **Stripe (fluxo)** | accept 200 · confirm OK · capture OK · PI succeeded · Payment succeeded · webhook 200 |
| **Manual UI** | Passageiro: viagem manual → histórico → avaliação; «Viagem concluída» + «Pagamento concluído» · Visa •••• 4242 · 4,50 €. Motorista: «Viagem concluída» · 4,50 € / 3,82 € / 0,68 €. Browsers separados pax/driver. |
| **Regressão conhecida** | Sem novo `502 Payment confirmation failed` (falha pré-#750 com `allow_redirects=always`) |

---

## Findings separados (não bloqueiam A)

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

**Pós-smoke ops:** viagem `660feccc-…` pode ficar **ongoing** — cancelar/limpar em staging quando conveniente; **não** repetir complete nem confirm/capture manual no PI.

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
| **P1** | **STRIPE-LIVE-01 / 3DS UX** | Tratar `409 payment_requires_action` no complete: expor `client_secret` ao passageiro, `confirmCardPayment` / `handleCardAction`, copy humana, retry complete pós-SCA |
| **P2** | **C. Cancel antes de captura** | Próximo smoke checklist C–J |
| **P2** | **UX-PAY-COPY** | Copy «A confirmar pagamento…» vs confirm só no complete |
| **Ops** | Trip `660feccc-…` ongoing | Cancel staging controlado; browsers separados nos smokes |

---

Actualizar esta tabela após cada smoke staging real.
