# G1.1 — Guião operacional do piloto (VAMULÁ / TVDE)

| Campo | Valor |
|-------|--------|
| **type** | RUNBOOK (execução humana) |
| **status** | ACTIVO — **guião preparado** |
| **updated** | 2026-10-26 |
| **owner** | Frank |
| **IDs roadmap** | **G1.1** · **S-QA-01** (preparação) · **≠ G1.2 executado** · **≠ Marco 2 fechado** |

**Objectivo:** orientar testes humanos e validação técnica pré-comercial. **Não** substitui [`PILOT_STRIPE_STAGING_CHECKLIST.md`](PILOT_STRIPE_STAGING_CHECKLIST.md) (cenários A–J), [`DEMO_MANEL_2_SETEMBRO.md`](../archive/ops/DEMO_MANEL_2_SETEMBRO.md) (demo PROD), nem [`W1_PROD_SMOKE.md`](../ops/W1_PROD_SMOKE.md) (cron/webhook ops).

**Base:** auditoria READ-ONLY G1.1 **26/10/2026** · baseline código `abf91e34`.

---

## A. Preparação

### Ambientes (não misturar)

| Trilho | Hosts | Pagamentos | Uso |
|--------|--------|------------|-----|
| **A — STAGING / Stripe TEST** | App `https://tvde-staging-app.onrender.com` · API `https://tvde-staging-api.onrender.com` | `STRIPE_MOCK=false` + chaves **TEST** (`sk_test_` / `pk_test_`) | **Validação técnica piloto** (pay real em TEST) |
| **B — PROD / mock** | App `https://tvde-app-j51f.onrender.com` · API `https://tvde-api-fd2z.onrender.com` | `STRIPE_MOCK=true` (piloto actual) | **Demonstração interna** · **≠** piloto comercial LIVE |

**Regras Stripe:**

- **TEST (Trilho A):** cartões `4242…` / 3DS de teste — **sem** dinheiro real · **≠** `sk_live_` / `pk_live_`.
- **Mock (Trilho B):** sem captura Stripe real; copy/UI de pagamento em modo simulado.
- **LIVE:** **proibido** neste guião — depende **B1** + decisão explícita ([`ENV_SINGLE_REALITY.md`](../env/ENV_SINGLE_REALITY.md)).

### Participantes

| Papel | Trilho A | Trilho B |
|-------|----------|----------|
| **Passageiro** | Browser/perfil dedicado | Idem |
| **Motorista** | Browser/perfil **diferente** do passageiro | Idem |
| **Operador** | super_admin (Saúde, Operações) | Admin/SA + opcional Partner |

**Regra SESSION-PRIVATE:** não usar duas janelas privadas do **mesmo** browser para pax e driver ([`PILOT_STRIPE_STAGING_CHECKLIST.md`](PILOT_STRIPE_STAGING_CHECKLIST.md)).

### Contas e dispositivos

| Item | STAGING (Trilho A) | PROD (Trilho B) |
|------|-------------------|-----------------|
| Passageiro | `test_passenger` (`+351912345678`) ou conta QA Google (II-C) | Demo [`DEMO_4_PAPEIS.md`](../archive/ops/DEMO_4_PAPEIS.md) — **sem passwords neste doc** |
| Motorista | `test_driver` (`+351911111111`) ou motorista aprovado STG | Demo driver |
| Operador | super_admin STG | Frank SA PROD |
| Roster | **5 users efectivos** STG — ver [`DEV_BASELINE_ROSTER.md`](../testing/DEV_BASELINE_ROSTER.md) + [`STAGING_A2-02_RUNBOOK.md`](../ops/STAGING_A2-02_RUNBOOK.md) | Roster demo PROD |

**Mobile (opcional G2):** APK Internal Testing — fluxo **STAGING API** validado device **09/2026**; **≠** substituto do Trilho A web sem registo explícito.

### Pré-condições (antes de iniciar)

| Check | Trilho A | Trilho B |
|-------|----------|----------|
| Admin → **Saúde** | `status=ok` · **0** stuck · críticos vazios | Idem (evidência **22/10** + cron **25/10**) |
| Admin → **Operações** | `ENV=staging` · `STRIPE_MOCK=não` · secrets **set** (sem copiar valores) | `ENV=production` · `STRIPE_MOCK=sim` |
| Cron externo | Job **`TVDE - STAGING`** (acta §9 **23/10**) | Job **`TVDE Background Workers`** (acta **25/10**) |
| Motorista | **Disponível** · GPS **foreground** permitido | Idem |
| Documentação viatura | Docs dummy **approved** STG (baseline) | Gates viatura **ON** PROD |

**OTP SMS:** **indisponível** em deployed (`503`) — **≠** usar registo OTP neste guião ([`S-AUTH-01_OTP_SMS_DECISION.md`](../architecture/S-AUTH-01_OTP_SMS_DECISION.md)).

---

## B. Trilho A — STAGING / Stripe TEST

**Referência detalhada pay/webhook:** cenários **A–J** já **PASS** **15–20/10/2026** — repetir **só** se houve alteração relevante em pagamentos/webhook/complete ([`PILOT_STRIPE_STAGING_CHECKLIST.md`](PILOT_STRIPE_STAGING_CHECKLIST.md)).

Fluxo canónico TEST: `pedido → accept (PI) → attach cartão → viagem → complete → captura → webhook → Payment.succeeded`.

| # | Responsável | Acção | Esperado | PASS | FAIL | Evidência mínima |
|---|-------------|--------|----------|------|------|------------------|
| **1** | Operador | Admin → **Saúde** (STG) | `status=ok` · stuck **0** | Ambos | Críticos ou stuck >0 | Screenshot ou hora UTC + `status` |
| **2** | Pax · Drv | Login (password demo STG ou Google QA) | Sessão activa nos dois browsers | 200/shell OK | 401/403/503 OTP | Host + papel |
| **3** | Motorista | **Disponível** + GPS | Estado disponível; posição actualiza | UI + mapa | Offline persistente | — |
| **4** | Passageiro | Origem/destino válidos → **Pedir viagem** | `requested` · estimativa/preço visível | Trip criada | 4xx / sem preço | `trip_id` (UUID) |
| **5** | Motorista | Ver oferta → **aceitar** (slide) | `accepted` | Aceite OK | Timeout / sem oferta | `trip_id` + estado |
| **6** | Passageiro | Anexar/confirmar cartão **TEST** se UI pedir | PI TEST associado; método guardado | Stripe TEST OK | Erro cartão/PI | Prefixo `pi_` (mask.) · **≠** colar secrets |
| **7** | Motorista | Recolha → **Iniciar viagem** → **Terminar** | `ongoing` → `completed` | Fluxo completo | 502 confirm · gate proximidade | Estados trip + hora |
| **8** | Ambos | UI pagamento + Admin Saúde (opcional) | «Pagamento concluído» · payment **succeeded** (ou coerente pós-webhook) | UI + 0 stuck pós | 502 · stuck/inconsistent | Copy UI · nota ops se falha |
| **9** | Passageiro | **Histórico** / detalhe viagem | Viagem listada · estados coerentes | Visível | Ausente/errado | `trip_id` |
| **10** | Operador | **Saúde** pós-viagem | `ok` · stuck **0** | Igual passo 1 | Degradado / stuck | Hora UTC |

**Nova viagem:** após alterações Stripe (#750+), **não** reutilizar PIs antigos para validação de regressão.

---

## C. Trilho B — PROD / mock (demonstração interna)

Base: [`DEMO_MANEL_2_SETEMBRO.md`](../archive/ops/DEMO_MANEL_2_SETEMBRO.md) ( **DEMO PASS** **01/09/2026** ) + smoke pré-demo **S01–S12**.

| # | Acção resumida | PASS |
|---|----------------|------|
| 0 | `GET /health` API + app **200** | `{"status":"ok"}` |
| 1 | Login 4 papéis (demo + SA real) | Entrada sem password demo em Partner/Admin |
| 2 | Driver disponível + GPS | Disponível |
| 3–7 | Pedido → aceitar → pickup → iniciar → concluir | Viagem **completed** (mock pay) |
| 8 | Admin Saúde leitura | `ok` · 0 críticos |

> **Aviso explícito:** **PASS no Trilho B ≠ aprovação do piloto comercial** com pagamentos **LIVE**, OTP real, ou fecho **Marco 2**. Serve operação/demo e regressão leve em **mock**.

Cron PROD: validado **25/10** ([`W1_PROD_SMOKE.md`](../ops/W1_PROD_SMOKE.md) §7) — **≠** motivo para repetir demo completa sem alteração de fluxo.

---

## D. Cenários complementares

| Cenário | Prioridade 1.º piloto | Evidência histórica | Repetir? |
|---------|----------------------|------------------------|----------|
| Cancelamento passageiro (requested/pós-accept) | **Recomendado** | STG **C** **16/10** · CI `api-flows` | Só se regressão pay/cancel |
| Cancelamento motorista | **Recomendado** | STG · CI `pet-feature` | Idem |
| Pagamento recusado / falha capture | **Recomendado** (pré-LIVE) | STG **F** **19/10** | Idem |
| Motorista indisponível | **Opcional** | CI `api-flows` offline | Baixa prioridade |
| Perda de rede | **Opcional** | — | **Lacuna** — G2 device |
| Fechar/reabrir app em viagem | **Recomendado** (mobile) | **ActiveTrip F5 PASS PROD** | Device STG se app nativa |
| Recuperação viagem (restore) | **Recomendado** | F5 smoke PROD | Após mudanças ActiveTrip |
| Documentação motorista inválida | **Obrigatório M2 legal** | Gates viatura PROD ON | Piloto real com frota não-demo |
| Viagem com animal (Pet) | **Opcional** produto | CI `pet-feature.spec.ts` | Se feature Pet no scope |

**Não reexecutar** bloco **A–J** STAGING completo sem mudança em PR3/webhook/complete — ver checklist Stripe.

---

## E. Critérios de saída

### PASS técnico STAGING (Trilho A)

- Passos **1–10** **PASS** numa corrida **nova** (trip_id registado).
- Saúde STG **ok** antes e depois · stuck **0**.
- Pagamento TEST **succeeded** (ou falha **documentada** com cenário complementar previsto).
- **≠** declaração de piloto comercial.

### PASS demonstração PROD mock (Trilho B)

- **S01–S07** (mín.) do Demo Manel **PASS** ou equivalente documentado.
- **STRIPE_MOCK=sim** confirmado em Operações.
- **≠** piloto comercial.

### NO-GO operacional (parar e investigar)

- Saúde **degraded** com críticos de pagamento/viagem.
- `502 Payment confirmation failed` **inesperado** pós-deploy.
- Cron STG/PROD **non-2xx** sustentado (ver [`CRON_JOB_ORG_INSTRUCOES.md`](../CRON_JOB_ORG_INSTRUCOES.md)).
- Contaminação de sessão (pax/driver no mesmo browser).

### Pendências externas — **NO-GO comercial** (independentes do PASS técnico STG)

| Bloqueio | Referência |
|----------|------------|
| Stripe **LIVE** / B1 | `O-STRIPE-LIVE` · [`TODOdoDIA.md`](../../TODOdoDIA.md) |
| OTP SMS **C1** | `S-AUTH-01` |
| EXT-LEG / EXT-FIS | Consultas externas |
| A6 / IMT / 10h-24h | Roadmap M2 |
| Webhook PROD E2E | `TODO_CODIGO_TVDE.md` §1 |
| G2 Android Production + GPS background | Roadmap D2 |

**GO comercial:** **não** declarar enquanto subsistirem bloqueios acima, mesmo com Trilho A **PASS**.

---

## F. Rastreabilidade (guião × evidência)

| Etapa guião | Evidência histórica | CI | STAGING | PROD | Lacuna / execução futura |
|-------------|---------------------|-----|---------|------|---------------------------|
| 1 Saúde | STG **24/10** R-PAY-STG-4 · PROD **22/10** · cron PROD **25/10** | `api-flows` health | **PASS** | **PASS** | Re-run Trilho A pós-alteração pay |
| 2 Auth | II-C **24/10** STG · PROD demo **09/2026** | login seeds E2E | **PASS** | **PASS** (demo) | OTP real **bloqueado** |
| 3 Disponível | Demo · E2E driver | `driver-passenger-flow` | **PASS** | **PASS** | — |
| 4 Pedido/preço | A2.5 tarifário · Demo | `api-flows` · pet | **PASS** | **PASS** | — |
| 5 Matching/accept | #750 STG · Demo | E2E slide accept | **PASS** | **PASS** | — |
| 6 PI TEST | A–J STG **OUT/2026** | mock only CI | **PASS** (A–J) | **N/A** (mock) | — |
| 7 Viagem/GPS | Demo · E2E · device **09/2026** | E2E complete | **PASS** | **PASS** | GPS **background** |
| 8 Pay/captura | A–J manual STG | **≠** real Stripe | **PASS** | mock only | PROD webhook E2E |
| 9 Histórico/refund | #764 STG **21/10** | parcial | **PASS** UI | parcial | Fiscal/comercial |
| 10 Admin | #770 · **25/10** cron | admin-health spec | **PASS** | **PASS** | — |

**Nota:** PRs **#790** / **#791** (docs R-PAY-STG-4 / cron PROD) **não** obrigam repetição de smokes pay — só se o **fluxo** ou **deploy** relevante mudou.

**G1.2 (smoke humano formal):** **Por iniciar** — usar este guião como script; registar resultado no [`TODOdoDIA.md`](../../TODOdoDIA.md).

---

## Referências cruzadas

| Documento | Uso |
|-----------|-----|
| [`PILOT_STRIPE_STAGING_CHECKLIST.md`](PILOT_STRIPE_STAGING_CHECKLIST.md) | Cenários A–J · cartões · webhook |
| [`DEMO_MANEL_2_SETEMBRO.md`](../archive/ops/DEMO_MANEL_2_SETEMBRO.md) | Trilho B passo a passo |
| [`STAGING_A2-02_RUNBOOK.md`](../ops/STAGING_A2-02_RUNBOOK.md) | Infra STG · baseline |
| [`W1_PROD_SMOKE.md`](../ops/W1_PROD_SMOKE.md) | Cron/webhook ops PROD |
| [`ROADMAP_FINAL_ENTREGA_TVDE_2026.md`](../ROADMAP_FINAL_ENTREGA_TVDE_2026.md) | G1 · Marco 2 |
