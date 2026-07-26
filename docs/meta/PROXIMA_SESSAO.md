# PROXIMA_SESSAO.md — Handoff

Contexto curto para a próxima sessão. **Lista operacional:** painel **PRÓXIMA SESSÃO** em [`TODOdoDIA.md`](../../TODOdoDIA.md).

**Histórico completo (fechos Abril–Maio, Seções A–E):** `C:\dev\_archives\APP\docs-2026-06\lote-3\PROXIMA_SESSAO.md`

**Plano operacional Julho:** [`FORWARD_PLAN_2026-07.md`](../ops/FORWARD_PLAN_2026-07.md)

---

## Contexto actual (**2026-07-26** — PF3D-3A/OFF smoke PASS)

### Smoke — [`PF3D_3A_OFF_SMOKE_PASS_2026-07-26.md`](../ops/PF3D_3A_OFF_SMOKE_PASS_2026-07-26.md)

| Item | Estado |
|------|--------|
| **`main` / `origin/main`** | ≥ `5f07c60` |
| **PF3C** | **PASS** |
| **PF3D-0 / 1 / 2** | Matriz · helper · API read-only em main |
| **PF3D-3A** | Código em main (#467 + #468); flag default **false** |
| **Smoke PF3D-3A/OFF** | **PASS** funcional (Pax+Driver+Partner viagem completa) |
| **Render env** | **Não alterado** — ausência de `ENABLE_VEHICLE_COMPLIANCE_GATES` ≡ OFF |
| **PF3D-3 global / ON** | **Bloqueado** (DATA-1E: muitos `no_active_vehicle`) |
| **Force-online (#469/#470)** | Código merged; **não** validado neste smoke (não blocker) |

### Decisão produto (mantém-se)

Admin ≠ dispatcher; **Atribuir** = recovery SA; assign diário → Partner fleet / matching. Ver [`BACKLOG_POST_PILOTO.md`](BACKLOG_POST_PILOTO.md).

### Entregas recentes

| PR / doc | O quê |
|----------|-------|
| Smoke OFF | [`PF3D_3A_OFF_SMOKE_PASS_2026-07-26.md`](../ops/PF3D_3A_OFF_SMOKE_PASS_2026-07-26.md) |
| **#470** | Force-online `FOR UPDATE` vs accept |
| **#469** | Block force-online during active trip |
| **#468** | Compliance filter no redispatch (flag ON) |
| **#467** | PF3D-3A gates flag OFF |
| **#466** | PF3D-2 `vehicle_compliance` read-only |
| **#465…#458** | DATA-1E…PF3D-0 |

### Em pausa / monitorizar

| ID | Notas |
|----|-------|
| **PF3D-3 ON** | Só após atribuição real + docs reais; nunca global ainda |
| **PF3B-UX-DRIVER-DETAIL** | Partner Driver Detail — scroll / tabs / force-online visível (UX debt smoke OFF) |
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

1. Atribuição real de viaturas / docs reais (pré-requisito qualquer gate ON)  
2. Opcional: smoke dedicado Partner force-online (#469/#470)  
3. Só depois smoke controlado **PF3D-3A/ON** (nunca prod global ainda)  
4. **Partner Ops UX** — Driver Detail (tabs / acções críticas)  
5. **PF3D-4** — mensagens FE quando gates existirem  
6. **CHORE-LINT-1** — Ruff 0.16 (opcional)

**Ambiente:** `scripts/windows/Open-TVDE-Dev-WT.bat`. Baseline: Pax `+351912345678` · Driver `+351911111111` · Admin SA `+351924075365`. Pytest: launcher seguro / BD local.

### Specs activas

| Área | Onde |
|------|------|
| PF3D-3A/OFF smoke PASS | [`PF3D_3A_OFF_SMOKE_PASS_2026-07-26.md`](../ops/PF3D_3A_OFF_SMOKE_PASS_2026-07-26.md) |
| PF3D-DATA-1E re-audit | [`PF3D_DATA_1E_REAUDIT_AFTER_DEV_SEED.md`](../ops/PF3D_DATA_1E_REAUDIT_AFTER_DEV_SEED.md) |
| PF3D-0 compliance (decisão) | [`PF3D_VEHICLE_DOCUMENT_COMPLIANCE.md`](../ops/PF3D_VEHICLE_DOCUMENT_COMPLIANCE.md) |
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

## Contexto anterior (**2026-07-25** — DATA-1E / PF3C)

Re-audit local [`PF3D_DATA_1E_REAUDIT_AFTER_DEV_SEED.md`](../ops/PF3D_DATA_1E_REAUDIT_AFTER_DEV_SEED.md); PF3C PASS; PF3D-3 global bloqueado.

## Contexto anterior (**2026-07-23** — OPS-UX-1 PASS)

[`OPS_UX_1_SMOKE_PASS_2026-07-23.md`](../ops/OPS_UX_1_SMOKE_PASS_2026-07-23.md)

## Contexto anterior (**2026-07-22** — Partner-Fleet 3B)

[`CHECKPOINT_2026-07-22_PARTNER_FLEET.md`](../ops/CHECKPOINT_2026-07-22_PARTNER_FLEET.md)

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

---

*Handoff curto. Painel vivo: TODOdoDIA.md.*
