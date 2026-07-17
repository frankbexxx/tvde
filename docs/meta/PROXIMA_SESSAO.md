# PROXIMA_SESSAO.md — Handoff

Contexto curto para a próxima sessão. **Lista operacional:** painel **PRÓXIMA SESSÃO** em [`TODOdoDIA.md`](../../TODOdoDIA.md).

**Histórico completo (fechos Abril–Maio, Seções A–E):** `C:\dev\_archives\APP\docs-2026-06\lote-3\PROXIMA_SESSAO.md`

**Plano operacional Julho:** [`FORWARD_PLAN_2026-07.md`](../ops/FORWARD_PLAN_2026-07.md)

---

## Contexto actual (**2026-07-17**)

### Checkpoint pós TW-TRIP-COPY-1 (#407)

| Item | Estado |
|------|--------|
| **`main` / `origin/main`** | `ce12e73` |
| **PRs abertas** | **0** |
| **CI `main`** | Verde (backend-ci · frontend-ci · web-e2e) pós-#407 |
| **PR #407 / TW-TRIP-COPY-1** | **Concluído** — merged + Vitest 19/19 + **smoke visual PASS** (Pax+Driver, sem Admin/Partner) |
| **D-DEMO-1** | PASS (docs #406) — [`D_DEMO_1_CHECKPOINT_2026-07-16.md`](../ops/D_DEMO_1_CHECKPOINT_2026-07-16.md) |
| **PR #405 NAV/WAZE-1** | Merged — intacto no smoke #407 |

### Smoke visual #407 (2026-07-17) — PASS

| Fase | Observado |
|------|-----------|
| Driver idle | «À espera de viagens» + «À espera de pedidos. Histórico…» |
| Passenger procura / fallback | «Ainda à procura de motorista» — menos alarmante |
| Accepted/arriving | Distância útil (`~N m`); pagamento «A confirmar pagamento…» |
| Ongoing | «A acompanhar o percurso.» — **sem** «~0 m de ti» |
| Driver trip | «Abrir navegação» manual visível (NAV/WAZE OK) |
| Completed | Overlay «A actualizar o estado do pagamento…»; avaliação OK |

**Nota residual:** alguma duplicação «Pagamento: …» no UI — não bloqueante; fora de scope #407.

### Entregas recentes (merged)

| PR | O quê |
|----|-------|
| **#407** | Soften trip copy demo (C1–C4, C6–C7) |
| **#406** | Checkpoint docs D-DEMO-1 PASS |
| **#405** | NAV/WAZE-1 Opção B |
| **#398** | Recuperação viagem activa motorista |
| **#403** | Launchers WT Dev + Stripe local |

### Em pausa / monitorizar

| ID | Notas |
|----|-------|
| **R-E2E-1** | Flake intermitente — monitorizar |
| **O-STRIPE-LIVE** | Bloqueado — conta parceiro / `sk_live_*` |
| **R-GIT-1** | ~190 branches locais — **não apagar ainda** |

### O que fazer a seguir (ordem)

**Próximo carril (recomendado):** **ADMIN-POLL-1 / BACKEND-DBPOOL-1**

| Objectivo | Detalhe |
|-----------|---------|
| Poll Admin | Actualizar ao **entrar na tab** + botão **Actualizar**; eventual poll leve só em painéis específicos |
| Anti-padrão | Nunca 7 endpoints pesados em paralelo a cada ~8s |
| Backend | Aliviar `/admin/system-health` se necessário; instrumentar pool **local** |
| Produção | **Intocada** até diagnóstico |
| Classificação | Dívida ops; **não** leak de sessão confirmado |

Backlog: [`BACKLOG_POST_PILOTO.md`](BACKLOG_POST_PILOTO.md) · secção BACKEND-DBPOOL-1 / ADMIN-POLL-1.

**Depois (não agora):** ADMIN-OPS-1 · PARTNER-FLEET-1 · NAV-ROUTE-STOPS.

**Ambiente local:** `scripts/windows/Open-TVDE-Dev-WT.bat`. Em walkthroughs com Admin: fechar Admin se pool saturar; reiniciar uvicorn.

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
