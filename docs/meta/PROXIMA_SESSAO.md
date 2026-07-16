# PROXIMA_SESSAO.md — Handoff

Contexto curto para a próxima sessão. **Lista operacional:** painel **PRÓXIMA SESSÃO** em [`TODOdoDIA.md`](../../TODOdoDIA.md).

**Histórico completo (fechos Abril–Maio, Seções A–E):** `C:\dev\_archives\APP\docs-2026-06\lote-3\PROXIMA_SESSAO.md`

**Plano operacional Julho:** [`FORWARD_PLAN_2026-07.md`](../ops/FORWARD_PLAN_2026-07.md)

---

## Contexto actual (**2026-07-16**)

### Checkpoint D-DEMO-1 PASS + NAV/WAZE-1

| Item | Estado |
|------|--------|
| **`main` / `origin/main`** | `624ab4e` |
| **PRs abertas** | **0** (docs checkpoint local pendente commit/PR) |
| **CI `main`** | Verde (pós-#405) |
| **D-DEMO-1** | **PASS** — multi-role local (Pax · Driver · Partner · Admin) |
| **PR #405** | **Merged** — NAV/WAZE-1 Opção B; S-NAV-1…4 PASS |
| **Relatório demo** | [`D_DEMO_1_CHECKPOINT_2026-07-16.md`](../ops/D_DEMO_1_CHECKPOINT_2026-07-16.md) |

### Entregas recentes (merged)

| PR | O quê |
|----|-------|
| **#405** | Nav externa: sem warm online; aceitar → recolha; iniciar sem auto-nav; manual → destino |
| **#398** | Recuperação viagem activa motorista após reload/cold start |
| **#403** | Launchers WT Dev + Stripe local — [`scripts/windows/README.md`](../../scripts/windows/README.md) |

### Em pausa / monitorizar

| ID | Notas |
|----|-------|
| **BACKEND-DBPOOL-1 / ADMIN-POLL-1** | Incidente pool local com Admin aberto — backlog; **não** leak confirmado |
| **R-E2E-1** | Flake intermitente — monitorizar |
| **O-STRIPE-LIVE** | Bloqueado — conta parceiro / `sk_live_*` |
| **R-GIT-1** | ~190 branches locais — **não apagar ainda** |

### O que fazer a seguir (ordem)

**Amanhã (docs):**

1. Commit **docs-only** (checkpoint D-DEMO-1 + painéis)
2. PR docs-only → `main`
3. Escolher **1** carril funcional:

| Prioridade sugerida | ID | Foco |
|---------------------|-----|------|
| 1 | **TW-TRIP-COPY-1** | Copy passenger/driver/pagamento para demo |
| 2 | **ADMIN-POLL-1 / BACKEND-DBPOOL-1** | Poll Admin on-enter + Actualizar; aliviar system-health/pool |
| 3 | **ADMIN-OPS-1** | Detalhe viagem, desbloqueios, pagamentos stuck |
| 4 | **PARTNER-FLEET-1** | Viaturas, docs viatura, associação, rendimentos |

**Produto nav (Manel):** abrir Waze/Maps só por botão; botão sempre visível com próxima acção de condução; futuro `nextStop` em NAV-ROUTE-STOPS.

**Ambiente local:** `scripts/windows/Open-TVDE-Dev-WT.bat`. Walkthrough longo: preferir Vivaldi vista partilhada; fechar Admin se pool saturar (reiniciar uvicorn).

### Specs activas

| Área | Onde |
|------|------|
| Demo checkpoint | [`D_DEMO_1_CHECKPOINT_2026-07-16.md`](../ops/D_DEMO_1_CHECKPOINT_2026-07-16.md) |
| Backlog ops/nav | [`BACKLOG_POST_PILOTO.md`](BACKLOG_POST_PILOTO.md) |
| Motorista UX | [`driver-ux-fixes-backlog.md`](../ux/driver-ux-fixes-backlog.md), [`DRIVER_HOME_TOP3_MANEL.md`](../product/DRIVER_HOME_TOP3_MANEL.md) |
| Shell / nav | [`shell-menu-centric.md`](../ux/shell-menu-centric.md), [`navigation-inventory.md`](../ux/navigation-inventory.md) |
| Ops Julho | [`FORWARD_PLAN_2026-07.md`](../ops/FORWARD_PLAN_2026-07.md) |

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
