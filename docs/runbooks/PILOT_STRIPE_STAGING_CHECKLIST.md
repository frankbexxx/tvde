# Piloto V1 — Stripe Staging Readiness (checklist)

**Objectivo:** validar o fluxo com **Stripe Test keys** em staging.  
**Proibido nesta fase:** `sk_live` / `pk_live` / dinheiro real / Connect.

**Última actualização:** 2026-10-15 (cenário **A** fechado; **B** preparado, não executado).

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
| **B. Cartão 3DS** | **NOT RUN** | Preparado abaixo; executar na ronda seguinte |
| C. Cancel antes de captura | NOT RUN | Taxa 3 € registada, não cobrada |
| D. Webhook | NOT RUN | Assinatura + succeeded *(A já viu webhook 200 no complete)* |
| E. Webhook retry | NOT RUN | Idempotência `evt_` |
| F. Falha captura | NOT RUN | Trip não completed; Admin vê processing |
| G. Completed + payment inconsistente | NOT RUN | Ver runbook reconciliação |
| H. Admin reconciliação | código PRONTO | Ops + detail |
| I. Refund manual test | procedimento PRONTO | Dashboard Test; app pode não reflectir |
| J. Logs/audit | código PRONTO | `payment_*` events sem secrets |

**B1 piloto Stripe staging:** **não fechado** enquanto **B–J** (ou o subconjunto acordado) não correrem. **Cenário A (B1-A)** está **fechado**.

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

Relacionado **B (futuro):** **STRIPE-LIVE-01** — 409 `payment_requires_action` no complete **sem** UI web de recovery (`handleCardAction` / retry).

---

## Cenário B — 3DS (preparação; **não executado** nesta ronda)

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

**Nota técnica:** PI auth com `allow_redirects=never` (#750) — validar na execução de B se 3DS2 no confirm continua possível sem redirect (iframe/challenge) ou se o cenário fica **BLOCKED** até produto decidir fluxo client-side.

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

### Passos manuais recomendados (Francisco — ronda B)

1. Browsers **distintos** (ex. Chrome pax · Firefox driver) — **SESSION-PRIVATE**.
2. Passageiro: remover/default PM 4242 se necessário; adicionar cartão **`4000000000003220`** na wallet (completar 3DS no setup se pedido).
3. Criar viagem manual staging (mesmo perfil demo que A, se aplicável).
4. Motorista: accept → arriving → start.
5. Motorista: **complete** — observar resposta API/UI; **não** forçar refresh repetido como workaround.
6. Registar: HTTP status, corpo `detail`, estado trip (pax + driver), Payment no admin/BD se acessível, PI no Stripe Test Dashboard (`status`, `last_payment_error`, `next_action`).
7. **Não** marcar B1 global fechado; actualizar apenas linha **B** desta tabela.

---

Actualizar esta tabela após cada smoke staging real.
