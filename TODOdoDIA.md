# TODO do dia — TVDE

Ficheiro **vivo** na raiz do repo. **Uma fonte operacional** — handoff curto em [`docs/meta/PROXIMA_SESSAO.md`](docs/meta/PROXIMA_SESSAO.md).

**Fecho de etapas:** mal uma entrega estiver em `main` (ou smoke feito), **actualizar este painel sem pedir confirmação**.

**Histórico completo (painéis Abril–Maio):** `C:\dev\_archives\APP\docs-2026-06\lote-3\TODOdoDIA.md`

### Formato dos painéis

`| ID | Item | Estado | Notas |`

**Estado (fixo):** Por iniciar · Em curso · Smoke pendente · Concluído · Bloqueado · N/A

**Prefixos:** **A-** auditoria/gates · **X-** EXTRA produto · **TW-** tweaks UX · **G-** screenshot matrix · **R-** rasto técnico · **O-** opcional · **S-** smokes prod · **F-** fixes pós-smoke · **T-** test infra

---

## Painel — **GOOGLE PASSENGER ONBOARDING** (**2026-09-25** — branch `feat/google-passenger-onboarding`)

Smoke Oppo CPH2689 contra a API de staging. PROD não foi alterada.

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **GOOG-ONB** | Google Passenger Onboarding | Concluído | **CLOSED** · staging `a63993c` · sessão só depois de nome, +351 e termos |
| **OAUTH-CAP** | OAuth Capacitor | Concluído | **CLOSED** · nonce alinhado · segundo login sem onboarding |
| **S-MOB-02** | Android no Oppo | Em curso | **PARTIAL** · aberto: push, GPS background, Waze/Maps, file picker, Play Store |

---

## Painel — **LATERAL AUDIT RECONCILE** (**2026-09-21** — tip `98ed421`)

P0/P1 originais desta auditoria: **OPEN = 0**. Follow-ups **não** reabrem findings.

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **L-PAY-01** | Webhook TX + 5xx BD | Concluído | #606 |
| **L-PAY-02** | ACK 200 not-found / mismatch | Concluído | **ACCEPTED DESIGN** · #634 · `O-PAY-WEBHOOK-ANOMALY` |
| **L-PAY-03** | Cancel fail-closed | Concluído | #628 · `R-PAY-ORPHAN-PI` |
| **L-TRIP-01** | Commit antes de WS offers | Concluído | #616 |
| **L-GPS-01** | Remover find-driver | Concluído | #617 |
| **L-GPS-02** | Debug matching owner aggregate | Concluído | #617 |
| **L-AUTH-01** | ADMIN_PHONE promote/guards | Concluído | #630 / #632 · `R-AUTH-SUPERADMIN-BOOTSTRAP` |
| **L-FE-01** | Polling stale / overlap | Concluído | #618 |
| **L-FE-02** | Logout limpa active trip | Concluído | #618 |
| **L-OBS-01** | Cron partial_error → 500 | Concluído | #625 · `O-CRON-TIMEOUT-PARTIAL` |
| **L-TEST-01** | Isolamento BD testes | Concluído | **ACCEPTED DEBT** · #635 · `T-DB-ISOLATION` / `T-TEST-DB-NAME-GUARD` |
| **L-DOC-01** | Arch Março SUPERSEDED | Concluído | #636 |
| **L-DOC-02** | Cron runbook canónico | Concluído | #626 / #627 · residual `R-DOC-CRON-STALE-EXAMPLES` |
| **L-SEC-09** | Cron header-only auth | Concluído | #627 |
| **L-SEC-10** | Remover JWT `?token=` em WebSockets | Concluído | #643 · Bearer-only · CLOSED |
| **L-SEC-11** | Rate limits in-memory / multi-worker | N/A | **ACCEPTED DEBT** · single-worker guard · #646 |
| **L-SEC-12** | OTP verify race / consume atómico | Concluído | **CLOSED** · SMS/provider por implementar · OTP PROD continua 503 |
| **L-SEC-17** | OTP API sem SMS em deployed | Concluído | **CLOSED** · `503 otp_auth_unavailable` · reactivar exige provider SMS + smoke · L-SEC-12 CLOSED |
| **L-SEC-14A** | Partner trip list cap (500) | Concluído | #644 · CLOSED |
| **L-SEC-14B** | Redispatch offers bulk load | Concluído | #645 · CLOSED |
| **L-SEC-14C** | Admin lists / matching pool piloto | N/A | **ACCEPTED DEBT** · revisit com escala |
| **L-SEC-13** | JWT invalidate after password change | Concluído | #642 · `token_version` · CLOSED |
| **L-SEC-15** | Interaction log own Session | Concluído | #640 · CLOSED |
| **L-SEC-16** | Driver document upload allowlist | Concluído | #638 · alinhado a viaturas · CLOSED |
| **L-SEC-19** | `compare_digest` cron secret | Concluído | #627 |
| **O-PAY-WEBHOOK-ANOMALY** | Alerta webhook anomalies | Por iniciar | Não muda ACK 200 |
| **R-PAY-ORPHAN-PI** | Reconcile PI aberto órfão | Por iniciar | — |
| **O-CRON-TIMEOUT-PARTIAL** | timeout_payment_cancel_failed → partial? | Por iniciar | Decisão HTTP cron |
| **R-AUTH-SUPERADMIN-BOOTSTRAP** | Bootstrap super_admin auditável | Por iniciar | Sem auto-promote login |
| **T-DB-ISOLATION** | Fixture TX + get_db override | Por iniciar | Médio prazo |
| **T-TEST-DB-NAME-GUARD** | Exigir nome DB `test_db` | Por iniciar | — |
| **R-DOC-CRON-STALE-EXAMPLES** | Limpar `?secret=` / 15s em IMPLEMENTACAO / A022 | Por iniciar | **Não** reabrir L-DOC-02 |

---

## Painel — **DOCS / L-DOC-01** (**2026-09-19**)

Março 2026 architecture docs marcados SUPERSEDED; índice aponta fontes operacionais. **Sem** reescrita dos corpos históricos.

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **L-DOC-01** | Arquitectura Março como “actual” + BD local=Render | Concluído | Banners + `DOCS_INDEX` + `architecture/README.md` |
| **L-DOC-02** | Cron runbook canónico | Concluído | #626/#627 · ver `R-DOC-CRON-STALE-EXAMPLES` |

---

## Painel — **TEST INFRA / L-TEST-01** (**2026-09-19**)

L-TEST-01 fechado como dívida aceite. **Sem** fixture TX global nesta fase. Ver [`BACKEND_PYTEST_SAFE.md`](docs/testing/BACKEND_PYTEST_SAFE.md) § isolamento.

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **L-TEST-01** | Isolamento BD por teste | Concluído | **ACCEPTED DEBT** · CI fresh ≠ per-test isolation · commits persistem · uniqueness obrigatória |
| **T-DB-ISOLATION** | Fixture TX + override `get_db` (mesma connection) | Por iniciar | Médio prazo · markers p/ baseline/reset · **não** truncate/recreate como 1.ª opção |
| **T-TEST-DB-NAME-GUARD** | Exigir nome DB de testes (`test_db` ou config) | Por iniciar | Guard actual só host local · evita `ride_db` acidental |

---

## Painel — **AUTH / L-AUTH-01** (**2026-09-19** — tip `9faa5c5`)

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **PR-630** | Remover promoção runtime `ADMIN_PHONE`→`super_admin` | Concluído | `9faa5c5` · roles só da DB no login |
| **PR-632** | Remover protecção admin por telefone | Concluído | `ab7809a` · staff só por role |
| **R-AUTH-SUPERADMIN-BOOTSTRAP** | Bootstrap/recovery explícito e auditável de `super_admin` | Por iniciar | Se DB ficar sem super_admin · **não** reintroduzir auto-promote no login |

---

## Painel — **PAYMENTS FAIL-CLOSED** (**2026-09-19** — tip `1b58627`)

Manual cancel (#628) + timeout (#629) fecham PI real cancelável antes da transição local. Follow-ups **fora** dessas PRs.

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **PR-628** | L-PAY-03 cancel manual fail-closed | Concluído | passenger/driver/admin |
| **PR-629** | Timeout Stripe cancel fail-closed | Concluído | `1b58627` · per-trip; batch continua; cron HTTP intacto |
| **L-PAY-02** | Webhook ACK 200 not-found / amount-mismatch | Concluído | **ACCEPTED DESIGN** · HTTP intacto · ver `O-PAY-WEBHOOK-ANOMALY` |
| **R-PAY-ORPHAN-PI** | Reconciliação activa de PI aberto órfão | Por iniciar | Reconcile observa terminal; **não** cancela PIs abertos hoje |
| **O-CRON-TIMEOUT-PARTIAL** | `timeout_payment_cancel_failed > 0` → cron `partial_error`? | Por iniciar | Decisão explícita · muda HTTP semantics do `/cron/jobs` |
| **O-PAY-WEBHOOK-ANOMALY** | Alerta/runbook `stripe_webhook_payment_not_found_ack` + `stripe_webhook_succeeded_amount_mismatch` | Por iniciar | Runbook em `docs/ops/O_STRIPE_1_RUNBOOK.md` §11 · **sem** mudar ACK 200 · orphan sem Payment = revisão manual |

---

## Painel — **PORTAGENS V1** (**2026-09-14** — tip `1382b35`)

**HERE Tolls V1 PROD VALIDATED — residual route variance accepted for V1.**

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **S-TOLLS-V1** | PORTAGENS F0–F5 | Concluído | PROD ON · #592/#593 · billing invariants PASS |
| **S-TOLLS-P2** | HERE routing determinism / toll variance | Por iniciar | P2 · mesmo OD €0.40 vs €2.55 · sem mudar billing/flag agora |
| **O-TOLLS-FISCAL** | Fiscal/legal tolls | Por iniciar | Fora do runtime V1 |

---

## Painel — **PRÉ-FÉRIAS** (**2026-08-11** — tip `1cb01c5` · MODO FÉRIAS ainda **OFF**)

**Modo:** **pré-férias** — PC principal = máquina activa. **MODO FÉRIAS** só a **13/14 ago** (após refresh SSD + cifrar secrets). Modelo: [`MODO_FERIAS_2026.md`](docs/ops/MODO_FERIAS_2026.md).

**`main` / `origin/main`:** `1cb01c5` · alinhado · #540 negócio Manel · #539 DL 84/2026 · #538 biblioteca Setembro.

**Calendário:** até 13 ago = PC normal · **13/14** = gatilho férias · férias **14–31 ago** · **DEMO MANEL 2 = Setembro**.

**Objectivo imediato:** kit viagem (**cifrar `TVDE_SECRETS` pendente** · refresh SSD 13/14) · biblioteca Setembro (legal · negócio · **MOBILE-001**) · **sem** implementar / **sem** Capacitor / **sem** lojas. Em férias: branches + push · docs/marca leve · sem B2/Stripe live/PF3D/Docker MJ.

**Handoff:** [`docs/meta/PROXIMA_SESSAO.md`](docs/meta/PROXIMA_SESSAO.md) · Biblioteca: [`SETEMBRO_2026_TODO_LIBRARY.md`](docs/product/SETEMBRO_2026_TODO_LIBRARY.md) · Negócio: [`docs/business/`](docs/business/) · Legal: [`LEGAL_SOURCES_INDEX.md`](docs/legal/LEGAL_SOURCES_INDEX.md) · Manel 2: [`DEMO_MANEL_2_SETEMBRO.md`](docs/ops/DEMO_MANEL_2_SETEMBRO.md)

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **S-DEMO-MANEL-1** | Demo Manel 1 (carro/telefone real) | Concluído | **COMPLETA** — o que deveria funcionar, funcionou; sem cobertura total / sem prints |
| **O-DEMO-MANEL-2** | Demo Manel 2 (alargada) | Em curso | Guião #532 · [`DEMO_MANEL_2_SETEMBRO.md`](docs/ops/DEMO_MANEL_2_SETEMBRO.md) · smoke pré-demo = Setembro |
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
| **O-SSD-FERIAS** | Portátil + SSD / readiness férias | Em curso | Clone+MJ **PASS** · limpeza leve MJ **PASS** 2026-08-07 · **cifra `TVDE_SECRETS` pendente** · refresh SSD **13/14** |
| **O-MJ-LIGHT-CLEAN** | Limpeza leve portátil MJ | Concluído | Startup reduzido · WPS tasks off · Chrome Memory Saver · ~3.4 GB RAM livre · nada desinstalado · críticos preservados |
| **O-MODO-FERIAS** | Entrada oficial MODO FÉRIAS | Por iniciar | Gatilho 13/14: SSD actualizada + secrets cifrados + main alinhada PC/SSD |
| **X-MANEL-INPUTS** | Backlog inputs Manel (pagamentos + app Driver) | Em curso | Docs [`MANEL_INPUTS_TODOS_2026-08-07.md`](docs/product/MANEL_INPUTS_TODOS_2026-08-07.md) · P0–P3 · perguntas abertas · **sem** implementação |
| **X-SETEMBRO-LIB** | Biblioteca TODOs/intenções Setembro 2026 | Em curso | [`SETEMBRO_2026_TODO_LIBRARY.md`](docs/product/SETEMBRO_2026_TODO_LIBRARY.md) · IP · pay · Driver · marca · demo · **não** sprint fechado |
| **LEGAL-TVDE-001** | DL 84/2026 — fonte legal bruta | Em curso | PDF em [`docs/legal/sources/`](docs/legal/sources/decreto-lei-84-2026-tvde-transporte-rodoviario.pdf) · índice [`LEGAL_SOURCES_INDEX.md`](docs/legal/LEGAL_SOURCES_INDEX.md) · leitura Setembro P0 · **sem** parecer |
| **BUSINESS-MANEL-001** | Custos / comissões / simulador (hipóteses) | Em curso | DOCX + 3 docs em [`docs/business/`](docs/business/) · P0 Setembro · **não** tarifário aprovado · **sem** campanha |
| **MOBILE-001** | Android / iOS (PWA/wrapper/Capacitor) | Por iniciar | Pergunta Manel · spike Setembro P0/P1 · **sem** código · **sem** lojas · **sem** app nativa do zero |
| **X-BRAND-SHORTLIST** | Shortlist logos / Ideogram (local) | Em curso | `image/_SHORTLIST_FINAL_6` + pranchas `_temp` · **sem** vencedor · **sem** troca em prod |
| **R-PARTNER-REASSIGN-COPY** | Hint reassign `assigned` literal | Por iniciar | Display-only; baixa prioridade |
| **O-DEMO-4ROLES** / **S-DEMO-4** | Smoke 4 papéis prod | Concluído | PASS 2026-07-30 |
| **PF3D-GATES** | Compliance gates | Concluído | OFF em prod |
| **Bugbot / Cloud** | Automações Cursor | N/A | **OFF** |
| **O-STRIPE-LIVE** | Stripe live | Bloqueado | Fora desta fase |
| **R-GIT-1** | Limpeza branches locais | Por iniciar | Não apagar ainda |
| **CI-MAINT-1** | Warning Actions Node 20 | Por iniciar | Baixa prioridade |

**Próximo (humano):** até 13 = PC normal · **13/14** = refresh SSD + **cifrar `TVDE_SECRETS` (ainda pendente)** + smoke leitura MJ → **MODO FÉRIAS ON**. Portátil MJ já com limpeza leve. Em férias: branches + push. **Não** B2/Stripe/PF3D/Docker MJ.

**Regra:** **1 carril** · review humana ([`PR_REVIEW_CHECKLIST.md`](docs/meta/PR_REVIEW_CHECKLIST.md)) · em férias preferir docs/FE leve.

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
