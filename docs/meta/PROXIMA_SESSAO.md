# PROXIMA_SESSAO.md — Handoff

Contexto curto para a próxima sessão. **Lista operacional:** painel **PRÓXIMA SESSÃO** em [`TODOdoDIA.md`](../../TODOdoDIA.md).

**Histórico completo (fechos Abril–Maio, Seções A–E):** `C:\dev\_archives\APP\docs-2026-06\lote-3\PROXIMA_SESSAO.md`

**Plano operacional Julho:** [`FORWARD_PLAN_2026-07.md`](../ops/FORWARD_PLAN_2026-07.md)

---

## Contexto actual (**2026-07-19** — pagamentos + O-SECURITY fechados)

### Checkpoint — [`CHECKPOINT_2026-07-19_PAYMENTS_STUCK.md`](../ops/CHECKPOINT_2026-07-19_PAYMENTS_STUCK.md)

| Item | Estado |
|------|--------|
| **`main` / `origin/main`** | `77ddfac` |
| **PRs abertas** | **0** |
| **CI `main`** | Verde |
| **PAYMENTS-STUCK-1A/1B** | **PASS** (#417 / #418 + apply 41+10) |
| **PAYMENTS-EDGE-1/2** | **PASS** — health limpa |
| **O-SECURITY** | **PASS** — password SA rodada via `/auth/me/password` |
| **Saúde** | **`ok`** — stuck/missing/inconsistent = 0 |
| **ADMIN-OPS-1 Fase 0** | Fechada — [`ADMIN_OPS_1_FASE0_SMOKE_2026-07-19.md`](../ops/ADMIN_OPS_1_FASE0_SMOKE_2026-07-19.md) |
| **#415** | TEST-DB-GUARD — [`CHECKPOINT_2026-07-19_POST_415.md`](../ops/CHECKPOINT_2026-07-19_POST_415.md) |

### Edges (resumo)

- **EDGE-2:** trip `4b29c6c9-…` → `failed` (órfã teste).  
- **EDGE-1:** payment `c58c20d4-…` → `failed`; trip `591f6827-…` cancelled; Dashboard PI `requires_payment_method`, €0; sem Stripe API / sem mexer `STRIPE_MOCK`.

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
| **R-ADMIN-ORPHAN-PANEL** | «Viagem aberta fora da lista» pós-completed — UX futura |
| **R-AGORA-SNAP** | Agora snapshot vs Viagens — não bug confirmado |
| **R-E2E-1** | Flake intermitente — monitorizar |
| **O-STRIPE-LIVE** | Futuro — conta parceiro + documentação / `sk_live_*` |
| **R-GIT-1** | ~190 branches locais — **não apagar ainda** |
| **CI-MAINT-1** | Warning Actions Node 20 deprecated — baixa prioridade |

### O que fazer a seguir (ordem — 1 carril)

1. **Admin Ops seguinte** — playbook honesty; orphan-panel UX opcional  
2. **PARTNER-FLEET-1** — assign/reassign diário / viaturas  
3. **Stripe live** — só com parceiro + docs

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
