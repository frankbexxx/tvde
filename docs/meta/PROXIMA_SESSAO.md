# PROXIMA_SESSAO.md — Handoff

Contexto curto para a próxima sessão. **Lista operacional:** painel **PRÓXIMA SESSÃO** em [`TODOdoDIA.md`](../../TODOdoDIA.md).

**Histórico completo (fechos Abril–Maio, Seções A–E):** `C:\dev\_archives\APP\docs-2026-06\lote-3\PROXIMA_SESSAO.md`

---

## Contexto actual (**2026-05-22**)

- **Docs audit L1–L4:** concluída; handoff único (`TODOdoDIA` + este ficheiro).
- **Carril A (P0):** **TW-SMK-DOC-4** — banner docs no infobox inferior (em curso).
- **`main`:** smokes **#341** fechados; i18n v2 (**#353**, **#354**); ambiance **#349** OK.

### O que fazer a seguir (escolher 1 carril)

1. **P0 produto** — **TW-SMK-DOC-4** (banner docs no mapa) · **O-NAV-PP-1** smoke · **TW-DIA23-1** micro layout
2. **P1 staging** — **A2-02** OAuth + smokes ([`STAGING_A2-02_RUNBOOK.md`](../ops/STAGING_A2-02_RUNBOOK.md))
3. **P5 ops** — [`TODO_CODIGO_TVDE.md`](../TODO_CODIGO_TVDE.md) PROD validation + cron

### Specs activas

| Área | Onde |
|------|------|
| Motorista UX | [`driver-ux-fixes-backlog.md`](../ux/driver-ux-fixes-backlog.md), [`DRIVER_HOME_TOP3_MANEL.md`](../product/DRIVER_HOME_TOP3_MANEL.md) |
| Shell / nav | [`shell-menu-centric.md`](../ux/shell-menu-centric.md), [`navigation-inventory.md`](../ux/navigation-inventory.md) |
| i18n | [`I18N.md`](../architecture/I18N.md) |
| Login social L1 | [`SOCIAL_LOGIN_L1_SPEC.md`](../product/SOCIAL_LOGIN_L1_SPEC.md) |
| Roadmap engenharia | [`TVDE_ENGINEERING_ROADMAP.md`](../architecture/TVDE_ENGINEERING_ROADMAP.md) |

---

## Seção F — Operação (resumo)

_Canónico detalhado arquivado Lote 3; procedimentos em docs ops._

| Tema | Onde |
|------|------|
| Cron externo | `GET /cron/jobs?secret=<CRON_SECRET>` cada 30–60 s — [`CRON_JOB_ORG_INSTRUCOES.md`](../CRON_JOB_ORG_INSTRUCOES.md) |
| Smoke W1 prod | [`W1_PROD_SMOKE.md`](../ops/W1_PROD_SMOKE.md) |
| Timeouts manual | `POST /admin/run-timeouts`, `POST /admin/run-offer-expiry` |
| Fecho sessão | Testes → PR → actualizar [`TODOdoDIA.md`](../../TODOdoDIA.md) + este ficheiro |
| Validação PROD | [`A033_B_VALIDATION_HARDENING_PLAYBOOK.md`](../prompts/A033_B_VALIDATION_HARDENING_PLAYBOOK.md) |

---

## Seção G — Relatório / roadmap (resumo)

_Verdade operacional no código + [`TVDE_ENGINEERING_ROADMAP.md`](../architecture/TVDE_ENGINEERING_ROADMAP.md). Relatório texto histórico: snapshot em [`HISTORICO_FORA_DO_GIT.md`](../HISTORICO_FORA_DO_GIT.md)._

| Necessidade | Onde |
|-------------|------|
| Continuar amanhã | [`TODOdoDIA.md`](../../TODOdoDIA.md) + este ficheiro |
| Índice docs | [DOCS_INDEX.md](DOCS_INDEX.md) |
| Testes manuais | [GUIA_TESTES.md](../testing/GUIA_TESTES.md) |
| Implementação + pytest | [`IMPLEMENTACAO_E_TESTES.md`](../IMPLEMENTACAO_E_TESTES.md) |
| Arquivo fora do Git | [`HISTORICO_FORA_DO_GIT.md`](../HISTORICO_FORA_DO_GIT.md) |
