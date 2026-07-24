# PROXIMA_SESSAO.md — Handoff

Contexto curto para a próxima sessão. **Lista operacional:** painel **PRÓXIMA SESSÃO** em [`TODOdoDIA.md`](../../TODOdoDIA.md).

**Histórico completo (fechos Abril–Maio, Seções A–E):** `C:\dev\_archives\APP\docs-2026-06\lote-3\PROXIMA_SESSAO.md`

**Plano operacional Julho:** [`FORWARD_PLAN_2026-07.md`](../ops/FORWARD_PLAN_2026-07.md)

---

## Contexto actual (**2026-07-24** — PF3C PASS funcional)

### Smoke — [`PF3C_VEHICLE_DOCUMENT_ALERTS_SMOKE_PASS_2026-07-24.md`](../ops/PF3C_VEHICLE_DOCUMENT_ALERTS_SMOKE_PASS_2026-07-24.md)

| Item | Estado |
|------|--------|
| **`main` / `origin/main`** | `bd2664c` |
| **Working tree** | Limpa |
| **PF3C-1 / 2A / 2B / 2B-FIX / 3** | **PASS** (#452 · #453 · #454 · #455 · #456) |
| **Smoke visual Home + Viaturas + painel** | **PASS** (2026-07-24) |
| **PARTNER-FLEET-1A / 2 / 3A / 3B** | **PASS** (prévio) |
| **OPS-UX-1** | **PASS** (prévio) |
| **Polish futuro** | Não blocker — densidades, alertas mobile, Documentos UX |

### Decisão produto (mantém-se)

Admin ≠ dispatcher; **Atribuir** = recovery SA; assign diário → Partner fleet / matching. Ver [`BACKLOG_POST_PILOTO.md`](BACKLOG_POST_PILOTO.md).

### Entregas recentes (merged — PF3C)

| PR | O quê |
|----|-------|
| **#456** | Home — alerta Documentos de viaturas + Ver viaturas |
| **#455** | Pluralização badges missing (1 doc / N docs) |
| **#454** | Badges documentais na lista Viaturas |
| **#453** | Backend `document_summary` + batch |
| **#452** | Helpers FE summary + pin ruff 0.15.22 |

### Em pausa / monitorizar

| ID | Notas |
|----|-------|
| **PF3D** | Compliance gates documentais — só quando produto pedir |
| **PF3B-UX-FOLLOWUP** | Lista → detalhe documentos |
| **OPS-UX-POLISH** | Mobile / densidades / alertas Home — não blocker |
| **ADMIN-OPS-UX** | Acompanhar / refresh Admin · docs Admin |
| **CHORE-LINT-1** | Avaliar Ruff 0.16 — baixa prioridade |
| **R-ADMIN-ORPHAN-PANEL** | «Viagem aberta fora da lista» pós-completed |
| **R-E2E-1** | Flake intermitente — monitorizar |
| **O-STRIPE-LIVE** | Futuro — conta parceiro + documentação |
| **R-GIT-1** | Branches locais — **não apagar ainda** |
| **CI-MAINT-1** | Warning Actions Node 20 deprecated — baixa prioridade |

### O que fazer a seguir (ordem — 1 carril)

1. **Admin OPS-UX** leve — Acompanhar / refresh / docs visibility  
2. **Polish mobile Partner** — Home, Viaturas, Documentos  
3. **PF3D** — compliance gates (só se produto pedir)  
4. **Smoke alargado** Pax+Driver+Partner+Admin  
5. **CHORE-LINT-1** — Ruff 0.16 (opcional)

**Ambiente:** `scripts/windows/Open-TVDE-Dev-WT.bat`. Baseline: Pax `+351912345678` · Driver `+351911111111` · Admin SA `+351924075365`. Pytest: launcher seguro / BD local.

### Specs activas

| Área | Onde |
|------|------|
| PF3C smoke PASS | [`PF3C_VEHICLE_DOCUMENT_ALERTS_SMOKE_PASS_2026-07-24.md`](../ops/PF3C_VEHICLE_DOCUMENT_ALERTS_SMOKE_PASS_2026-07-24.md) |
| PF3 documentos (cadeia) | [`PARTNER_FLEET_3_VEHICLE_DOCUMENTS.md`](../ops/PARTNER_FLEET_3_VEHICLE_DOCUMENTS.md) |
| OPS-UX-1 smoke PASS | [`OPS_UX_1_SMOKE_PASS_2026-07-23.md`](../ops/OPS_UX_1_SMOKE_PASS_2026-07-23.md) |
| Checkpoint Partner-Fleet 2026-07-22 | [`CHECKPOINT_2026-07-22_PARTNER_FLEET.md`](../ops/CHECKPOINT_2026-07-22_PARTNER_FLEET.md) |
| PF3B smoke | [`PARTNER_FLEET_3B_SMOKE_2026-07-22.md`](../ops/PARTNER_FLEET_3B_SMOKE_2026-07-22.md) |
| Checkpoint PAYMENTS-STUCK | [`CHECKPOINT_2026-07-19_PAYMENTS_STUCK.md`](../ops/CHECKPOINT_2026-07-19_PAYMENTS_STUCK.md) |
| Stripe / mock / 1B API | [`O_STRIPE_1_RUNBOOK.md`](../ops/O_STRIPE_1_RUNBOOK.md) §§9–10 |
| Pytest BD segura | [`BACKEND_PYTEST_SAFE.md`](../testing/BACKEND_PYTEST_SAFE.md) |
| Ops Julho | [`FORWARD_PLAN_2026-07.md`](../ops/FORWARD_PLAN_2026-07.md) |
| Painel vivo | [`TODOdoDIA.md`](../../TODOdoDIA.md) |

---

## Contexto anterior (**2026-07-23** — OPS-UX-1 PASS funcional)

### Smoke — [`OPS_UX_1_SMOKE_PASS_2026-07-23.md`](../ops/OPS_UX_1_SMOKE_PASS_2026-07-23.md)

| Item | Estado |
|------|--------|
| **`main`** | `233255e` (histórico; tip actual `bd2664c`) |
| **OPS-UX-1A/B/C** | **PASS** |
| **PF3C** | Era próximo → **PASS** em 2026-07-24 |

---

## Contexto anterior (**2026-07-22** — Partner-Fleet 3B PASS + hardenings)

### Checkpoint — [`CHECKPOINT_2026-07-22_PARTNER_FLEET.md`](../ops/CHECKPOINT_2026-07-22_PARTNER_FLEET.md)

| Item | Estado |
|------|--------|
| **PARTNER-FLEET-3B** | **PASS** |
| **OPS-UX-1 / PF3C** | Seguidos e fechados |

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
