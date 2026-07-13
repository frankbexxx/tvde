# Plano operacional pós-piloto — Julho 2026

**Objectivo:** inventário exaustivo do que está **aberto** nos `.md` do repo + visão de prioridades para partilha com ChatGPT / equipa.  
**Última actualização:** 2026-07-13 (P5 ops: **O-STRIPE-1** Fase A local concluída — webhook Stripe test mode; **TVDE-PROD** gate P5 fechado).

**Ficheiros canónicos vivos:** [`TODOdoDIA.md`](../../TODOdoDIA.md) · [`PROXIMA_SESSAO.md`](../meta/PROXIMA_SESSAO.md) · [`TODO_CODIGO_TVDE.md`](../TODO_CODIGO_TVDE.md)

---

## 0. O que fechámos recentemente (contexto)

| Área | Estado |
|------|--------|
| Matching / disponibilidade UI | PRs **#386–#388** em `main` |
| Auth hardening | PRs **#389–#393** + **#394** + **#397** em `main` (OTP, throttle, log, beta capacity, Stripe prod guard) |
| Bot merges Jul | **#392** docs motorista · **#395** fechada (dup #397) |
| Vars prod | Auditadas; **secrets rodados 2026-07-12** (valores só no Render / password manager) |
| Smoke UI prod | Login → docs → partner → online → viagem fresca → **em viagem → concluída** |
| **S-PROD-2** | **OK** — smoke curto pós-rotação (login passageiro/motorista, online, GPS, viagem, oferta, aceite/cancel) |
| Backlog BD | Admin cancelou viagens antigas; BETA auto-assign explicado |
| **Cron produção** | **OK** — cron-job.org activo; 200 OK **pós-rotação** `CRON_SECRET` |
| **`ENABLE_DEV_TOOLS`** | **OK** — `false` no painel Render; `/health?diagnostic=1` → `dev_tools: false`, `beta_mode: true` |
| **Health API** | **OK** — `https://tvde-api-fd2z.onrender.com/health?diagnostic=1` validado pós-rotação |
| **O-ROTATE-1** | **OK** — 4 secrets rodados; backfill 9 contas teste; login teste OK; conta real preservada |
| **Browsers teste** | **OK** — matriz: Chrome, Vivaldi, Firefox; **Midori removido** (ruído GPS) |
| **TVDE-BKP** | **OK** — PITR 3d + export lógico; `pg_dump` + restore Docker local validados — [`TVDE_BKP_RUNBOOK.md`](TVDE_BKP_RUNBOOK.md) |
| **O-STRIPE-1** | **OK** — Fase A local: webhook assinatura + fluxo PI real test mode — [`O_STRIPE_1_RUNBOOK.md`](O_STRIPE_1_RUNBOOK.md) |
| **TVDE-PROD** | **OK** (gate P5 beta) | Piloto: `STRIPE_MOCK=true` em prod; live/parceiro fora de scope |

---

## 1. Painel operacional — [`TODOdoDIA.md`](../../TODOdoDIA.md)

### P0 — produto (aberto)

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **O-i18n-NICHOS** | Strings PT residuais em EN — batch 1 A–F | **Smoke pendente** | PR **#362** |

### P1 — infra / gates

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **A2-02-1** | OAuth staging + URIs Google | **Em curso** | [`STAGING_A2-02_RUNBOOK.md`](STAGING_A2-02_RUNBOOK.md) |
| **A2-02-2** | Smokes assertivos staging | **Por iniciar** | Depende A2-02-1 |
| **A4** | Fecho onda auditoria A+L | **Por iniciar** | [`AUDIT_EXEC_BACKLOG_AL_2026-05.md`](../audit/AUDIT_EXEC_BACKLOG_AL_2026-05.md) |
| **A3-R** | Gate §A3 checklist staging verde | **Em curso** | Humanos |

### P2 — UX / evolução

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **O-UX20-1** | Desenho UX 2.0 motorista | **Por iniciar** | [`DRIVER_UX_2_0.md`](../product/DRIVER_UX_2_0.md) |
| **R-LEGACY-1** | Layout legacy `!driverBottomNav` | **Por iniciar** | [`driver-ux-fixes-backlog.md`](../ux/driver-ux-fixes-backlog.md) |

### P5 — operação pré-escala

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **TVDE-PROD** | `PROD_VALIDATION` | **Concluído** | Gate P5 beta ✅ · prod `STRIPE_MOCK=true` · live keys pós-parceiro |
| **O-CRON-1** | Cron-job.org → `GET /cron/jobs` 200 | **Concluído** | 2026-07-11; 200 OK pós-rotação secret |
| **O-RENDER-1** | `ENABLE_DEV_TOOLS=false` tvde-api | **Concluído** | 2026-07-11; health validado pós-rotação |
| **O-ROTATE-1** | Rotação secrets prod + backfill teste | **Concluído** | 2026-07-12; ver §14 |
| **S-PROD-2** | Smoke prod pós-rotação | **Concluído** | 2026-07-12; viagem curta OK — ver §14 |
| **TVDE-BKP** | Backups + restore test | **Concluído** | 2026-07-12; [`TVDE_BKP_RUNBOOK.md`](TVDE_BKP_RUNBOOK.md) |
| **O-STRIPE-1** | Webhook Stripe assertivo (test mode) | **Concluído** | 2026-07-13; Fase A local — [`O_STRIPE_1_RUNBOOK.md`](O_STRIPE_1_RUNBOOK.md) |
| **R-E2E-1** | Flake `driver-passenger-flow.spec.ts:577` | **Por iniciar** | PR **#398** draft — rever depois |
| **TVDE-STG** | Staging `smoke_validation` | **Por iniciar** | [`TODO_CODIGO_TVDE.md`](../TODO_CODIGO_TVDE.md) §2 |

**Regra do painel:** escolher **1 carril** (P0 vs P1 vs P5) antes de codar.

---

## 2. Checklist técnico — [`TODO_CODIGO_TVDE.md`](../TODO_CODIGO_TVDE.md)

Árvore completa (10 blocos). Estado resumido pós-smoke:

| Bloco | Conteúdo | Estado |
|-------|----------|--------|
| **§1 PROD_VALIDATION** | webhook Stripe, cron, env, e2e real | **Concluído** (gate beta) — webhook test mode ✅ Fase A; prod `STRIPE_MOCK=true`; live pós-parceiro |
| **§2 STAGING** | infra isolada, stripe test, smokes | **Por iniciar** |
| **§3 BACKUPS** | pg_dump + restore testado | **Concluído** | 2026-07-12 · [`TVDE_BKP_RUNBOOK.md`](TVDE_BKP_RUNBOOK.md) |
| **§4 MIGRATIONS** | A025 em todas DBs, integridade dados | **Verificar** |
| **§5 HARDENING** | CORS, dev endpoints OFF, auth | **Parcial** — `ENABLE_DEV_TOOLS=false` no painel; `/debug/*` ainda ON com BETA |
| **§6 OBSERVABILITY** | logs, system-health, alerting | **Parcial** — Sentry ON; alerting mínimo em falta |
| **§7 TESTS** | webhook sim, flows críticos, concurrency | **Parcial** — pytest/E2E CI OK; gaps pontuais |
| **§8 DEPENDENCIES** | pip-audit, pins | **Por iniciar** |
| **§9 INTEGRATIONS** | Stripe idempotência, OSRM, rate limit | **Parcial** |
| **§10 CLEANUP** | código morto, logs debug, configs | **Por iniciar** |

**Regra:** nada em PROD “comercial” sem passar STAGING (webhook + cron + e2e).

---

## 3. Handoff — [`PROXIMA_SESSAO.md`](../meta/PROXIMA_SESSAO.md)

Carrís sugeridos (actualizar após esta sessão):

1. **P5 ops** — ~~fechado~~ ✅ (cron · dev tools · secrets · smoke · TVDE-BKP · O-STRIPE-1 Fase A)
2. **P1 staging** — A2-02 OAuth + smokes
3. **P0 produto** — O-i18n-NICHOS smoke #362

Operação: [`CRON_JOB_ORG_INSTRUCOES.md`](../CRON_JOB_ORG_INSTRUCOES.md) · [`W1_PROD_SMOKE.md`](W1_PROD_SMOKE.md) · [`A033_B_VALIDATION_HARDENING_PLAYBOOK.md`](../prompts/A033_B_VALIDATION_HARDENING_PLAYBOOK.md)

---

## 4. Backlog pós-piloto — [`BACKLOG_POST_PILOTO.md`](../meta/BACKLOG_POST_PILOTO.md)

| ID | Item | Prioridade |
|----|------|------------|
| **P1.1** | Admin mini-mapa viagem activa | Alta pós-retro |
| **P1.2** | Cleanup users alpha vs comercial (blocked vs DELETE, RGPD) | Alta — decisão produto |
| **P1.3** | WhatsApp Live Location → produto | Parquear até P1.1 |
| **P1.4** | Tutorial com prints (onboarding) | Média |
| **P2.1** | StatusHeader contraste dark | Polish |
| **P2.3** | Painel GPS verboso motorista | Pós-piloto |
| **P3.1** | ruff format `sentry.py` | Trivial |
| **P3.2** | Test hardening (geolocation, nav, etc.) | ~90 min |
| **P3.3** | Waze deep link | Baixa prioridade |

**Checkboxes abertos em P1.2:** decisão A vs B; migração schema users; onboarding obrigatório; política `DEFAULT_PASSWORD`.

---

## 5. UI visibilidade — [`UI_VISIBILITY_IMPLEMENTATION_TODO.md`](../meta/UI_VISIBILITY_IMPLEMENTATION_TODO.md)

| Passo | Item | Estado |
|-------|------|--------|
| 0–1 | Inventário + touch targets mobile | **Concluído** |
| **2** | Playwright extra (A5 bulk, P1 cancel UI) | **Por iniciar** |
| **3** | Smoke telemóvel após PR relevante | **Por iniciar** |

Gaps `parcial`: A3 saúde mobile device; A5 bulk/filtros; P2 erros acionáveis.

---

## 6. TODO futuro macro — [`TODO_FUTURO.md`](../TODO_FUTURO.md) + [`todo-futuro-nuances.md`](../todo-futuro-nuances.md)

### [`TODO_FUTURO.md`](../TODO_FUTURO.md) — secção D (10 itens)

- [ ] OTP/roles — contrato + testes idempotência
- [ ] Guideline queries tenant (PR checklist)
- [ ] Observabilidade — `request_id` → logs
- [ ] Runner — menos config manual
- [ ] UI — zero regras de negócio no React
- [ ] Produto — afiliação histórica vs actual
- [ ] Testes misuse / edge cases humanos
- [ ] Deploy runbook CORS/env
- [ ] G006 inventário OpenAPI
- [ ] Inputs externos (pentest, carga, Stripe prod)

### [`todo-futuro-nuances.md`](../todo-futuro-nuances.md) — produto/GPS

- [ ] Fila pilot-commercial A001–A003+ (parceiro critical path)
- [ ] Edge case: motorista no pin vs passageiro indoor
- [ ] Raio/histerese configuráveis (50→70 m)
- [ ] Níveis 1–3 proximidade pickup
- [ ] Pickup como fonte de verdade persistida

---

## 7. Produto Manel + legal — [`MANEL_E_LEGAL_EXTRA_BACKLOG_2026-05.md`](../product/MANEL_E_LEGAL_EXTRA_BACKLOG_2026-05.md)

| Item | Tema | Estado |
|------|------|--------|
| 1–3, 10 | Som, dark, wake lock, menu passageiro | **Entregue** (#285) |
| 4 | Rating passageiro removido do motorista | **Entregue** — copy jurídico em aberto |
| 5–6 | Docs partner/driver + caducidade | **MVP** — OCR/notificações evolução |
| 7 | QR download | **Parcial** — `/download` OK; deep links TBD |
| 8–9 | Promo / Família | **Futuro** |
| **Aberto** | Fonte normativa item 4; destino QR lojas; histórico 1 toque | Jurídico/produto |

---

## 8. Auditoria executável — [`AUDIT_EXEC_BACKLOG_AL_2026-05.md`](../audit/AUDIT_EXEC_BACKLOG_AL_2026-05.md)

### A2 backlog (selecção P1/P2 ainda aberta)

| ID | Item | P |
|----|------|---|
| A2-05 | bandit + pip-audit em CI | P1 |
| A2-06 | Backups Postgres + restore doc | P1 | **Concluído** — [`TVDE_BKP_RUNBOOK.md`](TVDE_BKP_RUNBOOK.md) |
| A2-07 | Incident runbook | P1 |
| A2-08 | Pentest light + RBAC | P1 |
| A2-09 | pytest-cov gate | P1 |
| A2-10 | render.yaml / IaC | P2 |
| A2-11 | PostGIS + realtime distribuído | P2 |
| A2-12 | Connect + SMS OTP + 3DS | P2 |

### Gate A3 (checkbox aberto)

- [ ] **A2-02 operacional:** `GOOGLE_OAUTH_*` staging + smokes assertivos

---

## 9. UX motorista — [`driver-ux-fixes-backlog.md`](../ux/driver-ux-fixes-backlog.md)

| Item | Estado |
|------|--------|
| TODO-LEGACY `!driverBottomNav` | Pendente (opcional) |
| Copy «Sem viagens» vs «Sem pedidos» | Pendente (opcional) |
| Clusters C–F (VAM) | Pendente com Frank |
| TW-01…06 tweaks | Fila screenshots |

---

## 10. Runbooks e checklists com `[ ]` abertos

| Ficheiro | Pendências principais |
|----------|----------------------|
| [`deploy/PREPARACAO_RENDER.md`](../deploy/PREPARACAO_RENDER.md) | 11 checkboxes deploy inicial |
| [`ops/STAGING_A2-02_RUNBOOK.md`](STAGING_A2-02_RUNBOOK.md) | OAuth staging, smokes, dev tools policy |
| [`ops/O_STRIPE_1_RUNBOOK.md`](O_STRIPE_1_RUNBOOK.md) | Webhook Stripe Fase A local (2026-07-13 ✅) |
| [`ops/TVDE_BKP_RUNBOOK.md`](TVDE_BKP_RUNBOOK.md) | Backups Postgres + restore test (2026-07-12 ✅) |
| [`ops/W1_PROD_SMOKE.md`](W1_PROD_SMOKE.md) | Cron ✅; secrets ✅; smoke ✅; backups ✅; webhook Fase A local ✅ |
| [`ops/W2_RUNBOOK.md`](W2_RUNBOOK.md) | Registo hora/resultado smokes manuais |
| [`testing/GUIA_TESTES.md`](../testing/GUIA_TESTES.md) | ~20 passos manuais por fluxo |
| [`testing/VALIDACAO_HUMANA_CAMPO.md`](../testing/VALIDACAO_HUMANA_CAMPO.md) | 6 itens campo |
| [`GITHUB_MANUAL_TVDE.md`](../GITHUB_MANUAL_TVDE.md) | 10 itens processo Git |
| [`prompts/A026_OPERACAO_OPS.md`](../prompts/A026_OPERACAO_OPS.md) | Cron auto, trips não presas, system-health, rotina sem manual |
| [`TVDE_BACKEND_PROXIMOS_PASSOS_OBSERVABILIDADE.md`](../TVDE_BACKEND_PROXIMOS_PASSOS_OBSERVABILIDADE.md) | Payment/trip consistency checks |
| [`product/DRIVER_HOME_TOP3_MANEL.md`](../product/DRIVER_HOME_TOP3_MANEL.md) | 5 critérios smoke pós-refactor |
| [`product/DRIVER_MENU_SPEC.md`](../product/DRIVER_MENU_SPEC.md) | Workflow docs admin antes de estado oficial |

---

## 11. Piloto comercial (prompts) — [`prompts/pilot-commercial/`](../prompts/pilot-commercial/)

**Fase 0** (A001–A003) redigida; **A004+** em placeholder. Fila longa: partner UX, RBAC, multi-tenant, alertas, relatórios semanais, usage summary, etc. Ver [`IMPLEMENTATION_SEQUENCE.md`](../prompts/pilot-commercial/IMPLEMENTATION_SEQUENCE.md).

**Não duplicar aqui** — tratar como roadmap produto B2B separado do fecho ops P5.

---

## 12. Visão Cursor (síntese para ChatGPT)

### Onde estamos

O **núcleo de produto funciona em produção** — não é MVP de papel. O gargalo deixou de ser “código partido” e passou a ser **operação + higiene de dados + escala controlada**.

### Prioridade recomendada (próximas 2–4 semanas)

| Ordem | Carril | Porquê |
|-------|--------|--------|
| **1** | **P1 staging** | P5 beta fechado — OAuth A2-02 + smokes assertivos |
| **2** | **Hardening BETA** | Planear desligar `/debug/*` (O-DEBUG-1) |
| **3** | **R-E2E-1** | Flake proximity E2E — PR **#398** |
| **4** | **P0 polish** | i18n nichos #362 |
| **5** | **Stripe live** | Conta parceiro + `sk_live_*` — fora do gate P5 actual |

### O que não fazer agora

- Bundle prompts pilot-commercial inteiro
- PostGIS / realtime distribuído
- React Native / app stores
- Feature parity Uber

### Risco residual #1

**Dados de teste em prod** (viagens, offers, users) → cron activo reduz ofertas/viagens presas; ainda pode confundir smokes. Complementar com política de cancelamento + eventual script de limpeza test trips.

### Risco residual #2

**BETA_MODE auto-assign** (`requested` → `assigned` a cada GPS) é útil em piloto mas **não escala**. Documentar ou desactivar quando multi-offer estiver estável com motoristas reais.

---

## 13. PRs Cursor Bot — estado (2026-07-12)

| PR | Título | Estado |
|----|--------|--------|
| **#389–#393** | Auth OTP persist / throttle / log | **Merged** |
| **#394** | pending beta users / capacity | **Merged** (`dfcbf39`) |
| **#397** | block dev Stripe test card in prod | **Merged** (`1331414`) |
| **#392** | driver docs → pending_review on replace | **Merged** (`a150b78`) |
| **#395** | dup Stripe test card | **Closed** (dup #397) |
| **#398** | harden active trip recovery after reload | **Draft** — rever depois |

**Aberta:** só **#398**.  
**Merged nesta onda:** #387–#394, #397, #392, #393. **Fechadas redundantes:** #379, #380, #385, #395.

---

## 14. Próxima sessão — acções concretas

| ID | Acção | Estado | Notas |
|----|-------|--------|-------|
| **O-CRON-1** | Cron-job.org → `GET /cron/jobs` 200 | **Concluído** | 2026-07-11 |
| **O-RENDER-1** | `ENABLE_DEV_TOOLS=false` tvde-api | **Concluído** | 2026-07-11 |
| **R-BOT-1** | Review + merge bot PRs auth/payments/docs | **Concluído** | #389–#394, #397, #392 |
| **O-ROTATE-1** | Rotação secrets prod (4 vars) | **Concluído** | 2026-07-12; Frank manual |
| **O-ROTATE-B** | `CRON_SECRET` Render + cron-job.org header | **Concluído** | Cron 200 OK pós-rotação |
| **O-ROTATE-C** | `OTP_SECRET` Render + health | **Concluído** | OTPs pendentes invalidados |
| **O-ROTATE-D** | `JWT_SECRET_KEY` Render + health | **Concluído** | Sessões antigas invalidadas |
| **O-ROTATE-E** | `TEST_ACCOUNT_PASSWORD` Render | **Concluído** | Nova pwd só no Render |
| **O-ROTATE-F** | `backfill_test_accounts.py` prod | **Concluído** | 9 test · 1 real preservado |
| **O-ROTATE-G** | Smoke login contas teste | **Concluído** | passageiro / motorista / partner OK |
| **S-PROD-2** | Smoke prod pós-rotação | **Concluído** | 2026-07-12; Frank manual — ver abaixo |
| **S-PROD-2a** | Health `/health?diagnostic=1` | **Concluído** | `status: ok`, `dev_tools: false`, `beta_mode: true` |
| **S-PROD-2b** | Cron pós-rotação | **Concluído** | cron-job.org activo; execuções 200 OK |
| **S-PROD-2c** | Viagem curta prod | **Concluído** | login P/M · online · GPS · pedido · oferta · aceite/cancel OK |
| **O-BROWSER-1** | Matriz browsers teste manual | **Concluído** | Chrome, Vivaldi, Firefox; Midori removido (GPS) |
| **TVDE-BKP** | Backups + restore test | **Concluído** | 2026-07-12; pg_dump + restore Docker :5433 — [`TVDE_BKP_RUNBOOK.md`](TVDE_BKP_RUNBOOK.md) §7 |
| **TVDE-BKP-a** | Render PITR + export lógico | **Concluído** | PITR 3d · Basic-256mb · export 7d retenção |
| **TVDE-BKP-b** | `pg_dump` manual | **Concluído** | CUSTOM · PG 18.3 · ~149 KB |
| **TVDE-BKP-c** | Restore local isolado | **Concluído** | Docker postgres:18 · sem erros fatais |
| **TVDE-BKP-d** | Validação schema/dados | **Concluído** | alembic `b5c6d7e8f9a0` · real + testes OK |
| **O-STRIPE-1** | Webhook Stripe assertivo (test mode) | **Concluído** | 2026-07-13; Fase A local — [`O_STRIPE_1_RUNBOOK.md`](O_STRIPE_1_RUNBOOK.md) §8 |
| **O-STRIPE-1a** | T0/T1 assinatura webhook | **Concluído** | 422 sem header · 401 inválida |
| **O-STRIPE-1b** | T2 trigger sem PI na BD | **Concluído** | 200 ack · sem mutação |
| **O-STRIPE-1c** | T3b fluxo PI real + succeeded | **Concluído** | trip `5629c3fa-…` · payment succeeded |
| **O-STRIPE-1d** | `.env` Render vs local | **Concluído** | Incidente detectado; `looks_render: false` antes de retomar |
| **O-STRIPE-LIVE** | Stripe live / conta parceiro | **Bloqueado** | Fora do gate P5 beta |
| **O-DEBUG-1** | Planear desligar `/debug/*` pós-BETA | **Por iniciar** | Decisão produto |
| **R-E2E-1** | Flake `driver-passenger-flow.spec.ts:577` | **Por iniciar** | PR **#398** — não bloqueia agora |

---

## 15. Mapa de ficheiros `.md` por função

| Função | Onde |
|--------|------|
| **Dia a dia** | `TODOdoDIA.md`, `PROXIMA_SESSAO.md` |
| **Ops / deploy** | `docs/ops/*`, `CRON_JOB_ORG_INSTRUCOES.md`, `ENV_SINGLE_REALITY.md` |
| **Checklist pré-escala** | `TODO_CODIGO_TVDE.md`, `A033_B_*` |
| **Produto / UX** | `docs/product/*`, `docs/ux/*` |
| **Auditoria** | `docs/audit/*`, `TODO_FUTURO.md` |
| **Testes manuais** | `docs/testing/*` |
| **Prompts implementação** | `docs/prompts/*`, `pilot-commercial/*` |
| **Índice** | `docs/meta/DOCS_INDEX.md` |

---

*Documento para partilha externa (ChatGPT): secções 0, 1–2, 12–14 são o núcleo; secções 3–11 são inventário de referência.*
