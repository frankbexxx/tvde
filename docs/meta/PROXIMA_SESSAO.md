# PROXIMA_SESSAO.md — Handoff

Contexto curto para a próxima sessão. **Lista operacional:** painel **PRÓXIMA SESSÃO** em [`TODOdoDIA.md`](../../TODOdoDIA.md).

**Histórico completo (fechos Abril–Maio, Seções A–E):** `C:\dev\_archives\APP\docs-2026-06\lote-3\PROXIMA_SESSAO.md`

**Plano operacional Julho:** [`FORWARD_PLAN_2026-07.md`](../ops/FORWARD_PLAN_2026-07.md)

---

## Contexto actual (**2026-07-27** — B2-DIAG + Availability Guard A+B)

### Availability Guard (regra actual)

| Doc | Estado |
|-----|--------|
| [`AVAILABILITY_FORCE_ONLINE_SYNC_SMOKE_PASS_2026-07-26.md`](../ops/AVAILABILITY_FORCE_ONLINE_SYNC_SMOKE_PASS_2026-07-26.md) | **Caso A PASS** — Partner force-online/offline → Driver app aberta sem refresh |
| [`AVAILABILITY_ACTIVE_TRIP_GUARD_SMOKE_PASS_2026-07-27.md`](../ops/AVAILABILITY_ACTIVE_TRIP_GUARD_SMOKE_PASS_2026-07-27.md) | **Caso B PASS** — Partner force-online bloqueado com trip activa |

### B2 — next trip while ongoing

| Doc | Estado |
|-----|--------|
| [`B2_NEXT_TRIP_CHAINING_DIAG_2026-07-27.md`](../architecture/B2_NEXT_TRIP_CHAINING_DIAG_2026-07-27.md) | **B2-DIAG concluído** — sistema actual **não** suporta chain com segurança |

| Item | Estado |
|------|--------|
| **`main`** | ≥ `aa63330` (#480 + smokes A/B docs) |
| **Availability Guard actual** | **PASS** (Caso A + Caso B) — mantém-se |
| **#480** | **Merged** — lock `assign_trip` / BETA auto-dispatch / payment guard `accept_offer` |
| **B2 implementação** | **Não** — aguarda decisão produto |
| **Decisão pendente** | Opção **B** queued/next vs **C** hold/intenção vs **adiar** |
| **PF3D gates** | OFF; não activados |
| **Render env / DB / migrations** | Intactos nesta documentação |

**Frase de fecho:** B2-DIAG concluído. Não implementar B2 antes de decisão produto (B vs C vs adiar). Availability Guard A+B continua a regra actual.

### Decisão produto (mantém-se + B2)

Admin ≠ dispatcher; **Atribuir** = recovery SA; assign diário → Partner fleet / matching. Ver [`BACKLOG_POST_PILOTO.md`](BACKLOG_POST_PILOTO.md).

**B2:** escolher modelo queued (**B**), hold (**C**), ou adiar — ver diagnóstico.

### Entregas recentes

| PR / doc | O quê |
|----------|-------|
| B2-DIAG | [`B2_NEXT_TRIP_CHAINING_DIAG_2026-07-27.md`](../architecture/B2_NEXT_TRIP_CHAINING_DIAG_2026-07-27.md) |
| **#480** | Lock `assign_trip` vs accept + payment guard `accept_offer` |
| Smoke Caso B | [`AVAILABILITY_ACTIVE_TRIP_GUARD_SMOKE_PASS_2026-07-27.md`](../ops/AVAILABILITY_ACTIVE_TRIP_GUARD_SMOKE_PASS_2026-07-27.md) |
| Smoke Caso A | [`AVAILABILITY_FORCE_ONLINE_SYNC_SMOKE_PASS_2026-07-26.md`](../ops/AVAILABILITY_FORCE_ONLINE_SYNC_SMOKE_PASS_2026-07-26.md) |
| **#477…#469** | Sync availability + locks lifecycle |

### Em pausa / monitorizar

| ID | Notas |
|----|-------|
| **AVAIL-B2-NEXT-TRIP** | **DIAG feito** — decisão produto B/C/adiar; **sem** spike/código até decisão |
| **PF3D-3 ON** | Só após atribuição real + docs reais; nunca global ainda |
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

1. **Decisão produto B2:** Opção B queued/next vs C hold vs adiar ([`B2_NEXT_TRIP_CHAINING_DIAG_2026-07-27.md`](../architecture/B2_NEXT_TRIP_CHAINING_DIAG_2026-07-27.md))  
2. Se B ou C escolhido → spike flag OFF (sem ON) — **só após decisão**  
3. Atribuição real de viaturas / docs reais (pré-requisito gates ON)  
4. Roadmap PF3D / Partner Fleet  
5. **Partner Ops UX** tabs (opcional) · **CHORE-LINT-1** (opcional)

**Ambiente:** `scripts/windows/Open-TVDE-Dev-WT.bat`. Baseline: Pax `+351912345678` · Driver `+351911111111` · Admin SA `+351924075365`. Pytest: launcher seguro / BD local.

### Specs activas

| Área | Onde |
|------|------|
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
