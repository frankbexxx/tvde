# Architecture docs — entry point

Esta pasta mistura **documentação operacional actual** com **snapshots históricos**.  
Começa aqui; **não** uses documentos SUPERSEDED como runbook.

## Current (usar)

| Doc | Uso |
|-----|-----|
| [`../env/ENV_SINGLE_REALITY.md`](../env/ENV_SINGLE_REALITY.md) | Env local / CI / Render; hosts; Stripe mock |
| [`../env/ENV_VARS_VERIFICATION.md`](../env/ENV_VARS_VERIFICATION.md) | Cruzamento local vs Render |
| [`../testing/BACKEND_PYTEST_SAFE.md`](../testing/BACKEND_PYTEST_SAFE.md) | Pytest só contra BD local segura |
| [`../deploy/PREPARACAO_RENDER.md`](../deploy/PREPARACAO_RENDER.md) | Deploy Render |
| [`../diagrams/`](../diagrams/) | Fluxos actuais (pagamentos, cron, auth, …) |
| [`TVDE_ENGINEERING_ROADMAP.md`](TVDE_ENGINEERING_ROADMAP.md) | Roadmap técnico (rever datas; cruzar com código) |
| [`I18N.md`](I18N.md) · [`I18N_NICHOS_EN.md`](I18N_NICHOS_EN.md) | i18n web-app |
| [`../../TODOdoDIA.md`](../../TODOdoDIA.md) · [`../meta/PROXIMA_SESSAO.md`](../meta/PROXIMA_SESSAO.md) | Operação / handoff |

## Historical / superseded (não operar a partir daqui)

| Doc | Nota |
|-----|------|
| [`ARCHITECTURE_STATUS.md`](ARCHITECTURE_STATUS.md) | Snapshot **2026-03-12** — banner SUPERSEDED (ex.: “local DB = Render”) |
| [`TVDE_SYSTEM_BLUEPRINT.md`](TVDE_SYSTEM_BLUEPRINT.md) | Blueprint aspiracional — referência, não arquitectura corrente |

Índice geral: [`../meta/DOCS_INDEX.md`](../meta/DOCS_INDEX.md).
