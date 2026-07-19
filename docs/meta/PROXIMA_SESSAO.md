# PROXIMA_SESSAO.md — Handoff

Contexto curto para a próxima sessão. **Lista operacional:** painel **PRÓXIMA SESSÃO** em [`TODOdoDIA.md`](../../TODOdoDIA.md).

**Histórico completo (fechos Abril–Maio, Seções A–E):** `C:\dev\_archives\APP\docs-2026-06\lote-3\PROXIMA_SESSAO.md`

**Plano operacional Julho:** [`FORWARD_PLAN_2026-07.md`](../ops/FORWARD_PLAN_2026-07.md)

---

## Contexto actual (**2026-07-19** — pós PAYMENTS-STUCK)

### Checkpoint — [`CHECKPOINT_2026-07-19_PAYMENTS_STUCK.md`](../ops/CHECKPOINT_2026-07-19_PAYMENTS_STUCK.md)

| Item | Estado |
|------|--------|
| **`main` / `origin/main`** | `2fc46b9` |
| **PRs abertas** | **0** |
| **CI `main`** | Verde |
| **#417** / **PAYMENTS-STUCK-1A** | **PASS** — mock settle no `complete_trip` |
| **#418** / **PAYMENTS-STUCK-1B** | **PASS** — Admin close-mock + apply Render 41+10 |
| **Mock stuck antigo** | **Limpo** |
| **Saúde** | ainda `degraded` — **não** é mock (EDGE-1/2) |
| **ADMIN-OPS-1 Fase 0** | Fechada — [`ADMIN_OPS_1_FASE0_SMOKE_2026-07-19.md`](../ops/ADMIN_OPS_1_FASE0_SMOKE_2026-07-19.md) |
| **#415** | TEST-DB-GUARD — [`CHECKPOINT_2026-07-19_POST_415.md`](../ops/CHECKPOINT_2026-07-19_POST_415.md) |

### Apply 1B (resumo)

Preview/apply/pós: `41` succeeded + `10` failed · pós-preview `count=0` · só `pi_mock_*` · API Admin, sem SQL.

### Decisão produto (mantém-se)

Admin ≠ dispatcher; **Atribuir** = recovery SA; assign diário → PARTNER-FLEET-1 / matching. Ver [`BACKLOG_POST_PILOTO.md`](BACKLOG_POST_PILOTO.md).

### Entregas recentes (merged)

| PR | O quê |
|----|-------|
| **#418** | Admin cleanup mock processing (dry-run/apply) |
| **#417** | Settle mock payments on trip completion |
| **#416** | Checkpoint pós-#415 |
| **#415** | Guard pytest contra BD remota |
| **#414** | Docs ADMIN-OPS-1 Fase 0 B/C PASS |
| **#413** | Passenger recover active trip |

### Em pausa / monitorizar

| ID | Notas |
|----|-------|
| **PAYMENTS-EDGE-1** | cancelled + PI real processing — trip `591f6827-…` |
| **PAYMENTS-EDGE-2** | completed sem payment — trip `4b29c6c9-…` |
| **O-SECURITY** | Mudar password SA — **fim de sessão** |
| **R-ADMIN-ORPHAN-PANEL** | «Viagem aberta fora da lista» pós-completed — UX futura |
| **R-AGORA-SNAP** | Agora snapshot vs Viagens — não bug confirmado |
| **R-E2E-1** | Flake intermitente — monitorizar |
| **O-STRIPE-LIVE** | Bloqueado — conta parceiro / `sk_live_*` |
| **R-GIT-1** | ~190 branches locais — **não apagar ainda** |
| **CI-MAINT-1** | Warning Actions Node 20 deprecated — baixa prioridade |

### O que fazer a seguir (ordem — 1 carril)

1. **O-SECURITY** — mudar password SA  
2. **PAYMENTS-EDGE-1** / **EDGE-2** — só se prioritário (reconcile Stripe real / trip órfã)  
3. **Admin Ops seguinte** — playbook honesty; orphan-panel UX opcional  
4. **PARTNER-FLEET-1** — assign/reassign diário / viaturas  

**Ambiente:** `scripts/windows/Open-TVDE-Dev-WT.bat`. Baseline: Pax `+351912345678` · Driver `+351911111111` · Admin SA `+351924075365`. Pytest: launcher seguro / BD local.

### Specs activas

| Área | Onde |
|------|------|
| Checkpoint PAYMENTS-STUCK | [`CHECKPOINT_2026-07-19_PAYMENTS_STUCK.md`](../ops/CHECKPOINT_2026-07-19_PAYMENTS_STUCK.md) |
| Stripe / mock / 1B API | [`O_STRIPE_1_RUNBOOK.md`](../ops/O_STRIPE_1_RUNBOOK.md) §§9–10 |
| Checkpoint pós-#415 | [`CHECKPOINT_2026-07-19_POST_415.md`](../ops/CHECKPOINT_2026-07-19_POST_415.md) |
| Smoke ADMIN-OPS Fase 0 | [`ADMIN_OPS_1_FASE0_SMOKE_2026-07-19.md`](../ops/ADMIN_OPS_1_FASE0_SMOKE_2026-07-19.md) |
| Pytest BD segura | [`BACKEND_PYTEST_SAFE.md`](../testing/BACKEND_PYTEST_SAFE.md) |
| Ops Julho | [`FORWARD_PLAN_2026-07.md`](../ops/FORWARD_PLAN_2026-07.md) |
| Painel vivo | [`TODOdoDIA.md`](../../TODOdoDIA.md) |

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
