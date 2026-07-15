# PROXIMA_SESSAO.md — Handoff

Contexto curto para a próxima sessão. **Lista operacional:** painel **PRÓXIMA SESSÃO** em [`TODOdoDIA.md`](../../TODOdoDIA.md).

**Histórico completo (fechos Abril–Maio, Seções A–E):** `C:\dev\_archives\APP\docs-2026-06\lote-3\PROXIMA_SESSAO.md`

**Plano operacional Julho:** [`FORWARD_PLAN_2026-07.md`](../ops/FORWARD_PLAN_2026-07.md)

---

## Contexto actual (**2026-07-15**)

### Checkpoint TVDE-PROD pós-P5

| Item | Estado |
|------|--------|
| **`main` / `origin/main`** | `8b5f75f` |
| **PRs abertas** | **0** |
| **CI `main`** | `backend-ci` ✅ · `frontend-ci` ✅ · `web-e2e` ✅ (18/18) |
| **Gate P5 beta** | **Concluído** — O-ROTATE-1 · S-PROD-2 · O-CRON-1 · O-RENDER-1 · TVDE-BKP · O-STRIPE-1 Fase A |

### Entregas recentes (merged)

| PR | O quê |
|----|-------|
| **#398** | Recuperação viagem activa motorista após reload/cold start — smoke manual PASS (F5 «A caminho» + «Em viagem») |
| **#403** | Launchers Windows Terminal: **Dev normal** (4 abas) + **Stripe local** O-STRIPE-1 (5 abas) — [`scripts/windows/README.md`](../../scripts/windows/README.md) |

### Em pausa / monitorizar

| ID | Notas |
|----|-------|
| **R-E2E-1** | Flake intermitente — **monitorizar**; não prioritário enquanto CI verde |
| **O-STRIPE-LIVE** | **Bloqueado** — conta parceiro / `sk_live_*` / documentação |
| **R-GIT-1** | ~190 branches locais antigas — higiene futura separada; **não apagar ainda** |

### O que fazer a seguir (ordem acordada)

1. **Walkthrough demo/produto** — revisão end-to-end **sem código** (passageiro · motorista · parceiro)
2. **UX/copy estados viagem** — «A caminho do passageiro», «Em viagem», toasts pós-reload
3. **P0 i18n** (O-i18n-NICHOS #362) ou **P1 staging** (A2-02 OAuth) — *só se objectivo mudar*

**Ambiente local recomendado:** `scripts/windows/Open-TVDE-Dev-WT.bat` (Dev normal, sem Stripe).

### Specs activas

| Área | Onde |
|------|------|
| Motorista UX | [`driver-ux-fixes-backlog.md`](../ux/driver-ux-fixes-backlog.md), [`DRIVER_HOME_TOP3_MANEL.md`](../product/DRIVER_HOME_TOP3_MANEL.md) |
| Shell / nav | [`shell-menu-centric.md`](../ux/shell-menu-centric.md), [`navigation-inventory.md`](../ux/navigation-inventory.md) |
| i18n | [`I18N.md`](../architecture/I18N.md) |
| Login social L1 | [`SOCIAL_LOGIN_L1_SPEC.md`](../product/SOCIAL_LOGIN_L1_SPEC.md) |
| Roadmap engenharia | [`TVDE_ENGINEERING_ROADMAP.md`](../architecture/TVDE_ENGINEERING_ROADMAP.md) |
| Ops Julho | [`FORWARD_PLAN_2026-07.md`](../ops/FORWARD_PLAN_2026-07.md) |

---

## Seção F — Operação (resumo)

_Canónico detalhado arquivado Lote 3; procedimentos em docs ops._

| Tema | Onde |
|------|------|
| Cron externo | `GET /cron/jobs?secret=<CRON_SECRET>` cada 30–60 s — [`CRON_JOB_ORG_INSTRUCOES.md`](../CRON_JOB_ORG_INSTRUCOES.md) |
| Smoke W1 prod | [`W1_PROD_SMOKE.md`](../ops/W1_PROD_SMOKE.md) |
| Launchers WT local | [`scripts/windows/README.md`](../../scripts/windows/README.md) |
| Stripe Fase A local | [`O_STRIPE_1_RUNBOOK.md`](../ops/O_STRIPE_1_RUNBOOK.md) |
| Timeouts manual | `POST /admin/run-timeouts`, `POST /admin/run-offer-expiry` |
| Fecho sessão | Testes → PR → actualizar [`TODOdoDIA.md`](../../TODOdoDIA.md) + este ficheiro |
| Validação PROD | [`A033_B_VALIDATION_HARDENING_PLAYBOOK.md`](../prompts/A033_B_VALIDATION_HARDENING_PLAYBOOK.md) |

---

## Seção G — Relatório / roadmap (resumo)

_Verdade operacional no código + [`TVDE_ENGINEERING_ROADMAP.md`](../architecture/TVDE_ENGINEERING_ROADMAP.md). Relatório texto histórico: snapshot em [`HISTORICO_FORA_DO_GIT.md`](../HISTORICO_FORA_DO_GIT.md)._

| Necessidade | Onde |
|-------------|------|
| Continuar amanhã | [`TODOdoDIA.md`](../../TODOdoDIA.md) + este ficheiro |
| Índice docs | [DOCS_INDEX.md](DOCS_INDEX.md) |
| Testes manuais | [GUIA_TESTES.md](../testing/GUIA_TESTES.md) |
| Implementação + pytest | [`IMPLEMENTACAO_E_TESTES.md`](../IMPLEMENTACAO_E_TESTES.md) |
| Arquivo fora do Git | [`HISTORICO_FORA_DO_GIT.md`](../HISTORICO_FORA_DO_GIT.md) |
