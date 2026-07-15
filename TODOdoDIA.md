# TODO do dia — TVDE

Ficheiro **vivo** na raiz do repo. **Uma fonte operacional** — handoff curto em [`docs/meta/PROXIMA_SESSAO.md`](docs/meta/PROXIMA_SESSAO.md).

**Fecho de etapas:** mal uma entrega estiver em `main` (ou smoke feito), **actualizar este painel sem pedir confirmação**.

**Histórico completo (painéis Abril–Maio):** `C:\dev\_archives\APP\docs-2026-06\lote-3\TODOdoDIA.md`

### Formato dos painéis

`| ID | Item | Estado | Notas |`

**Estado (fixo):** Por iniciar · Em curso · Smoke pendente · Concluído · Bloqueado · N/A

**Prefixos:** **A-** auditoria/gates · **X-** EXTRA produto · **TW-** tweaks UX · **G-** screenshot matrix · **R-** rasto técnico · **O-** opcional · **S-** smokes prod · **F-** fixes pós-smoke

---

## Painel — **PRÓXIMA SESSÃO** (**2026-07-15** — checkpoint TVDE-PROD pós-P5)

**`main` / `origin/main`:** `8b5f75f` · PRs abertas **0** · CI verde (`backend-ci` · `frontend-ci` · `web-e2e` 18/18).

**Objectivo imediato:** walkthrough demo/produto (sem código) → depois UX/copy estados viagem.

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **CHK-0715** | Checkpoint docs pós-P5 | Concluído | PR docs 2026-07-15 |
| **PR-398** | Driver active trip recovery (reload) | Concluído | Merged 2026-07-14; smoke manual PASS |
| **PR-403** | WT launchers Dev + Stripe local | Concluído | Merged 2026-07-14; [`scripts/windows/README.md`](scripts/windows/README.md) |
| **TVDE-PROD** | Gate P5 beta | Concluído | O-ROTATE-1 · S-PROD-2 · O-CRON-1 · O-RENDER-1 · TVDE-BKP · O-STRIPE-1 |
| **D-DEMO-1** | Walkthrough demo/produto | Por iniciar | Passageiro · motorista · parceiro — sem PR |
| **TW-TRIP-COPY-1** | UX/copy estados viagem | Por iniciar | Depois de D-DEMO-1 |
| **O-i18n-NICHOS** | Strings PT residuais EN batch A–F | Smoke pendente | PR **#362** — se objectivo mudar |
| **A2-02-1** | OAuth staging + URIs Google | Em curso | Se staging for foco |
| **R-E2E-1** | Flake web-e2e intermitente | Monitorizar | CI verde; não prioritário |
| **O-STRIPE-LIVE** | Stripe live / conta parceiro | Bloqueado | Parceiro + `sk_live_*` |
| **R-GIT-1** | Limpeza branches locais (~190) | Por iniciar | Higiene futura — não apagar ainda |

**Regra:** escolher **1 carril** por sessão (demo → copy → i18n/staging).

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
