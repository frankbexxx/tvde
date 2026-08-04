# TODO do dia — TVDE

Ficheiro **vivo** na raiz do repo. **Uma fonte operacional** — handoff curto em [`docs/meta/PROXIMA_SESSAO.md`](docs/meta/PROXIMA_SESSAO.md).

**Fecho de etapas:** mal uma entrega estiver em `main` (ou smoke feito), **actualizar este painel sem pedir confirmação**.

**Histórico completo (painéis Abril–Maio):** `C:\dev\_archives\APP\docs-2026-06\lote-3\TODOdoDIA.md`

### Formato dos painéis

`| ID | Item | Estado | Notas |`

**Estado (fixo):** Por iniciar · Em curso · Smoke pendente · Concluído · Bloqueado · N/A

**Prefixos:** **A-** auditoria/gates · **X-** EXTRA produto · **TW-** tweaks UX · **G-** screenshot matrix · **R-** rasto técnico · **O-** opcional · **S-** smokes prod · **F-** fixes pós-smoke

---

## Painel — **PRÓXIMA SESSÃO** (**2026-08-04** — tip `1671c9f` · B2 groundwork pré-férias **fechado**)

**`main` / `origin/main`:** `1671c9f` · alinhado · CI verde na #527 (`backend-ci` · `web-e2e`) · migration CI `b9c0d1e2f3a4 → c2d3e4f5a6b7`.

**Calendário:** semana 03–07 ago = groundwork B2 **feito** · semana 10–13 ago = estabilização + portátil/SSD · férias **14–31 ago** · **DEMO MANEL 2 = Setembro** (alargada).

**Objectivo imediato:** **1 carril** — SSD/férias readiness · polish Partner mapa opcional. **Não** B2-BE-2/BE-3 · **não** MATCH-ETA/UI · **não** activar flag · **não** PF3D ON · **não** Stripe live · **não** docs reais · **não** redispatch imediato.

**Handoff:** [`docs/meta/PROXIMA_SESSAO.md`](docs/meta/PROXIMA_SESSAO.md) · B2: [`docs/architecture/B2_PRODUCT_DECISIONS_2026-08-04.md`](docs/architecture/B2_PRODUCT_DECISIONS_2026-08-04.md) · Demo: [`docs/ops/DEMO_4_PAPEIS.md`](docs/ops/DEMO_4_PAPEIS.md) · Roadmap: [`docs/ops/ROADMAP_POS_DEMO_SMOKE_2026-07-30.md`](docs/ops/ROADMAP_POS_DEMO_SMOKE_2026-07-30.md) · Review: [`docs/meta/PR_REVIEW_CHECKLIST.md`](docs/meta/PR_REVIEW_CHECKLIST.md)

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **S-DEMO-MANEL-1** | Demo Manel 1 (carro/telefone real) | Concluído | **COMPLETA** — o que deveria funcionar, funcionou; sem cobertura total / sem prints |
| **O-DEMO-MANEL-2** | Demo Manel 2 (alargada) | Por iniciar | **Setembro** — guião + smoke pré-demo |
| **PR-517** / **S-PARTNER-517** | Partner labels + smoke | Concluído | `78fbd29` · PASS |
| **PR-518** | Docs smoke Partner #517 | Concluído | `aadc57d` |
| **PR-519** | Driver nav labels por fase | Concluído | `eb3c929` — recolha/destino |
| **PR-520** | Docs DEMO MANEL 1 + week plan | Concluído | `aafe811` |
| **PR-515** / **NAV-3D.2b** | Agora refresh ErrorBanner | Concluído | `dc66772` |
| **A-PARTNER-MAP** / **S-PARTNER-MAP** | Partner mapa live | Concluído | Smoke prod **PASS**; polish (zoom/timestamp) depois — não blocker |
| **X-ACTIVETRIP-RESTORE** / **S-ACTIVETRIP-F5** | ActiveTrip F5 restore | Concluído | Smoke prod **PASS**; sem PR código esta semana |
| **X-DRIVER-REJECT** / **S-DRIVER-REJECT** | Driver Recusar oferta | Concluído | #521+#522+#523 · tip `c4690ea` · smoke **PASS** |
| **PR-521** | `reject_offer` locks | Concluído | `0294842` |
| **PR-522** | UI Recusar → reject API | Concluído | `01d7fc1` · Silenciar local |
| **PR-523** | BETA location sem assigned órfão | Concluído | `c4690ea` · BUG-REJECT-BETA-1 |
| **R-REJECT-REDISPATCH** | Redispatch imediato pós-reject | Por iniciar | Fora de scope; cron/TTL actual OK p/ demo |
| **AVAIL-B2-NEXT-TRIP** | B2 next-trip chaining | Concluído | Groundwork pré-férias **fechado** (#525–#527); flag OFF; zero writers; lifecycle/UI **pós-férias** |
| **B2-PRODUTO-DOCS** | Decisões produto B2 | Concluído | #525 · Opção B · 1 queued · ETA 12 · PI na promoção — [`B2_PRODUCT_DECISIONS_2026-08-04.md`](docs/architecture/B2_PRODUCT_DECISIONS_2026-08-04.md) |
| **B2-CONFIG** | Flags OFF + defaults | Concluído | #526 · `ENABLE_NEXT_TRIP_CHAINING=False` · `NEXT_TRIP_MAX_PICKUP_ETA_MINUTES=12` · zero consumers |
| **B2-SPIKE-BE-1** | Schema `queued` inerte | Concluído | #527 · `1671c9f` · enum + SM + `uq_trips_one_queued_per_driver` · zero writers |
| **B2-SPIKE-BE-2** | Lifecycle helpers sibling-aware | Por iniciar | **Pós-férias** — sem accept/promote ainda |
| **B2-SPIKE-BE-3** | Accept→queued + promote + PI | Por iniciar | **Pós-férias** — atrás de flag OFF |
| **B2-MATCH-ETA** | Matching janela ETA 12 min | Por iniciar | **Pós-férias** |
| **B2-UI-MIN** | Driver current+next · Pax msg/cancel | Por iniciar | **Pós-férias** |
| **O-SSD-FERIAS** | Portátil + SSD / readiness férias | Por iniciar | Semana 10–13 ago |
| **R-PARTNER-REASSIGN-COPY** | Hint reassign `assigned` literal | Por iniciar | Display-only; baixa prioridade |
| **O-DEMO-4ROLES** / **S-DEMO-4** | Smoke 4 papéis prod | Concluído | PASS 2026-07-30 |
| **PF3D-GATES** | Compliance gates | Concluído | OFF em prod |
| **Bugbot / Cloud** | Automações Cursor | N/A | **OFF** |
| **O-STRIPE-LIVE** | Stripe live | Bloqueado | Fora desta fase |
| **R-GIT-1** | Limpeza branches locais | Por iniciar | Não apagar ainda |
| **CI-MAINT-1** | Warning Actions Node 20 | Por iniciar | Baixa prioridade |

**Próximo (recomendado):** SSD/férias · polish Partner mapa opcional · preparar Manel 2. **Não** B2-BE-2/3 / MATCH-ETA / UI / activar flag. Redispatch imediato **não** bloqueia demo.

**Regra:** **1 carril** por sessão · review humana ([`PR_REVIEW_CHECKLIST.md`](docs/meta/PR_REVIEW_CHECKLIST.md)).

---

## Painel — **2026-07-19** (histórico — pagamentos + O-SECURITY fechados)

**`main` (nessa data):** `77ddfac` · checkpoint pagamentos.

**Objectivo então:** Admin Ops seguinte · ou PARTNER-FLEET-1 · (Stripe live só com parceiro/docs).

**Checkpoint:** [`docs/ops/CHECKPOINT_2026-07-19_PAYMENTS_STUCK.md`](docs/ops/CHECKPOINT_2026-07-19_PAYMENTS_STUCK.md) · pós-#415: [`docs/ops/CHECKPOINT_2026-07-19_POST_415.md`](docs/ops/CHECKPOINT_2026-07-19_POST_415.md)

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **CHK-0715** | Checkpoint docs pós-P5 | Concluído | PR docs 2026-07-15 |
| **PR-405** | NAV/WAZE-1 Opção B | Concluído | Merged 2026-07-16; S-NAV-1…4 PASS |
| **D-DEMO-1** | Walkthrough multi-role local | Concluído | PASS 2026-07-16 — Pax+Driver+Partner+Admin |
| **CHK-DEMO-1** | Docs checkpoint D-DEMO-1 | Concluído | PR **#406** merged |
| **PR-407** / **TW-TRIP-COPY-1** | Soften trip copy demo | Concluído | Merged; smoke visual PASS 2026-07-17 |
| **S-TW407-1** | Smoke visual #407 | Concluído | Idle/search/accepted/ongoing/completed; NAV manual intacto |
| **PR-409** / **ADMIN-POLL-1** | Admin: on-enter + refresh manual | Concluído | Merged; sem `setInterval` global |
| **PR-410** / **ADMIN-POLL-2** | Feedback botão Atualizar (Agora) | Concluído | Merged; smoke visual PASS |
| **PR-411** | Docs fecho ADMIN-POLL frontend | Concluído | Merged |
| **PR-412** | Docs Admin ≠ dispatcher | Concluído | Merged |
| **PR-413** | Passenger active-trip recovery | Concluído | Merged; E2E + smoke PASS |
| **PR-414** | Docs ADMIN-OPS-1 Fase 0 B/C PASS | Concluído | Checkpoint smoke |
| **PR-415** / **TEST-DB-GUARD-1** | Guard pytest ≠ BD remota | Concluído | Merged; ver [`BACKEND_PYTEST_SAFE.md`](docs/testing/BACKEND_PYTEST_SAFE.md) |
| **CHK-0719** | Checkpoint docs pós-#415 | Concluído | PR **#416** |
| **PR-417** / **PAYMENTS-STUCK-1A** | Mock settle no `complete_trip` | Concluído | **PASS** — #417 |
| **PR-418** / **PAYMENTS-STUCK-1B** | Admin close-mock dry-run/apply | Concluído | **PASS** — #418 + apply Render 41+10 |
| **CHK-PAY-0719** | Checkpoint docs pagamentos + O-SECURITY | Concluído | Checkpoint Julho — fecho auth SA nessa linha |
| **PAYMENTS-EDGE-1** | cancelled + PI real → payment failed | Concluído | **PASS** — Dashboard `requires_payment_method`; sem Stripe API |
| **PAYMENTS-EDGE-2** | completed inválida → failed | Concluído | **PASS** — trip `4b29c6c9-…` |
| **O-SECURITY** | Rodar password SA | Concluído | **PASS** — `/auth/me/password`; nova OK · antiga FAIL; sem env |
| **S-ADMIN-POLL** | Smoke multi-janela Pax+Driver+Admin | Concluído | PASS — estabilidade OK pós-#409/#410 |
| **ADMIN-OPS-1** | Admin como ferramenta de excepção | Concluído | Fase 0 B/C **PASS** 2026-07-19 — ver checkpoint |
| **S-ADMIN-OPS-0** | Smoke Fase 0 B/C (force / gap ongoing) | Concluído | PASS; nota ops **SKIP**; 1B Assign SKIP |
| **R-ADMIN-ORPHAN-PANEL** | «Viagem aberta fora da lista» pós-completed | Por iniciar | Observação UX; não blocker |
| **R-AGORA-SNAP** | Agora vs Viagens (contagens) | Por iniciar | Observação snapshot/manual; **não** bug confirmado |
| **BACKEND-DBPOOL-2** / **ADMIN-HEALTH-1** | Optimizar system-health / pool local | Por iniciar | Saúde **ok** pós-edges; optimização só se saturar |
| **CI-MAINT-1** | Warning Actions Node 20 deprecated | Por iniciar | Baixa prioridade — ver painel 2026-07-29 |
| **PARTNER-FLEET-1** | Viaturas, docs, associação, reassign ops | Concluído | Evoluiu para PF3* / PF3D (gates OFF) — ver handoff |
| **NAV-WAZE-2** / **NAV-ROUTE-STOPS** | Nav manual nextStop + trip_stops | Por iniciar | Decisão Manel: botão sempre visível; sem auto-cadeia |
| **PR-398** | Driver active trip recovery | Concluído | Merged 2026-07-14 |
| **PR-403** | WT launchers Dev + Stripe local | Concluído | Merged 2026-07-14 |
| **TVDE-PROD** | Gate P5 beta | Concluído | O-ROTATE-1 · S-PROD-2 · O-CRON-1 · O-RENDER-1 · TVDE-BKP · O-STRIPE-1 |
| **O-i18n-NICHOS** | Strings PT residuais EN batch A–F | Smoke pendente | PR **#362** — se objectivo mudar |
| **A2-02-1** | OAuth staging + URIs Google | Em curso | Se staging for foco |
| **R-E2E-1** | Flake web-e2e intermitente | N/A | Caso Maps → #509; residual no painel 29 |
| **O-STRIPE-LIVE** | Stripe live / conta parceiro | Bloqueado | Parceiro + `sk_live_*` |
| **R-GIT-1** | Limpeza branches locais (~190) | Por iniciar | Higiene futura — não apagar ainda |

**ADMIN-OPS-1 Fase 0 B/C (fecho):** force arriving/ongoing OK; Pax/Driver coerentes; gap `ongoing` (sem complete/cancel/fail admin) confirmado; Driver completa; Histórico `completed`. Nota ops SKIP.

**Incidente mitigado (#415):** pytest local → Render via `.env`; guard + launcher seguro.

**Pagamentos + O-SECURITY fechados:** 1A/1B/EDGE-1/2 PASS · Health **ok** · password SA rodada (API; sem env).

**Nota:** painel vivo passou para **2026-07-29** (acima).

**Regra:** **1 carril** por sessão.

---

## Painel — 2026-05-22 (smokes pós-merge **#349** — Ambiance O1–O6)

**Smokes S-SMK-349-1…5:** Concluídos. Contratos: [`docs/ux/ambiance-chrome-contract.md`](docs/ux/ambiance-chrome-contract.md)

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **S-SMK-349-1…5** | Partner/driver/passageiro + temas + mapa | Concluído | PR **#349** |
| **R-NAV-INV-1** | Inventário navegação 4 apps | Concluído | [`navigation-inventory.md`](docs/ux/navigation-inventory.md) |

---

## Painel — 2026-05-24 / fecho 2026-05-29 (smokes **#341**)

**Smokes S-SMK-341-1…6:** Concluídos (**2026-05-29**). Código merge **#341** (`a208949`).

### Entrega #341 (fechada)

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **F-DOC-1…F-PAX-1** | Docs, offline, discover, offer UX, partner nav, rota fantasma | Concluído | Ver painel histórico L3 |
| **F-SMK-DOC-1…3** | Refresh docs, input ficheiro, alertas partner | Concluído | Pós-smoke fixes |
| **TW-SMK-OFFER-1…2** | Menu/copy ofertas silenciadas | Concluído | Menu → Viagens |
| **F-SMK-CAT-1** | Reactivar categoria X sem refresh | Concluído | `refetchAvailable` |
| **F-NAV-1** | Waze duplo (aceite + iniciar) | Concluído | Política **B** — só destino ao iniciar |
| **TW-SMK-PARTNER-1…4** | Partner shell menu-centric | Concluído | [`shell-menu-centric.md`](docs/ux/shell-menu-centric.md) |
| **TW-SMK-DOC-5** | Partner contador docs «N / 6» | Concluído | `partnerDocumentsApprovedCount` em `PartnerDriverDetail` |

---

## Painel — **PRÓXIMA SESSÃO** (lista consolidada — **2026-05-22** — histórico)

_Ver painel **2026-07-15** acima para estado actual._

**`main`:** i18n v2 (**#353**, **#354**); nichos EN — [`I18N_NICHOS_EN.md`](docs/architecture/I18N_NICHOS_EN.md).

### Aberto agora (P0 — produto)

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **TW-SMK-DOC-4** | Banner «Documentos em falta» topo mapa → infobox bottom | Concluído | #359 + #360; smoke OK (só infobox em baixo) |
| **O-NAV-REV-1** | G12 híbrido — toggle auto-open recolha ao aceitar | Concluído | #361; smoke OK (OFF/ON + destino ao iniciar) |
| **TW-DIA23-1** | Micro ajustes layout mapa/caixas | N/A | Adiar — acumular ecrãs em testes |
| **O-NAV-PP-1** | Barra 4 ícones passageiro/parceiro + menu tree | Concluído | Smoke passageiro + parceiro OK |
| **O-i18n-NICHOS** | Strings PT residuais em EN — batch 1 A–F | Smoke pendente | PR **#362** |
| **O-i18n-X3** | Legal EN — opção B (resumo + PT vinculante) | Concluído | `LegalLocaleNotice` login + Definições |

### P1 — infra / gates

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **A2-02-1** | OAuth staging + URIs Google | Em curso | [`STAGING_A2-02_RUNBOOK.md`](docs/ops/STAGING_A2-02_RUNBOOK.md) |
| **A2-02-2** | Smokes assertivos staging | Por iniciar | Depende A2-02-1 |
| **A4** | Fecho onda auditoria A+L | Por iniciar | [`AUDIT_EXEC_BACKLOG_AL_2026-05.md`](docs/audit/AUDIT_EXEC_BACKLOG_AL_2026-05.md) |
| **A3-R** | Gate §A3 checklist staging verde | Em curso | Humanos |

### P2 — UX / evolução (não urgente)

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **O-UX20-1** | Desenho UX 2.0 motorista | Por iniciar | [`DRIVER_UX_2_0.md`](docs/product/DRIVER_UX_2_0.md) |
| **R-LEGACY-1** | Layout legacy `!driverBottomNav` | Por iniciar | [`driver-ux-fixes-backlog.md`](docs/ux/driver-ux-fixes-backlog.md) |

### P5 — operação pré-escala

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **TVDE-PROD** | `PROD_VALIDATION` | **Concluído** | gate P5 beta ✅ · prod `STRIPE_MOCK=true` — [`FORWARD_PLAN_2026-07.md`](docs/ops/FORWARD_PLAN_2026-07.md) |
| **O-STRIPE-1** | Webhook Stripe (Fase A local) | **Concluído** | 2026-07-13 · [`O_STRIPE_1_RUNBOOK.md`](docs/ops/O_STRIPE_1_RUNBOOK.md) |
| **TVDE-BKP** | Backups + restore test | **Concluído** | 2026-07-12 · [`TVDE_BKP_RUNBOOK.md`](docs/ops/TVDE_BKP_RUNBOOK.md) |
| **TVDE-STG** | Staging smoke_validation | Por iniciar | [`TODO_CODIGO_TVDE.md`](docs/TODO_CODIGO_TVDE.md) §2 |

**Regra:** Frank + agente **escolhem 1 carril** (P0 vs P1 vs P5) antes de codar.

---

## Ritual de fecho de sessão

1. **Testes** → audits → correcções → merge/PR
2. Actualizar **este ficheiro** (painel + abertos) e [`PROXIMA_SESSAO.md`](docs/meta/PROXIMA_SESSAO.md) (cabeça)
3. Operação cron/Render: [`CRON_JOB_ORG_INSTRUCOES.md`](docs/CRON_JOB_ORG_INSTRUCOES.md) · [`W1_PROD_SMOKE.md`](docs/ops/W1_PROD_SMOKE.md)
