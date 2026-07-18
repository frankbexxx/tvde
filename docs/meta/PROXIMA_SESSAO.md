# PROXIMA_SESSAO.md — Handoff

Contexto curto para a próxima sessão. **Lista operacional:** painel **PRÓXIMA SESSÃO** em [`TODOdoDIA.md`](../../TODOdoDIA.md).

**Histórico completo (fechos Abril–Maio, Seções A–E):** `C:\dev\_archives\APP\docs-2026-06\lote-3\PROXIMA_SESSAO.md`

**Plano operacional Julho:** [`FORWARD_PLAN_2026-07.md`](../ops/FORWARD_PLAN_2026-07.md)

---

## Contexto actual (**2026-07-18**)

### Checkpoint — ADMIN-OPS-1 Fase 0 parcial + ADMIN-POLL fechado

| Item | Estado |
|------|--------|
| **`main` / `origin/main`** | `9b6260e` |
| **PRs abertas** | **0** |
| **CI `main`** | Verde (pós-#411) |
| **ADMIN-POLL-1/2 frontend** | Fechado (#409 + #410); docs #411 |
| **S-ADMIN-POLL** | PASS — multi-janela Pax+Driver+Admin |
| **ADMIN-OPS-1** | Em curso — decisão produto Fase 0 parcial; smoke B/C a seguir |
| **D-DEMO-1** | PASS — [`D_DEMO_1_CHECKPOINT_2026-07-16.md`](../ops/D_DEMO_1_CHECKPOINT_2026-07-16.md) |

### Decisão produto — Admin ≠ dispatcher (Fase 0 parcial)

| Princípio | Detalhe |
|-----------|---------|
| Papel Admin | Excepções, bloqueios, suporte, auditoria, recuperação |
| **Não** é | Dispatcher / gestão operacional diária de frota |
| Botão **Atribuir** | Recovery / **super_admin** — **não** fluxo de negócio normal |
| Assign/reassign diário | Matching automático e/ou **PARTNER-FLEET-1** (Partner Ops) |
| Tab **Agora** | Snapshot/manual após ADMIN-POLL-1 |
| Agora vs Viagens | Contagens diferentes observadas no smoke → **observação a verificar** (`R-AGORA-SNAP`), **não** bug confirmado |

Classificação A–D e matriz: [`BACKLOG_POST_PILOTO.md`](BACKLOG_POST_PILOTO.md) · secção ADMIN-OPS-1.

### Smoke ADMIN-OPS-1 Fase 0 — o que falta (B/C)

Continuar **depois** desta decisão docs. Foco:

1. Force `accepted → arriving` (motivo/governance; Pax/Driver coerentes)
2. Force `arriving → ongoing`
3. Gap `ongoing`: Admin **sem** complete/cancel/fail seguro — confirmar gap real
4. Nota operacional (audit; sem alterar pagamento); **sem** reconcile apply
5. Saúde/Ops: links + playbook mismatch (ex. ongoing vs cancel)

**1B Assign:** **SKIP** por defeito; se testado, só como recovery SA — **não** conta como PASS de ops normal.

### Entregas recentes (merged)

| PR | O quê |
|----|-------|
| **#411** | Docs fecho ADMIN-POLL frontend; próximo smoke multi-janela |
| **#410** | Feedback refresh manual Admin > Agora + fix tipos TS |
| **#409** | Admin: poll global → on-enter + refresh manual |
| **#407–#408** | TW-TRIP-COPY-1 + docs smoke |
| **#405–#406** | NAV/WAZE-1 + checkpoint D-DEMO-1 |

### Em pausa / monitorizar

| ID | Notas |
|----|-------|
| **R-AGORA-SNAP** | Copy/UX snapshot Agora vs refresh on-return — após smoke B/C |
| **R-E2E-1** | Flake intermitente — monitorizar |
| **O-STRIPE-LIVE** | Bloqueado — conta parceiro / `sk_live_*` |
| **R-GIT-1** | ~190 branches locais — **não apagar ainda** |
| **CI-MAINT-1** | Warning Actions Node 20 deprecated — baixa prioridade |

### O que fazer a seguir (ordem)

1. **S-ADMIN-OPS-0** — smoke Fase 0 B/C (lista acima); local only  
2. Docs/runbook pós-smoke (playbook mismatch, matriz estado→acção)  
3. UI honesty só se gaps confirmados (ex. relabel/esconder Atribuir) — **não agora**  
4. **PARTNER-FLEET-1** — casa natural do assign/reassign diário  
5. **ADMIN-HEALTH-1 / BACKEND-DBPOOL-2** — só se pool saturar  

**Ambiente local:** `scripts/windows/Open-TVDE-Dev-WT.bat`. Contas baseline: Pax `+351912345678` · Driver `+351911111111` · Admin SA `+351924075365` (frank).

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
