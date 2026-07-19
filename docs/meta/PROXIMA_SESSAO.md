# PROXIMA_SESSAO.md — Handoff

Contexto curto para a próxima sessão. **Lista operacional:** painel **PRÓXIMA SESSÃO** em [`TODOdoDIA.md`](../../TODOdoDIA.md).

**Histórico completo (fechos Abril–Maio, Seções A–E):** `C:\dev\_archives\APP\docs-2026-06\lote-3\PROXIMA_SESSAO.md`

**Plano operacional Julho:** [`FORWARD_PLAN_2026-07.md`](../ops/FORWARD_PLAN_2026-07.md)

---

## Contexto actual (**2026-07-19**)

### Checkpoint — ADMIN-OPS-1 Fase 0 B/C PASS

| Item | Estado |
|------|--------|
| **`main` / `origin/main`** | `590aea3` |
| **PRs abertas** | **0** |
| **CI `main`** | Verde (pós-#413) |
| **S-ADMIN-OPS-0** | **PASS** — [`ADMIN_OPS_1_FASE0_SMOKE_2026-07-19.md`](../ops/ADMIN_OPS_1_FASE0_SMOKE_2026-07-19.md) |
| **ADMIN-OPS-1 Fase 0** | **Fechada** (produto + smoke B/C) |
| **PR #413** | Passenger active-trip recovery — merged |
| **D-DEMO-1** | PASS — [`D_DEMO_1_CHECKPOINT_2026-07-16.md`](../ops/D_DEMO_1_CHECKPOINT_2026-07-16.md) |

### Smoke B/C — resumo

Trip `bd904271-…` (~1.59 €): Pax cria → Driver aceita → Admin force arriving → force ongoing → Driver completa → Pax rating → Admin Histórico `completed`. Em `ongoing`, Admin **sem** complete/cancel/fail (gap confirmado). Nota ops **SKIP**.

### Decisão produto (mantém-se)

Admin ≠ dispatcher; **Atribuir** = recovery SA; assign diário → PARTNER-FLEET-1 / matching. Ver [`BACKLOG_POST_PILOTO.md`](BACKLOG_POST_PILOTO.md).

### Entregas recentes (merged)

| PR | O quê |
|----|-------|
| **#413** | Passenger recover active trip + keep completed for rating |
| **#412** | Docs Admin ≠ dispatcher |
| **#411** | Docs fecho ADMIN-POLL frontend |
| **#409–#410** | Admin poll → manual refresh + feedback |

### Em pausa / monitorizar

| ID | Notas |
|----|-------|
| **R-ADMIN-ORPHAN-PANEL** | «Viagem aberta fora da lista» pós-completed — UX futura |
| **R-AGORA-SNAP** | Agora snapshot vs Viagens — não bug confirmado |
| **Saúde degraded** | Stuck payments antigos — carril payments/ops separado |
| **R-E2E-1** | Flake intermitente — monitorizar |
| **O-STRIPE-LIVE** | Bloqueado — conta parceiro / `sk_live_*` |
| **R-GIT-1** | ~190 branches locais — **não apagar ainda** |
| **CI-MAINT-1** | Warning Actions Node 20 deprecated — baixa prioridade |

### O que fazer a seguir (ordem)

1. Docs/runbook: alinhar playbook Saúde com capacidades reais (ongoing ≠ cancel admin) — opcional curto  
2. **PARTNER-FLEET-1** — assign/reassign diário / viaturas  
3. Payments stuck / Saúde (não misturar com Admin force transitions)  
4. UI honesty Atribuir (relabel/SA) — só se priorizado  

**Ambiente:** `scripts/windows/Open-TVDE-Dev-WT.bat`. Baseline: Pax `+351912345678` · Driver `+351911111111` · Admin SA `+351924075365`. Evitar pytest contra `DATABASE_URL` Render.

### Specs activas

| Área | Onde |
|------|------|
| Smoke ADMIN-OPS Fase 0 | [`ADMIN_OPS_1_FASE0_SMOKE_2026-07-19.md`](../ops/ADMIN_OPS_1_FASE0_SMOKE_2026-07-19.md) |
| Demo checkpoint | [`D_DEMO_1_CHECKPOINT_2026-07-16.md`](../ops/D_DEMO_1_CHECKPOINT_2026-07-16.md) |
| Backlog ops/nav | [`BACKLOG_POST_PILOTO.md`](BACKLOG_POST_PILOTO.md) |
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
