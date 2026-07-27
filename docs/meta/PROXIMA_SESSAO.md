# PROXIMA_SESSAO.md — Handoff

Contexto curto para a próxima sessão. **Lista operacional:** painel **PRÓXIMA SESSÃO** em [`TODOdoDIA.md`](../../TODOdoDIA.md).

**Histórico completo (fechos Abril–Maio, Seções A–E):** `C:\dev\_archives\APP\docs-2026-06\lote-3\PROXIMA_SESSAO.md`

**Plano operacional Julho:** [`FORWARD_PLAN_2026-07.md`](../ops/FORWARD_PLAN_2026-07.md)

---

## Contexto actual (**2026-07-27** — PF3D-3B OFF smoke PASS + B2 espera)

### Availability Guard (regra actual)

| Doc | Estado |
|-----|--------|
| [`AVAILABILITY_FORCE_ONLINE_SYNC_SMOKE_PASS_2026-07-26.md`](../ops/AVAILABILITY_FORCE_ONLINE_SYNC_SMOKE_PASS_2026-07-26.md) | **Caso A PASS** |
| [`AVAILABILITY_ACTIVE_TRIP_GUARD_SMOKE_PASS_2026-07-27.md`](../ops/AVAILABILITY_ACTIVE_TRIP_GUARD_SMOKE_PASS_2026-07-27.md) | **Caso B PASS** |

### B2 — next trip while ongoing

| Doc | Estado |
|-----|--------|
| [`B2_NEXT_TRIP_CHAINING_DIAG_2026-07-27.md`](../architecture/B2_NEXT_TRIP_CHAINING_DIAG_2026-07-27.md) | **DIAG concluído** — **em espera** (resposta Manel: B/C/adiar) |

### PF3D

| Doc | Estado |
|-----|--------|
| [`PF3D_3B_OFF_SMOKE_PASS_2026-07-27.md`](../ops/PF3D_3B_OFF_SMOKE_PASS_2026-07-27.md) | **3B/OFF smoke PASS** — #486 sem mudança operacional |
| [`PF3D_3B_GATE_MESSAGES_DIAG_2026-07-27.md`](../ops/PF3D_3B_GATE_MESSAGES_DIAG_2026-07-27.md) | **3B DIAG** (pré-implementação) |
| [`PF3D_3A_OFF_SMOKE_PASS_2026-07-26.md`](../ops/PF3D_3A_OFF_SMOKE_PASS_2026-07-26.md) | Smoke 3A/OFF **PASS** |
| [`PF3D_VEHICLE_DOCUMENT_COMPLIANCE.md`](../ops/PF3D_VEHICLE_DOCUMENT_COMPLIANCE.md) | Matriz / fases |

| Item | Estado |
|------|--------|
| **`main`** | ≥ `e404bcd` |
| **Availability Guard** | **PASS** (A+B) |
| **B2 implementação** | **Não** — espera Manel |
| **PF3D gates** | OFF |
| **PF3D-3B** | Implementado (#486) + smoke OFF **PASS** |
| **PF3D-3 ON** | Bloqueado — atribuição real + smoke ON controlado só depois |
| **Render env / DB / migrations** | Intactos nesta documentação |

**Frase de fecho:** PF3D-3B implementado e smoke OFF PASS. Gates OFF. B2 em espera. Não activar PF3D sem atribuição real.

### Decisão produto (mantém-se + B2)

Admin ≠ dispatcher; **Atribuir** = recovery SA; assign diário → Partner fleet / matching. Ver [`BACKLOG_POST_PILOTO.md`](BACKLOG_POST_PILOTO.md).

**B2:** escolher modelo queued (**B**), hold (**C**), ou adiar — ver diagnóstico.

### Entregas recentes

| PR / doc | O quê |
|----------|-------|
| **#486** + smoke 3B/OFF | [`PF3D_3B_OFF_SMOKE_PASS_2026-07-27.md`](../ops/PF3D_3B_OFF_SMOKE_PASS_2026-07-27.md) |
| **#485** / **#484** | Deadlock disable/accept · Admin promote/demote/assign offers |
| PF3D-3B DIAG | [`PF3D_3B_GATE_MESSAGES_DIAG_2026-07-27.md`](../ops/PF3D_3B_GATE_MESSAGES_DIAG_2026-07-27.md) |
| B2-DIAG | [`B2_NEXT_TRIP_CHAINING_DIAG_2026-07-27.md`](../architecture/B2_NEXT_TRIP_CHAINING_DIAG_2026-07-27.md) |
| Smoke Caso B / A | Availability Guard PASS |

### Em pausa / monitorizar

| ID | Notas |
|----|-------|
| **AVAIL-B2-NEXT-TRIP** | Espera Manel — sem spike/código até decisão |
| **PF3D-3B/ON** | Smoke ON controlado — opcional; **não** activar em prod global |
| **PF3D-3 ON** | Só após atribuição real + docs reais |
| **PF3B-UX-DRIVER-DETAIL** | Tabs / scroll Partner Detail — debt |
| **PF3B-UX-FOLLOWUP** | Lista → detalhe documentos |
| **OPS-UX-POLISH** | Mobile / densidades — não blocker |
| **ADMIN-OPS-UX** | Acompanhar / refresh Admin |
| **CHORE-LINT-1** | Ruff 0.16 — baixa prioridade |
| **R-E2E-1** | Flake intermitente (ex. nav Maps) — monitorizar |
| **O-STRIPE-LIVE** | Futuro |
| **R-GIT-1** | Branches locais — **não apagar ainda** |
| **CI-MAINT-1** | Warning Actions Node 20 — baixa prioridade |

### O que fazer a seguir (ordem — 1 carril)

1. **Espera Manel B2** (B/C/adiar) — sem implementação  
2. Atribuição real de viaturas / docs reais (pré-requisito PF3D ON)  
3. PF3D-3B smoke ON controlado (opcional; flag **não** em prod global)  
4. Roadmap PF3D ON controlado (só após 2)  
5. **Partner Ops UX** tabs (opcional) · **CHORE-LINT-1** (opcional)

**Ambiente:** `scripts/windows/Open-TVDE-Dev-WT.bat`. Baseline: Pax `+351912345678` · Driver `+351911111111` · Admin SA `+351924075365`. Pytest: launcher seguro / BD local.

### Specs activas

| Área | Onde |
|------|------|
| PF3D-3B/OFF smoke PASS | [`PF3D_3B_OFF_SMOKE_PASS_2026-07-27.md`](../ops/PF3D_3B_OFF_SMOKE_PASS_2026-07-27.md) |
| PF3D-3B DIAG mensagens | [`PF3D_3B_GATE_MESSAGES_DIAG_2026-07-27.md`](../ops/PF3D_3B_GATE_MESSAGES_DIAG_2026-07-27.md) |
| B2-DIAG next-trip | [`B2_NEXT_TRIP_CHAINING_DIAG_2026-07-27.md`](../architecture/B2_NEXT_TRIP_CHAINING_DIAG_2026-07-27.md) |
| Availability Caso B PASS | [`AVAILABILITY_ACTIVE_TRIP_GUARD_SMOKE_PASS_2026-07-27.md`](../ops/AVAILABILITY_ACTIVE_TRIP_GUARD_SMOKE_PASS_2026-07-27.md) |
| Availability Caso A PASS | [`AVAILABILITY_FORCE_ONLINE_SYNC_SMOKE_PASS_2026-07-26.md`](../ops/AVAILABILITY_FORCE_ONLINE_SYNC_SMOKE_PASS_2026-07-26.md) |
| PF3D-3A/OFF smoke PASS | [`PF3D_3A_OFF_SMOKE_PASS_2026-07-26.md`](../ops/PF3D_3A_OFF_SMOKE_PASS_2026-07-26.md) |
| PF3D-DATA-1E re-audit | [`PF3D_DATA_1E_REAUDIT_AFTER_DEV_SEED.md`](../ops/PF3D_DATA_1E_REAUDIT_AFTER_DEV_SEED.md) |
| PF3D-0 compliance (decisão) | [`PF3D_VEHICLE_DOCUMENT_COMPLIANCE.md`](../ops/PF3D_VEHICLE_DOCUMENT_COMPLIANCE.md) |
| PF3C smoke PASS | [`PF3C_VEHICLE_DOCUMENT_ALERTS_SMOKE_PASS_2026-07-24.md`](../ops/PF3C_VEHICLE_DOCUMENT_ALERTS_SMOKE_PASS_2026-07-24.md) |
| PF3 documentos (cadeia) | [`PARTNER_FLEET_3_VEHICLE_DOCUMENTS.md`](../ops/PARTNER_FLEET_3_VEHICLE_DOCUMENTS.md) |
| OPS-UX-1 smoke PASS | [`OPS_UX_1_SMOKE_PASS_2026-07-23.md`](../ops/OPS_UX_1_SMOKE_PASS_2026-07-23.md) |
| Checkpoint Partner-Fleet 2026-07-22 | [`CHECKPOINT_2026-07-22_PARTNER_FLEET.md`](../ops/CHECKPOINT_2026-07-22_PARTNER_FLEET.md) |
| Stripe / mock / 1B API | [`O_STRIPE_1_RUNBOOK.md`](../ops/O_STRIPE_1_RUNBOOK.md) §§9–10 |
| Pytest BD segura | [`BACKEND_PYTEST_SAFE.md`](../testing/BACKEND_PYTEST_SAFE.md) |
| Ops Julho | [`FORWARD_PLAN_2026-07.md`](../ops/FORWARD_PLAN_2026-07.md) |
| Painel vivo | [`TODOdoDIA.md`](../../TODOdoDIA.md) |

---

## Contexto anterior (**2026-07-26** — PF3D-3A/OFF smoke PASS)

[`PF3D_3A_OFF_SMOKE_PASS_2026-07-26.md`](../ops/PF3D_3A_OFF_SMOKE_PASS_2026-07-26.md) — viagem completa com gates OFF.

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
