# Relatório histórico do projecto — desde 2026-07-02

**Gerado:** 2026-07-27 · **só leitura** (conteúdo fixado à data de geração)  
**Tip `main` à data:** `469d7a4` (= `origin/main`) · working tree limpa  
**Base pré-período:** `0acff31` (2026-06-05, #362 i18n) — **não há commits entre 02/07 e 03/07**; o primeiro commit do período é **2026-07-03**.  
**Volume (git):** `0acff31..HEAD` → **223 ficheiros**, **+25 338 / −1 139** · **~94** merges `Merge pull request #…` (+ vários squash directos em `main`, ex. #430–#438).

**Fontes:** `git log` desde 2026-07-02 · merges · PRs mergeadas · `docs/meta/PROXIMA_SESSAO.md` · `docs/meta/DOCS_INDEX.md` · `docs/ops/*` · `docs/architecture/*`.

---

## 1. Sumário executivo

### Onde estávamos (~02/07/2026)

- Pós-piloto beta em produção (Render), com foco em estabilização demo/P0.
- Último tip antes do período: `0acff31` (i18n nichos).
- Ainda **não** existia Partner Fleet (viaturas/docs), Admin Ops trip support, Availability Guard A+B, nem stack PF3C/PF3D.

### Onde estamos agora (`469d7a4`)

| Área | Estado |
|------|--------|
| Auth / contas teste vs real | Fechado (#374–#378, #389–#394, O-SECURITY) |
| Matching / GPS / disponibilidade UI | Endurecido (#383–#388, #476–#477) |
| Pagamentos mock stuck | Fechado (#417–#418) |
| Partner Fleet 1A→3B + PF3C | **PASS** (smokes documentados) |
| PF3D-0…3B | Em `main`, gates **OFF**; smokes OFF **PASS** |
| Availability Guard A+B | **PASS** |
| Lifecycle races (assign/accept/timeouts/disable/admin) | Grande parte fechada (#439–#485) |
| B2 next-trip | Só **DIAG** — espera Manel |
| Flag `ENABLE_VEHICLE_COMPLIANCE_GATES` | **OFF** |

### Grandes blocos concluídos

1. **P0 auth/demo + matching** (início Jul)  
2. **Ops P5** (secrets, cron, backup, Stripe fase A, NAV/WAZE, D-DEMO)  
3. **Admin Ops + pagamentos stuck** (~19/07)  
4. **Partner Fleet** (roster → vehicles → vehicle docs → PF3C) (~19–24/07)  
5. **PF3D** (decisão → helper → audit/seed → gates flagged → 3B messages) (~24–27/07)  
6. **Availability + lifecycle hardening** (~25–27/07)

### Estado actual do produto

App operacional com gates de compliance **desligadas**; Partner frota/docs visíveis; Availability Guard activo; B2 **não** implementado; PF3D ON **bloqueado** até atribuição real de viaturas/docs.

---

## 2. Timeline cronológica (por bloco)

### 2026-07-03 — 07 · Auth, matching, disponibilidade Driver

| Data | PR / merge | Objectivo | Resultado |
|------|------------|-----------|-----------|
| 03 | **#374** `385d428` | P0 demo hardening (auth default password, RBAC debug, matching, logging) | Merged |
| 03 | **#376** `fc201b5` | Categoria de viatura no redispatch | Merged |
| 04 | **#377** `650912f` | `is_test_account` MVP | Merged |
| 04 | **#378** (squash/`845c579`) | Backfill test-account só allowlist | Merged |
| 07 | **#383** `f705a12` | Redispatch quando GPS chega tarde | Merged |
| 07 | **#386** `479bc7d` | Sync UI disponibilidade ↔ backend | Merged |
| 07–09 | **#387**, **#388** | GPS em trip activa; restaurar trip no reload | Merged (#388 via #398 docs/context) |

**Impacto:** base segura para contas teste vs real; matching deixa de “morrer” sem GPS; Driver UI alinhada com `is_available`.

### 2026-07-09 — 14 · Auth endurecido + ops P5

| Data | PR | Tema |
|------|-----|------|
| 09–11 | **#389–#394**, **#397** | OTP persistência, throttle, sem log OTP em prod, capacidade beta, Stripe test card bloqueado em prod |
| 11 | **#396** | Docs cron / `ENABLE_DEV_TOOLS` |
| 12 | **#399–#401** | Rotação secrets, smoke pós-rotação, backup/restore |
| 13–14 | **#402**, **#403**, **#398** | Stripe Fase A local; launchers WT; recovery trip activa Driver |

**Impacto:** higiene produção (secrets, cron, BKP); pagamentos mock protegidos; Driver recupera viagem após reload.

### 2026-07-15 — 18 · Demo UX + Admin poll

| Data | PR | Tema |
|------|-----|------|
| 15–16 | **#404**, **#405**, **#406** | Checkpoint; NAV/WAZE-1; D-DEMO-1 **PASS** |
| 17 | **#407–#408** | Copy TW trip + smoke close |
| 18 | **#409–#412** | Admin poll/refresh; docs Admin ≠ dispatcher |

**Impacto:** walkthrough multi-role; Admin deixa de parecer dispatcher; navegação Waze/Google alinhada.

### 2026-07-19 · Pagamentos stuck + Admin Ops + Partner 1A

| PR | Tema | Resultado |
|----|------|-----------|
| **#413** | Passenger active trip recovery | Merged |
| **#414** | Admin Ops Fase 0 smoke **PASS** | Docs |
| **#415** | Test DB guard local-only | Pytest seguro |
| **#416–#420** | Checkpoint + mock payments close + security close | **PAYMENTS-STUCK PASS** |
| **#421–#422** | Admin trip support surface + smoke **PASS** | Merged |
| **#423–#426** | Partner roster/reports + CSV fixes + smoke 1A **PASS** | Merged |

### 2026-07-20 — 22 · Partner Fleet 2 → 3B

| PR | Tema |
|----|------|
| **#427–#429**, **#431** | Vehicles backend/UI + categories + smoke 2 **PASS** |
| **#430**, **#432–#438** (squash) | Vehicle docs BE/UI; transfers; re-review; downloads; races fleet/accept |
| **#439–#443**, **#444** | Timeout assigned; fleet transfer vs accept; smoke 3B **PASS**; checkpoint Partner-Fleet |

### 2026-07-23 · Partner Ops UX live trips

| PR | Tema |
|----|------|
| **#445–#447** | Link frota→trip; refresh/poll detalhe; card viagem activa Home |
| **#448**, **#450** | Stale refresh; limpar detalhe após perda acesso (PII) |
| **#451** | OPS-UX-1 smoke **PASS** |

### 2026-07-24 · PF3C document_summary + alertas

| PR | Tema |
|----|------|
| **#452–#456** | Helpers → API summary → badges → plurals → Home alerts |
| **#457** | PF3C smoke **PASS** |
| **#458–#460** | PF3D-0 docs + compliance helper + audit script |

### 2026-07-25 · PF3D DATA + gates flagged

| PR | Tema |
|----|------|
| **#461–#465** | Audit by partner; suggest/apply active vehicle (dev); seed docs; re-audit docs |
| **#466** | Read-only `vehicle_compliance` API |
| **#467** | Gates atrás de `ENABLE_VEHICLE_COMPLIANCE_GATES` default **false** |

### 2026-07-26 · PF3D OFF smoke + Availability + races

| PR | Tema |
|----|------|
| **#468–#470** | Redispatch filter (se ON); force-online bloqueia trip activa; lock force-online |
| **#471** | PF3D-3A/OFF smoke **PASS** |
| **#472–#474** | go_online/recover vs accept; timeouts vs arriving/start; admin cancel vs complete |
| **#475–#477** | Partner availability UX; Driver remote sync; stale GET races |
| **#478** | Availability Caso A smoke **PASS** |

### 2026-07-27 · Guard B, B2 DIAG, PF3D-3B, lifecycle bot

| PR | Tema |
|----|------|
| **#479** | Availability Caso B smoke **PASS** |
| **#480** | `assign_trip` lock vs accept + payment guard |
| **#481** | B2 next-trip **DIAG** (sem implementação) |
| **#482** | Partner disable → clear availability + expire offers |
| **#483** | PF3D-3B **DIAG** mensagens |
| **#484** | Admin promote/demote/delete + assign expira offers |
| **#485** | Deadlock disable ↔ accept (2ª TX expire) |
| **#486** | PF3D-3B i18n/CTA/logs |
| **#487** | PF3D-3B/OFF smoke **PASS** (docs) |

---

## 3. Blocos funcionais

### A. Segurança / Auth / contas

| Item | PRs | Estado |
|------|-----|--------|
| Default password restrito em prod | #374 | Fechado |
| `is_test_account` + allowlist backfill | #377, #378 | Fechado |
| OTP / throttle / sem log OTP / beta capacity | #389–#394 | Fechado |
| Stripe test card bloqueado em prod | #397 | Fechado |
| O-SECURITY password SA | docs #420 | **PASS** (doc) |
| Rotação secrets O-ROTATE-1 | #399–#400 | **PASS** (doc) |

### B. Matching / disponibilidade / Driver

| Item | PRs | Estado |
|------|-----|--------|
| Redispatch GPS tardio / starvation | #383–#384 | Fechado |
| Sync UI disponibilidade | #386 | Fechado |
| GPS em trip; restore trip reload | #387–#388/#398 | Fechado |
| Remote sync + stale GET | #476–#477 | Fechado |
| Availability Guard A/B | #469–#470, #475–#479 | **PASS** smokes |

### C. Trips lifecycle / pagamentos

| Item | PRs | Estado |
|------|-----|--------|
| Mock payments stuck → succeeded/close | #417–#418 | **PASS** |
| Timeouts assigned / accepted / ongoing | #439, #473 | Fechado |
| arriving/start locks; admin cancel vs complete | #473–#474 | Fechado |
| assign vs accept; payment guard | #480 | Fechado |
| Fleet transfer vs accept/reassign | #434, #438, #442 | Fechado |
| Passenger active trip recovery | #413 | Fechado |

### D. Partner / Fleet

| Item | PRs | Estado |
|------|-----|--------|
| Roster/reports/CSV | #423–#426 | Smoke 1A **PASS** |
| Vehicles CRUD + categories | #427–#429 | Smoke 2 **PASS** |
| Vehicle documents BE/UI | #432–#437, #440–#441 | Smoke 3B **PASS** |
| Force-online/offline + UX | #469–#470, #475 | Fechado |
| Disable bloqueia accept + deadlock fix | #482, #485 | Fechado |
| Live trip surfaces Home/Detail | #445–#450 | OPS-UX-1 **PASS** |

### E. Admin / OPS

| Item | PRs | Estado |
|------|-----|--------|
| Admin ≠ dispatcher (produto) | #412 | Docs |
| Poll/refresh feedback | #409–#411 | Fechado |
| Trip support surface | #421–#422 | Smoke **PASS** |
| Promote/demote/delete vs trip viva; assign expira offers | #484 | Fechado |
| Pytest DB guard | #415 | Fechado |

### F. PF3A…PF3D

| Fase | PRs / docs | Estado |
|------|------------|--------|
| PF3C summary/badges/alerts | #452–#457 | Smoke **PASS** |
| PF3D-0 matriz | #458 | Docs |
| PF3D-1 helper | #459 | Código |
| DATA-1A…1E audit/seed | #460–#465 | Dev only |
| PF3D-2 read-only API | #466 | Código |
| PF3D-3A gates flagged OFF | #467–#468 | Código + smoke OFF **PASS** (#471) |
| PF3D-3B messages/logs | #483 DIAG, #486, #487 smoke | **PASS** OFF |

### G. B2 next-trip

- Doc: [`B2_NEXT_TRIP_CHAINING_DIAG_2026-07-27.md`](../architecture/B2_NEXT_TRIP_CHAINING_DIAG_2026-07-27.md) (#481).
- Veredicto: sistema **não** suporta next-trip while ongoing de forma segura; precisa redesenho (queue, `is_available`, matching, UI, ETA).
- **Não implementado** — espera decisão Manel (B queued / C hold / adiar).
- Availability Guard A+B permanece a regra correcta.

### H. Documentação

Smokes/checkpoints Jul (lista não exaustiva de todos os `.md`, mas os canónicos):

- Partner Fleet 1A/2/3B · checkpoint 22/07  
- Admin Ops Fase 0 + Admin Ops 2  
- Payments stuck / post-415 / O-SECURITY  
- D-DEMO-1 · OPS-UX-1 · PF3C · PF3D-3A/OFF · Availability A/B · PF3D-3B DIAG/OFF · B2 DIAG  
- `PROXIMA_SESSAO.md`, `DOCS_INDEX.md`, `FORWARD_PLAN_2026-07.md` (última actualização do plano: 19/07 — **parcialmente desactualizado** vs tip 27/07)

---

## 4. PRs relevantes (amostra por categoria)

CI: tipicamente `backend-ci` + `web-e2e` (+ `web-app` quando FE). Detalhe check-a-check por PR histórica: **não revalidado** para as ~94 PRs nesta geração; as recentes (#484–#487) estavam verdes no merge.

| PR | Merge | Título (curto) | Cat. | Risco | Resultado |
|----|-------|----------------|------|-------|-----------|
| 374 | `385d428` | P0 demo hardening | Auth | Médio | Merged |
| 377 | `650912f` | test vs real accounts | Auth | Médio | Merged |
| 383 | `f705a12` | GPS redispatch | Matching | Médio | Merged |
| 386–388 | vários | Driver avail/GPS/reload | Driver | Médio | Merged |
| 397 | — | Block Stripe test card prod | Pay | Alto | Merged |
| 405 | `624ab4e` | NAV/WAZE-1 | UX | Baixo | Merged |
| 415 | `916ddb2` | Test DB guard | CI | Médio | Merged |
| 417–418 | — | Mock payments close | Pay | Alto | Merged |
| 421 | `61ad836` | Admin trip support | Admin | Médio | Merged |
| 423–429 | — | Partner fleet 1A–2 | Partner | Médio | Merged |
| 432–438 | squash | Vehicle docs + races | Partner | Alto | Merged |
| 445–451 | — | Partner live trip UX | Partner | Médio | Merged |
| 452–457 | — | PF3C | Partner | Médio | Merged |
| 458–467 | — | PF3D-0…3A | PF3D | Alto* | Merged (*flag OFF) |
| 469–477 | — | Availability + locks | Lifecycle | Alto | Merged |
| 480–485 | — | assign/disable/admin/deadlock | Lifecycle | Crítico | Merged |
| 486 | `e404bcd` | PF3D-3B messages | PF3D | Baixo | Merged |
| 487 | `469d7a4` | 3B OFF smoke docs | Docs | Nulo | Merged |

\*Gates em código mas **OFF** por defeito — risco operacional baixo enquanto a flag não for ligada.

---

## 5. Testes e CI

| Tipo | Exemplos no período | Notas |
|------|---------------------|-------|
| Race/backend | timeout races; fleet transfer vs accept; go_online/accept; force-online; disable/accept deadlock; assign/accept; promote/demote | Pytest (CI `backend-ci`) |
| PF3D | `test_vehicle_compliance_gates_pf3d3a.py` (+ logs 3B) | Flag monkeypatch ON/OFF |
| Vitest/RTL | Partner availability; vehicleComplianceGateMessages; driverAvailabilitySync | FE |
| CI | `backend-ci`, `web-e2e`, `frontend-ci`/`web-app` | Padrão nas PRs |
| Guard local | #415 — pytest não corre contra DB remota | Documentado |

Smoke **manual** continua a ser a prova operacional em prod (ver §6).

---

## 6. Smokes manuais documentados (desde 02/07)

| Smoke | Doc | Objectivo | Resultado |
|-------|-----|-----------|-----------|
| S-PROD-2 pós-rotação | #400 / FORWARD_PLAN | Login/online/GPS/viagem pós-secrets | **OK** (doc plano) |
| D-DEMO-1 | [`D_DEMO_1_CHECKPOINT_2026-07-16.md`](../ops/D_DEMO_1_CHECKPOINT_2026-07-16.md) | Walkthrough multi-role | **PASS** |
| Admin Ops Fase 0 | [`ADMIN_OPS_1_FASE0_SMOKE_2026-07-19.md`](../ops/ADMIN_OPS_1_FASE0_SMOKE_2026-07-19.md) | Gates B/C | **PASS** |
| Admin Ops 2 | [`ADMIN_OPS_2_SMOKE_2026-07-19.md`](../ops/ADMIN_OPS_2_SMOKE_2026-07-19.md) | Trip support | **PASS** |
| Partner Fleet 1A | [`PARTNER_FLEET_1A_SMOKE_2026-07-20.md`](../ops/PARTNER_FLEET_1A_SMOKE_2026-07-20.md) | Roster/reports | **PASS** |
| Partner Fleet 2 | [`PARTNER_FLEET_2_SMOKE_2026-07-21.md`](../ops/PARTNER_FLEET_2_SMOKE_2026-07-21.md) | Vehicles | **PASS** |
| Partner Fleet 3B | [`PARTNER_FLEET_3B_SMOKE_2026-07-22.md`](../ops/PARTNER_FLEET_3B_SMOKE_2026-07-22.md) | Vehicle docs | **PASS** |
| OPS-UX-1 | [`OPS_UX_1_SMOKE_PASS_2026-07-23.md`](../ops/OPS_UX_1_SMOKE_PASS_2026-07-23.md) | Pax/Driver/Partner UX | **PASS** |
| PF3C | [`PF3C_VEHICLE_DOCUMENT_ALERTS_SMOKE_PASS_2026-07-24.md`](../ops/PF3C_VEHICLE_DOCUMENT_ALERTS_SMOKE_PASS_2026-07-24.md) | Alertas docs | **PASS** |
| PF3D-3A/OFF | [`PF3D_3A_OFF_SMOKE_PASS_2026-07-26.md`](../ops/PF3D_3A_OFF_SMOKE_PASS_2026-07-26.md) | Fluxo completo gates OFF | **PASS** |
| Availability A | [`AVAILABILITY_FORCE_ONLINE_SYNC_SMOKE_PASS_2026-07-26.md`](../ops/AVAILABILITY_FORCE_ONLINE_SYNC_SMOKE_PASS_2026-07-26.md) | Sync Partner↔Driver | **PASS** |
| Availability B | [`AVAILABILITY_ACTIVE_TRIP_GUARD_SMOKE_PASS_2026-07-27.md`](../ops/AVAILABILITY_ACTIVE_TRIP_GUARD_SMOKE_PASS_2026-07-27.md) | Force-online com trip activa | **PASS** |
| PF3D-3B/OFF | [`PF3D_3B_OFF_SMOKE_PASS_2026-07-27.md`](../ops/PF3D_3B_OFF_SMOKE_PASS_2026-07-27.md) | #486 zero mudança ops | **PASS** |

**Destaques de evidência:**

- **Caso A:** Partner offline→online→offline reflecte na Driver app sem refresh.  
- **Caso B:** 409 `driver_has_active_trip` + UI PT; Driver não volta a «À espera».  
- **3B/OFF:** Marly sem `active_vehicle_id` force-online **200** (prova flag OFF); accept `accepted` sem códigos PF3D; CTA gate ausente sem erro.

---

## 7. Estado actual (à data de geração)

| Item | Valor |
|------|--------|
| `main` / `origin/main` | `469d7a4` |
| Working tree | Limpa |
| `ENABLE_VEHICLE_COMPLIANCE_GATES` | **OFF** (default `False`) |
| B2 | **Não** implementado |
| Availability Guard | **PASS** A+B |
| PF3D-3B | Em main + smoke OFF **PASS** |
| Seguro/fechado | Auth teste/real, payments mock stuck, Partner Fleet 1–3B/PF3C, races principais lifecycle, Admin trip support |
| Pendente | B2 (Manel); PF3D ON; atribuição real viaturas/docs; UX rica compliance; Stripe live parceiro |

---

## 8. Pendências / próximos passos

| Tipo | Itens |
|------|--------|
| **Decisão produto** | B2 (B/C/adiar); quando/se activar PF3D ON; Admin override PF3D |
| **Técnico** | Atribuição real `active_vehicle_id` + docs reais; smoke ON controlado (nunca prod global cego); PF3D-4 UX rica |
| **Operacional** | A2-02 staging OAuth (ainda no FORWARD_PLAN); hygiene branches locais (R-GIT-1) |
| **Documentação** | `FORWARD_PLAN_2026-07.md` desactualizado vs tip 27/07; sync opcional |
| **Riscos conhecidos** | Ligar gates sem frota atribuída = muitos `no_active_vehicle`; B2 mal feito reabre races |

---

## 9. Riscos fechados (lifecycle / ops)

| Risco | Fix (PR) |
|-------|----------|
| Accept após partner disable | #482 |
| Deadlock disable ↔ accept (Payment órfão) | #485 |
| assign_trip vs accept concurrente | #480 |
| Admin cancel vs complete | #474 |
| Timeouts vs arriving/start/complete | #473 / #439 |
| go_online / recover vs accept | #472 |
| Partner force-online vs accept / trip activa | #469–#470 |
| Fleet transfer vs accept | #434, #438, #442 |
| Promote força online mid-trip; demote/delete SET NULL | #484 |
| Assign deixa offers → accept 409 | #484 |
| Stale availability GET | #477 |
| Mensagens PF3D opacas (só quando ON) | #486 |
| Mock payments stuck processing | #417–#418 |
| Default password / test accounts / OTP leaks | #374–#394 |

---

## 10. Riscos ainda abertos

| Risco | Notas |
|-------|--------|
| **B2 next-trip** | Diagnóstico: não seguro no modelo actual; espera Manel |
| **PF3D gates ON** | Bloqueado — DATA-1E / falta atribuição real |
| **Atribuição real viaturas/docs** | Pré-requisito ON |
| **Admin override PF3D** | PF3D-5 pendente |
| **UX compliance rica** | PF3D-4 além do mínimo 3B |
| **Stripe live** | Fora de scope piloto (`STRIPE_MOCK` prod) — doc plano |
| **Partner Driver Detail UX debt** | Scroll / force-online enterrado — não blocker |

---

## Notas de exactidão

- Datas e hashes vêm de `git log` / merges / docs de smoke; títulos de PRs antigas via `gh` quando disponível.
- Commits **entre 2026-06-06 e 2026-07-02:** nenhum no histórico local analisado (gap até 03/07).
- Squash merges (#430–#438, etc.) entram na timeline mas **não** aparecem como `Merge pull request` em todos os casos.
- CI histórico check-a-check de cada PR: **não reconfirmado** nesta geração excepto merges recentes já observados.
- Sem segredos / passwords neste relatório.

---

*Docs-only. Relatório histórico — sem alterações runtime · env · DB · migrations.*
