# PROXIMA_SESSAO.md — Handoff

Contexto curto para a próxima sessão. **Lista operacional:** painel **PRÓXIMA SESSÃO** em [`TODOdoDIA.md`](../../TODOdoDIA.md).

**Histórico completo (fechos Abril–Maio, Seções A–E):** `C:\dev\_archives\APP\docs-2026-06\lote-3\PROXIMA_SESSAO.md`

**Plano operacional Julho:** [`FORWARD_PLAN_2026-07.md`](../ops/FORWARD_PLAN_2026-07.md)

---

## Contexto actual (**2026-07-22** — Partner-Fleet 3B PASS + hardenings)

### Checkpoint — [`CHECKPOINT_2026-07-22_PARTNER_FLEET.md`](../ops/CHECKPOINT_2026-07-22_PARTNER_FLEET.md)

| Item | Estado |
|------|--------|
| **`main` / `origin/main`** | `8c7cc9e` |
| **Working tree** | Limpa |
| **PARTNER-FLEET-1A / 2** | **PASS** |
| **PARTNER-FLEET-3A / 3B** | **PASS** (UI + smoke docs [#443](https://github.com/frankbexxx/tvde/pull/443)) |
| **Smoke geral Pax/Driver/Partner** | **PASS** |
| **Hardenings concorrência** | #430 · #434 · #438 · #442 · #439 em `main` |
| **OPS-UX-1** | Dívida — navegação viagem activa Partner/Admin |
| **PF3B-UX-FOLLOWUP** | Dívida — painel documentos denso |

### Decisão produto (mantém-se)

Admin ≠ dispatcher; **Atribuir** = recovery SA; assign diário → Partner fleet / matching. Ver [`BACKLOG_POST_PILOTO.md`](BACKLOG_POST_PILOTO.md).

### Entregas recentes (merged — fase Partner-Fleet)

| PR | O quê |
|----|-------|
| **#439** | Timeout assigned→requested não clobber reassign |
| **#442** | Serialize acceptance × fleet transfers |
| **#443** | Docs PF3B smoke PASS |
| **#441** | Expiry documentos por data UTC |
| **#440** | Harden upload UX documentos |
| **#435** | PF3B UI documentos viatura |
| **#432** | PF3A backend documentos viatura |

### Em pausa / monitorizar

| ID | Notas |
|----|-------|
| **OPS-UX-1** | Acompanhar viagem activa — mobile-first |
| **PF3B-UX-FOLLOWUP** | Lista → detalhe documentos |
| **R-ADMIN-ORPHAN-PANEL** | «Viagem aberta fora da lista» pós-completed — UX futura |
| **R-E2E-1** | Flake intermitente (ex. «iniciar viagem») — monitorizar |
| **O-STRIPE-LIVE** | Futuro — conta parceiro + documentação / `sk_live_*` |
| **R-GIT-1** | Branches locais — **não apagar ainda** |
| **CI-MAINT-1** | Warning Actions Node 20 deprecated — baixa prioridade |

### O que fazer a seguir (ordem — 1 carril)

1. **PF3C** — alertas de caducidade (badges / resumo; sem gates)  
2. **OPS-UX-1** — navegação operacional viagem activa Partner/Admin  
3. **Smoke alargado final** — Pax+Driver+Partner+Admin após hardenings  

**Ambiente:** `scripts/windows/Open-TVDE-Dev-WT.bat`. Baseline: Pax `+351912345678` · Driver `+351911111111` · Admin SA `+351924075365`. Pytest: launcher seguro / BD local.

### Specs activas

| Área | Onde |
|------|------|
| Checkpoint Partner-Fleet 2026-07-22 | [`CHECKPOINT_2026-07-22_PARTNER_FLEET.md`](../ops/CHECKPOINT_2026-07-22_PARTNER_FLEET.md) |
| PF3B smoke | [`PARTNER_FLEET_3B_SMOKE_2026-07-22.md`](../ops/PARTNER_FLEET_3B_SMOKE_2026-07-22.md) |
| PF3 documentos | [`PARTNER_FLEET_3_VEHICLE_DOCUMENTS.md`](../ops/PARTNER_FLEET_3_VEHICLE_DOCUMENTS.md) |
| Checkpoint PAYMENTS-STUCK | [`CHECKPOINT_2026-07-19_PAYMENTS_STUCK.md`](../ops/CHECKPOINT_2026-07-19_PAYMENTS_STUCK.md) |
| Stripe / mock / 1B API | [`O_STRIPE_1_RUNBOOK.md`](../ops/O_STRIPE_1_RUNBOOK.md) §§9–10 |
| Pytest BD segura | [`BACKEND_PYTEST_SAFE.md`](../testing/BACKEND_PYTEST_SAFE.md) |
| Ops Julho | [`FORWARD_PLAN_2026-07.md`](../ops/FORWARD_PLAN_2026-07.md) |
| Painel vivo | [`TODOdoDIA.md`](../../TODOdoDIA.md) |

---

## Contexto anterior (**2026-07-19** — pagamentos + O-SECURITY)

### Checkpoint — [`CHECKPOINT_2026-07-19_PAYMENTS_STUCK.md`](../ops/CHECKPOINT_2026-07-19_PAYMENTS_STUCK.md)

| Item | Estado |
|------|--------|
| **`main` / `origin/main`** | `77ddfac` (histórico) |
| **PAYMENTS-STUCK-1A/1B** | **PASS** (#417 / #418) |
| **O-SECURITY** | **PASS** |
| **ADMIN-OPS-1 Fase 0** | Fechada |
| **#415** | TEST-DB-GUARD — [`CHECKPOINT_2026-07-19_POST_415.md`](../ops/CHECKPOINT_2026-07-19_POST_415.md) |

---

## Seção F — Operação (resumo)

| Tema | Onde |
|------|------|
| Cron externo | [`CRON_JOB_ORG_INSTRUCOES.md`](../CRON_JOB_ORG_INSTRUCOES.md) |
| Smoke W1 prod | [`W1_PROD_SMOKE.md`](../ops/W1_PROD_SMOKE.md) |
| Launchers WT local | [`scripts/windows/README.md`](../../scripts/windows/README.md) |
| Stripe Fase A local | [`O_STRIPE_1_RUNBOOK.md`](../ops/O_STRIPE_1_RUNBOOK.md) |
| Fecho sessão | Testes → PR → actualizar [`TODOdoDIA.md`](../../TODOdoDIA.md) + este ficheiro |
| Validação PROD | [`A033_B_VALIDATION_HARDENING_PLAYBOOK.md`](../prompts/A033_B_VALIDATION_HARDENING_PLAYBOOK.md) |

---

## Seção G — Relatório / roadmap (resumo)

| Necessidade | Onde |
|-------------|------|
| Continuar amanhã | [`TODOdoDIA.md`](../../TODOdoDIA.md) + este ficheiro |
| Roadmap engenharia | [`TVDE_ENGINEERING_ROADMAP.md`](../architecture/TVDE_ENGINEERING_ROADMAP.md) |
| Backlog pós-piloto | [`BACKLOG_POST_PILOTO.md`](BACKLOG_POST_PILOTO.md) |
| TODO código | [`TODO_CODIGO_TVDE.md`](../TODO_CODIGO_TVDE.md) |
