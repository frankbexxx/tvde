# PROXIMA_SESSAO.md — Handoff

Contexto curto para a próxima sessão. **Lista operacional:** painel **PRÓXIMA SESSÃO** em [`TODOdoDIA.md`](../../TODOdoDIA.md).

**Histórico completo (fechos Abril–Maio, Seções A–E):** `C:\dev\_archives\APP\docs-2026-06\lote-3\PROXIMA_SESSAO.md`

**Plano operacional Julho:** [`FORWARD_PLAN_2026-07.md`](../ops/FORWARD_PLAN_2026-07.md)

---

## Contexto actual (**2026-07-23** — OPS-UX-1 PASS funcional)

### Smoke — [`OPS_UX_1_SMOKE_PASS_2026-07-23.md`](../ops/OPS_UX_1_SMOKE_PASS_2026-07-23.md)

| Item | Estado |
|------|--------|
| **`main` / `origin/main`** | `233255e` |
| **Working tree** | Limpa |
| **OPS-UX-1A/B/C** | **PASS** (#445 · #446 · #447) |
| **Guardas trip detail** | #448 stale · #450 access-loss · #449 fechada (superseded) |
| **Smoke Pax/Driver/Partner** | **PASS** (2026-07-23) |
| **PARTNER-FLEET-1A / 2 / 3A / 3B** | **PASS** (prévio) |
| **Polish futuro** | Não blocker — mobile, densidades, Admin, docs UI |

### Decisão produto (mantém-se)

Admin ≠ dispatcher; **Atribuir** = recovery SA; assign diário → Partner fleet / matching. Ver [`BACKLOG_POST_PILOTO.md`](BACKLOG_POST_PILOTO.md).

### Entregas recentes (merged — OPS-UX-1)

| PR | O quê |
|----|-------|
| **#450** | Clear trip detail após 401/403/404 |
| **#448** | Prevent stale trip refresh / navegação |
| **#447** | Home — cartão Viagem activa + Acompanhar |
| **#446** | Trip detail — Actualizar + poll leve |
| **#445** | Frota — Ver viagem |

### Em pausa / monitorizar

| ID | Notas |
|----|-------|
| **OPS-UX-POLISH** | Mobile / densidades / alertas / Home-Detail visual — não blocker |
| **PF3B-UX-FOLLOWUP** | Lista → detalhe documentos |
| **ADMIN-OPS-UX** | Acompanhar / refresh Admin — opção B |
| **R-ADMIN-ORPHAN-PANEL** | «Viagem aberta fora da lista» pós-completed |
| **R-E2E-1** | Flake intermitente — monitorizar |
| **O-STRIPE-LIVE** | Futuro — conta parceiro + documentação |
| **R-GIT-1** | Branches locais — **não apagar ainda** |
| **CI-MAINT-1** | Warning Actions Node 20 deprecated — baixa prioridade |

### O que fazer a seguir (ordem — 1 carril)

1. **PF3C** — alertas de caducidade (badges / resumo; sem gates)  
2. **Admin OPS-UX** leve — Acompanhar / refresh  
3. **Polish mobile Partner** — Home, detail, frota, documentos  
4. **Smoke alargado** Pax+Driver+Partner+Admin  

**Ambiente:** `scripts/windows/Open-TVDE-Dev-WT.bat`. Baseline: Pax `+351912345678` · Driver `+351911111111` · Admin SA `+351924075365`. Pytest: launcher seguro / BD local.

### Specs activas

| Área | Onde |
|------|------|
| OPS-UX-1 smoke PASS | [`OPS_UX_1_SMOKE_PASS_2026-07-23.md`](../ops/OPS_UX_1_SMOKE_PASS_2026-07-23.md) |
| Checkpoint Partner-Fleet 2026-07-22 | [`CHECKPOINT_2026-07-22_PARTNER_FLEET.md`](../ops/CHECKPOINT_2026-07-22_PARTNER_FLEET.md) |
| PF3B smoke | [`PARTNER_FLEET_3B_SMOKE_2026-07-22.md`](../ops/PARTNER_FLEET_3B_SMOKE_2026-07-22.md) |
| PF3 documentos | [`PARTNER_FLEET_3_VEHICLE_DOCUMENTS.md`](../ops/PARTNER_FLEET_3_VEHICLE_DOCUMENTS.md) |
| Checkpoint PAYMENTS-STUCK | [`CHECKPOINT_2026-07-19_PAYMENTS_STUCK.md`](../ops/CHECKPOINT_2026-07-19_PAYMENTS_STUCK.md) |
| Stripe / mock / 1B API | [`O_STRIPE_1_RUNBOOK.md`](../ops/O_STRIPE_1_RUNBOOK.md) §§9–10 |
| Pytest BD segura | [`BACKEND_PYTEST_SAFE.md`](../testing/BACKEND_PYTEST_SAFE.md) |
| Ops Julho | [`FORWARD_PLAN_2026-07.md`](../ops/FORWARD_PLAN_2026-07.md) |
| Painel vivo | [`TODOdoDIA.md`](../../TODOdoDIA.md) |

---

## Contexto anterior (**2026-07-22** — Partner-Fleet 3B PASS + hardenings)

### Checkpoint — [`CHECKPOINT_2026-07-22_PARTNER_FLEET.md`](../ops/CHECKPOINT_2026-07-22_PARTNER_FLEET.md)

| Item | Estado |
|------|--------|
| **`main`** | `8c7cc9e` (histórico) |
| **PARTNER-FLEET-3B** | **PASS** |
| **OPS-UX-1** | Era dívida → **PASS** em 2026-07-23 |

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
