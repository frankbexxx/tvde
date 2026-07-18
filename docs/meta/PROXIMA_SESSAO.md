# PROXIMA_SESSAO.md — Handoff

Contexto curto para a próxima sessão. **Lista operacional:** painel **PRÓXIMA SESSÃO** em [`TODOdoDIA.md`](../../TODOdoDIA.md).

**Histórico completo (fechos Abril–Maio, Seções A–E):** `C:\dev\_archives\APP\docs-2026-06\lote-3\PROXIMA_SESSAO.md`

**Plano operacional Julho:** [`FORWARD_PLAN_2026-07.md`](../ops/FORWARD_PLAN_2026-07.md)

---

## Contexto actual (**2026-07-18**)

### Checkpoint pós ADMIN-POLL-1/2 (fase frontend)

| Item | Estado |
|------|--------|
| **`main` / `origin/main`** | `b64a67c` |
| **PRs abertas** | **0** |
| **CI `main`** | Verde (backend-ci · web-app · web-e2e) pós-#410 |
| **PR #409 / ADMIN-POLL-1** | **Concluído** — removeu `setInterval` global 8s; tab on-enter + refresh manual |
| **PR #410 / ADMIN-POLL-2** | **Concluído** — feedback botão Atualizar (Agora); fix TS wrappers; smoke visual PASS |
| **BACKEND-DBPOOL-1 fase frontend** | **Fechada** — backend/pool/system-health **fora de scope** (correcto) |
| **D-DEMO-1** | PASS (docs #406) — [`D_DEMO_1_CHECKPOINT_2026-07-16.md`](../ops/D_DEMO_1_CHECKPOINT_2026-07-16.md) |

### O que ficou resolvido (frontend)

- Admin **sem** polling global (`setInterval`).
- Sem refresh silencioso de pending-users / users / trips / metrics / system-health / alerts a cada 8s.
- Botão **Atualizar** (Admin > Agora): «A atualizar…» · «Dados atualizados.» · «Não foi possível atualizar.»

### Smoke visual #410 (Admin > Agora) — PASS

| Check | Resultado |
|-------|-----------|
| Botão Atualizar | Funciona |
| Feedback pós-clique | «Dados atualizados.» |
| Polling automático | Não reintroduzido |

### Entregas recentes (merged)

| PR | O quê |
|----|-------|
| **#410** | Feedback refresh manual Admin > Agora + fix tipos TS |
| **#409** | Admin: poll global → on-enter + refresh manual |
| **#408** | Docs fecho smoke TW-TRIP-COPY-1 |
| **#407** | Soften trip copy demo |
| **#406** | Checkpoint docs D-DEMO-1 PASS |
| **#405** | NAV/WAZE-1 Opção B |

### Em pausa / monitorizar

| ID | Notas |
|----|-------|
| **R-E2E-1** | Flake intermitente — monitorizar |
| **O-STRIPE-LIVE** | Bloqueado — conta parceiro / `sk_live_*` |
| **R-GIT-1** | ~190 branches locais — **não apagar ainda** |
| **CI-MAINT-1** | Warning Actions Node 20 deprecated — baixa prioridade |

### O que fazer a seguir (ordem)

**Próximo (recomendado):** smoke multi-janela leve **Passenger + Driver + Admin**

| Objectivo | Detalhe |
|-----------|---------|
| Validar | Estabilidade local com 3 superfícies abertas após remoção do poll Admin |
| Critério | Sem saturação óbvia de pool / splash «A iniciar serviço…» |
| Scope | Smoke humano leve — **sem** alterar código salvo regressão |

**Follow-up backend (só se ainda saturar):** **ADMIN-HEALTH-1** ou **BACKEND-DBPOOL-2** — aliviar `/admin/system-health` e/ou instrumentar pool **local**. Produção intocada até diagnóstico.

Backlog: [`BACKLOG_POST_PILOTO.md`](BACKLOG_POST_PILOTO.md) · secção BACKEND-DBPOOL-1 / ADMIN-POLL-1.

**Depois (não agora):** ADMIN-OPS-1 · PARTNER-FLEET-1 · NAV-ROUTE-STOPS.

**Ambiente local:** `scripts/windows/Open-TVDE-Dev-WT.bat`. Em walkthroughs: se pool saturar, fechar Admin e reiniciar uvicorn.

### Specs activas

| Área | Onde |
|------|------|
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
