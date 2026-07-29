# PROXIMA_SESSAO.md — Handoff

Contexto curto para a próxima sessão. **Lista operacional:** painel **PRÓXIMA SESSÃO** em [`TODOdoDIA.md`](../../TODOdoDIA.md).

**Histórico completo (fechos Abril–Maio, Seções A–E):** `C:\dev\_archives\APP\docs-2026-06\lote-3\PROXIMA_SESSAO.md`

**Plano operacional Julho:** [`FORWARD_PLAN_2026-07.md`](../ops/FORWARD_PLAN_2026-07.md)

---

## Contexto actual (**2026-07-29** — NAV-3D.2 + Admin integrity #499 + B2 espera + PF3D OFF)

### Checkpoint Git

| Item | Estado |
|------|--------|
| **`main`** | `aa39a9f` |
| **origin/main** | alinhado |
| **working tree** | limpo |
| **CI** | verde após re-run/sync (#499) |

### NAV / UX (fechado até NAV-3D.2) + integrity Admin

| Item | PR / tip | Estado |
|------|----------|--------|
| NAV-2C Partner Empty/Error | [#493](https://github.com/frankbexxx/tvde/pull/493) · `fe6bbe5` | **PASS** |
| NAV-3A Admin IA docs | [#494](https://github.com/frankbexxx/tvde/pull/494) · `5b5f85a` | **PASS** — [`AUDIT_ADMIN_NAV_IA_2026-07-28.md`](../ux/AUDIT_ADMIN_NAV_IA_2026-07-28.md) |
| NAV-3B Admin i18n | [#495](https://github.com/frankbexxx/tvde/pull/495) · `298bd10` | **PASS** + smoke prod |
| NAV-3C grupos Admin | [#496](https://github.com/frankbexxx/tvde/pull/496) · `9eff1e0` | **PASS** + smoke prod |
| NAV-3D.1 EmptyState Admin | [#497](https://github.com/frankbexxx/tvde/pull/497) · `7e0cbce` | **PASS** + smoke 3 janelas |
| NAV-3D.2 ErrorBanner Admin | [#500](https://github.com/frankbexxx/tvde/pull/500) · `a968c5f` | **PASS** |
| Handoff meta NAV-3D.2 | [#501](https://github.com/frankbexxx/tvde/pull/501) · `aa25cb2` | **PASS** — docs only |
| Admin demote/delete integrity | [#499](https://github.com/frankbexxx/tvde/pull/499) · `aa39a9f` | **PASS** — backend only; CI verde pós re-run/sync |
| NAV-0 contrato 4 apps | [#489](https://github.com/frankbexxx/tvde/pull/489) | **PASS** — [`AUDIT_NAV_4APPS_2026-07-28.md`](../ux/AUDIT_NAV_4APPS_2026-07-28.md) |

**#499 (resumo):** bloqueia demote de driver e delete de user-driver com histórico de trips (`cannot_demote_driver_with_trips` / `cannot_delete_user_with_trips`) para preservar atribuição — `trips.driver_id` é `ON DELETE SET NULL`. Scope: `admin.py` + `test_admin_promote_demote_active_trip.py`.

**Contrato Admin (intactos):** `?tab=` · `tripId` · `tripsList` · **sem** `?group=` · Admin **PT forçado** (`LocaleProvider`).

**Smoke visual (processo):** preferir `Admin → Grupo → Tab` em **3 janelas**; URL só validação técnica do contrato.

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
| **Availability Guard** | **PASS** (A+B) |
| **B2 implementação** | **Não** — espera Manel |
| **PF3D gates** | OFF |
| **PF3D-3B** | Implementado (#486) + smoke OFF **PASS** |
| **NAV-3D.2** | **Fechado** (#500) — Dashboard `{error}` + retry |
| **NAV-3D.2b** *(opcional)* | Migrar `admin-agora-refresh-error` → ErrorBanner (preservar `testId`) |
| **NAV-3E** | **Não** nesta fase |
| **Trips/Ops actions** | **Não** nesta linha |
| **PF3D-3 ON** | Bloqueado — atribuição real + smoke ON controlado só depois |
| **Render env / DB / migrations** | Intactos nesta documentação |

**Frase de fecho:** Handoff #501 + integrity #499 em `aa39a9f`. Follow-up opcional: Agora refresh ErrorBanner. Gates OFF. B2 em espera. Sem PageHeader / Trips-Ops actions / NAV-3E.

### Decisão produto (mantém-se + B2)

Admin ≠ dispatcher; **Atribuir** = recovery SA; assign diário → Partner fleet / matching. Ver [`BACKLOG_POST_PILOTO.md`](BACKLOG_POST_PILOTO.md).

**B2:** escolher modelo queued (**B**), hold (**C**), ou adiar — ver diagnóstico.

### Entregas recentes

| PR / tip | O quê |
|----------|-------|
| **#499** · `aa39a9f` | Admin integrity — demote/delete com histórico de trips (backend) |
| **#501** · `aa25cb2` | Handoff meta após NAV-3D.2 |
| **#500** · `a968c5f` | NAV-3D.2 ErrorBanner Admin + retry (`admin-dashboard-error`) |
| **#498** · `4297332` | Handoff meta até NAV-3D.1 |
| **#497** · `7e0cbce` | NAV-3D.1 EmptyState Admin (Pending / Dados / Metrics) |
| **#496** · `9eff1e0` | NAV-3C grupos Admin + `adminNavGroups` |
| **#495** · `298bd10` | NAV-3B Admin i18n (`pt`/`en` `admin.json`) |
| **#494** · `5b5f85a` | NAV-3A IA Admin docs |
| **#493** · `fe6bbe5` | NAV-2C EmptyState/ErrorBanner Partner |
| **#492** / **#491** | NAV-2B/A pilots |
| **#490** / **#489** | NAV-1 labels · NAV-0 contrato 4 apps |
| **#486** + smoke 3B/OFF | [`PF3D_3B_OFF_SMOKE_PASS_2026-07-27.md`](../ops/PF3D_3B_OFF_SMOKE_PASS_2026-07-27.md) |
| B2-DIAG | [`B2_NEXT_TRIP_CHAINING_DIAG_2026-07-27.md`](../architecture/B2_NEXT_TRIP_CHAINING_DIAG_2026-07-27.md) |

### Em pausa / monitorizar

| ID | Notas |
|----|-------|
| **AVAIL-B2-NEXT-TRIP** | Espera Manel — sem spike/código até decisão |
| **NAV-3D.2b** | Opcional — `admin-agora-refresh-error` → ErrorBanner (preservar `testId`) |
| **NAV-3D.3+ / NAV-3E** | Só se valer; **sem** Trips/Ops mutáveis / PageHeader |
| **PF3D-3B/ON** | Smoke ON controlado — opcional; **não** activar em prod global |
| **PF3D-3 ON** | Só após atribuição real + docs reais |
| **PF3B-UX-DRIVER-DETAIL** | Tabs / scroll Partner Detail — debt |
| **PF3B-UX-FOLLOWUP** | Lista → detalhe documentos |
| **OPS-UX-POLISH** | Mobile / densidades — não blocker |
| **ADMIN-OPS-UX** | Alinhar com NAV-3 (sem rewrite) |
| **CHORE-LINT-1** | Ruff 0.16 — baixa prioridade |
| **R-E2E-1** | Flake intermitente (ex. nav Maps) — monitorizar |
| **O-STRIPE-LIVE** | Futuro |
| **R-GIT-1** | Branches locais — **não apagar ainda** |
| **CI-MAINT-1** | Warning Actions Node 20 — baixa prioridade |

### O que fazer a seguir (ordem — 1 carril)

1. **Espera Manel B2** (B/C/adiar) — sem implementação  
2. **Opcional NAV-3D.2b:** migrar `admin-agora-refresh-error` → ErrorBanner (preservar `data-testid`) — **sem** PageHeader / NAV-3E / Trips-Ops  
3. Atribuição real de viaturas / docs reais (pré-requisito PF3D ON)  
4. PF3D-3B smoke ON controlado (opcional; flag **não** em prod global)  
5. Roadmap PF3D ON (só após 3) · backlog produto se Manel responder  

**Ambiente:** `scripts/windows/Open-TVDE-Dev-WT.bat`. Baseline: Pax `+351912345678` · Driver `+351911111111` · Admin SA `+351924075365`. Pytest: launcher seguro / BD local.

### Specs activas

| Área | Onde |
|------|------|
| NAV-3A Admin IA / query | [`AUDIT_ADMIN_NAV_IA_2026-07-28.md`](../ux/AUDIT_ADMIN_NAV_IA_2026-07-28.md) |
| NAV-0 contrato 4 apps | [`AUDIT_NAV_4APPS_2026-07-28.md`](../ux/AUDIT_NAV_4APPS_2026-07-28.md) |
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

## Contexto anterior (**2026-07-28** — NAV-3A docs; depois NAV-3B→3D.1 na mesma linha)

Checkpoint evoluiu até `7e0cbce` (NAV-3D.1). Contrato Admin e smokes 3B/3C/3D.1 registados acima.

## Contexto anterior (**2026-07-27** — PF3D-3B OFF + B2 DIAG)

[`PF3D_3B_OFF_SMOKE_PASS_2026-07-27.md`](../ops/PF3D_3B_OFF_SMOKE_PASS_2026-07-27.md) · [`B2_NEXT_TRIP_CHAINING_DIAG_2026-07-27.md`](../architecture/B2_NEXT_TRIP_CHAINING_DIAG_2026-07-27.md)

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
