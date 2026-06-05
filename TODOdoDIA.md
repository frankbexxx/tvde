# TODO do dia — TVDE

Ficheiro **vivo** na raiz do repo. **Uma fonte operacional** — handoff curto em [`docs/meta/PROXIMA_SESSAO.md`](docs/meta/PROXIMA_SESSAO.md).

**Fecho de etapas:** mal uma entrega estiver em `main` (ou smoke feito), **actualizar este painel sem pedir confirmação**.

**Histórico completo (painéis Abril–Maio):** `C:\dev\_archives\APP\docs-2026-06\lote-3\TODOdoDIA.md`

### Formato dos painéis

`| ID | Item | Estado | Notas |`

**Estado (fixo):** Por iniciar · Em curso · Smoke pendente · Concluído · Bloqueado · N/A

**Prefixos:** **A-** auditoria/gates · **X-** EXTRA produto · **TW-** tweaks UX · **G-** screenshot matrix · **R-** rasto técnico · **O-** opcional · **S-** smokes prod · **F-** fixes pós-smoke

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

## Painel — **PRÓXIMA SESSÃO** (lista consolidada — **2026-05-22**)

**Objectivo:** carril **A** (P0 produto). Docs audit L1–L4 **concluída** em `main`.

**`main`:** i18n v2 (**#353**, **#354**); nichos EN — [`I18N_NICHOS_EN.md`](docs/architecture/I18N_NICHOS_EN.md).

### Aberto agora (P0 — produto)

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **TW-SMK-DOC-4** | Banner «Documentos em falta» topo mapa → infobox bottom | Concluído | #359 + #360; smoke OK (só infobox em baixo) |
| **O-NAV-REV-1** | G12 híbrido — toggle auto-open recolha ao aceitar | Smoke pendente | Default OFF; Menu → Navegação |
| **TW-DIA23-1** | Micro ajustes layout mapa/caixas | N/A | Adiar — acumular ecrãs em testes |
| **O-NAV-PP-1** | Barra 4 ícones passageiro/parceiro + menu tree | Concluído | Smoke passageiro + parceiro OK |
| **O-i18n-NICHOS** | Strings PT residuais em EN | Em curso | Frank — workflow screenshot |
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
| **TVDE-PROD** | `PROD_VALIDATION` | Por iniciar | [`TODO_CODIGO_TVDE.md`](docs/TODO_CODIGO_TVDE.md) §1 |
| **TVDE-STG** | Staging smoke_validation | Por iniciar | Idem §2 |
| **TVDE-BKP** | Backups + restore test | Por iniciar | Idem §3 |

**Regra:** Frank + agente **escolhem 1 carril** (P0 vs P1 vs P5) antes de codar.

---

## Ritual de fecho de sessão

1. **Testes** → audits → correcções → merge/PR
2. Actualizar **este ficheiro** (painel + abertos) e [`PROXIMA_SESSAO.md`](docs/meta/PROXIMA_SESSAO.md) (cabeça)
3. Operação cron/Render: [`CRON_JOB_ORG_INSTRUCOES.md`](docs/CRON_JOB_ORG_INSTRUCOES.md) · [`W1_PROD_SMOKE.md`](docs/ops/W1_PROD_SMOKE.md)
