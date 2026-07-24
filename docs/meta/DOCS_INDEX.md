# Índice da Documentação — TVDE

~40 entradas activas (pós-auditoria Lotes 1–4). Histórico fora do Git: [`HISTORICO_FORA_DO_GIT.md`](../HISTORICO_FORA_DO_GIT.md).

**Começar aqui:** [`README.md`](../../README.md) → [`TODOdoDIA.md`](../../TODOdoDIA.md) → [`PROXIMA_SESSAO.md`](PROXIMA_SESSAO.md) → este índice.

---

## Operação e handoff

| Ficheiro | Propósito |
| -------- | --------- |
| [TODOdoDIA.md](../../TODOdoDIA.md) | Painel operacional vivo (tabelas ID/Estado) |
| [PROXIMA_SESSAO.md](PROXIMA_SESSAO.md) | Handoff curto + Seções F/G resumo |
| [FORWARD_PLAN_2026-07.md](../ops/FORWARD_PLAN_2026-07.md) | Plano ops pós-P5 + checkpoint Julho 2026 |
| [PF3C_VEHICLE_DOCUMENT_ALERTS_SMOKE_PASS_2026-07-24.md](../ops/PF3C_VEHICLE_DOCUMENT_ALERTS_SMOKE_PASS_2026-07-24.md) | PF3C PASS funcional — alertas/badges docs viatura 2026-07-24 |
| [OPS_UX_1_SMOKE_PASS_2026-07-23.md](../ops/OPS_UX_1_SMOKE_PASS_2026-07-23.md) | OPS-UX-1 PASS funcional — smoke Pax/Driver/Partner 2026-07-23 |
| [CHECKPOINT_2026-07-22_PARTNER_FLEET.md](../ops/CHECKPOINT_2026-07-22_PARTNER_FLEET.md) | Encerramento sessão Partner-Fleet 3B PASS + hardenings |
| [D_DEMO_1_CHECKPOINT_2026-07-16.md](../ops/D_DEMO_1_CHECKPOINT_2026-07-16.md) | Fecho walkthrough multi-role D-DEMO-1 PASS |
| [TODO_FUTURO.md](../TODO_FUTURO.md) | Backlog produto/técnico não urgente |
| [todo-futuro-nuances.md](../todo-futuro-nuances.md) | Nuances e decisões futuras |
| [TODO_CODIGO_TVDE.md](../TODO_CODIGO_TVDE.md) | Checklist pré-produção (PROD, staging, backups) |
| [GITHUB_MANUAL_TVDE.md](../GITHUB_MANUAL_TVDE.md) | Git + GitHub — fluxo TVDE |

---

## Produto (`docs/product/`)

| Ficheiro | Propósito |
| -------- | --------- |
| [DRIVER_MENU_SPEC.md](../product/DRIVER_MENU_SPEC.md) | Menu motorista |
| [DRIVER_HOME_TOP3_MANEL.md](../product/DRIVER_HOME_TOP3_MANEL.md) | Ecrã principal motorista (2 passos) |
| [DRIVER_UX_2_0.md](../product/DRIVER_UX_2_0.md) | Evolução UX motorista |
| [PORTAGENS_SPEC.md](../product/PORTAGENS_SPEC.md) | Portagens em viagem |
| [ROTACIONAL_V2_SPEC.md](../product/ROTACIONAL_V2_SPEC.md) | Rotacional v2/v3 |
| [SOCIAL_LOGIN_L1_SPEC.md](../product/SOCIAL_LOGIN_L1_SPEC.md) | Login social Google L1 |
| [MANEL_E_LEGAL_EXTRA_BACKLOG_2026-05.md](../product/MANEL_E_LEGAL_EXTRA_BACKLOG_2026-05.md) | Backlog Manel/legal |

---

## Arquitectura

| Ficheiro | Propósito |
| -------- | --------- |
| [TVDE_ENGINEERING_ROADMAP.md](../architecture/TVDE_ENGINEERING_ROADMAP.md) | Roadmap técnico + A023–A035 |
| [TVDE_SYSTEM_BLUEPRINT.md](../architecture/TVDE_SYSTEM_BLUEPRINT.md) | Blueprint sistema |
| [ARCHITECTURE_STATUS.md](../architecture/ARCHITECTURE_STATUS.md) | Estado técnico actual |
| [I18N.md](../architecture/I18N.md) | i18n PT/EN web-app |
| [I18N_NICHOS_EN.md](../architecture/I18N_NICHOS_EN.md) | Workflow nichos EN (screenshots) |

---

## UX (`docs/ux/`)

| Ficheiro | Propósito |
| -------- | --------- |
| [navigation-inventory.md](../ux/navigation-inventory.md) | Inventário navegação 4 apps |
| [ambiance-chrome-contract.md](../ux/ambiance-chrome-contract.md) | Contrato ambiance/chrome |
| [shell-menu-centric.md](../ux/shell-menu-centric.md) | Shell menu-centric partner |
| [shell-menu-ia-canonical.md](../ux/shell-menu-ia-canonical.md) | IA menus canónica |
| [driver-ux-fixes-backlog.md](../ux/driver-ux-fixes-backlog.md) | Backlog fixes motorista |
| [screenshot-tweaks-g-matrix.md](../ux/screenshot-tweaks-g-matrix.md) | Matriz G01–G27 |

---

## Testes e deploy

| Ficheiro | Propósito |
| -------- | --------- |
| [GUIA_TESTES.md](../testing/GUIA_TESTES.md) | Manual testes passo a passo |
| [DEV_BASELINE_ROSTER.md](../testing/DEV_BASELINE_ROSTER.md) | Users baseline dev/Render |
| [VALIDACAO_HUMANA_CAMPO.md](../testing/VALIDACAO_HUMANA_CAMPO.md) | Teste em campo |
| [PREPARACAO_RENDER.md](../deploy/PREPARACAO_RENDER.md) | Deploy Render |
| [IMPLEMENTACAO_E_TESTES.md](../IMPLEMENTACAO_E_TESTES.md) | Implementação + Parte II logs/pytest |

---

## Ops e staging

| Ficheiro | Propósito |
| -------- | --------- |
| [CRON_JOB_ORG_INSTRUCOES.md](../CRON_JOB_ORG_INSTRUCOES.md) | Cron externo |
| [FORWARD_PLAN_2026-07.md](../ops/FORWARD_PLAN_2026-07.md) | Plano ops pós-P5 · checkpoint Julho 2026 |
| [O_STRIPE_1_RUNBOOK.md](../ops/O_STRIPE_1_RUNBOOK.md) | Webhook Stripe Fase A local (test mode) |
| [TVDE_BKP_RUNBOOK.md](../ops/TVDE_BKP_RUNBOOK.md) | Backups Postgres + restore test |
| [W1_PROD_SMOKE.md](../ops/W1_PROD_SMOKE.md) | Smoke W1 prod |
| [STAGING_A2-02_RUNBOOK.md](../ops/STAGING_A2-02_RUNBOOK.md) | OAuth staging A2-02 |
| [INTERACTION_LOGGING.md](../ops/INTERACTION_LOGGING.md) | Telemetria / export logs |
| [DEBUG_BETA_RENDER.md](../DEBUG_BETA_RENDER.md) | Depuração BETA Render |
| [scripts/windows/README.md](../../scripts/windows/README.md) | Launchers WT Dev + Stripe local |

---

## Prompts e piloto

| Ficheiro | Propósito |
| -------- | --------- |
| [A000_SYSTEM_RULES.md](../prompts/A000_SYSTEM_RULES.md) | Regras agentes |
| [A033_B_VALIDATION_HARDENING_PLAYBOOK.md](../prompts/A033_B_VALIDATION_HARDENING_PLAYBOOK.md) | Playbook validação PROD |
| [pilot-commercial/README.md](../prompts/pilot-commercial/README.md) | Piloto comercial 4 superfícies |
| [PILOT_COMMERCIAL_PLACEHOLDER_INDEX.md](../prompts/pilot-commercial/PILOT_COMMERCIAL_PLACEHOLDER_INDEX.md) | Índice placeholders arquivados L1 |
| [PROMPT_I18N_INDEX.md](../prompts/i18n-v2/PROMPT_I18N_INDEX.md) | i18n v2 resumo |

---

## Meta, legal, diagramas

| Ficheiro | Propósito |
| -------- | --------- |
| [PROJECT.md](PROJECT.md) | Visão produto + modelo dados |
| [HISTORICO_FORA_DO_GIT.md](../HISTORICO_FORA_DO_GIT.md) | Arquivo fora do Git (Lotes 1–3) |
| [PARCEIRO_TVDE_CHECKLIST.md](../legal/PARCEIRO_TVDE_CHECKLIST.md) | Checklist operacional parceiro |
| [diagrams/README.md](../diagrams/README.md) | Índice Mermaid fluxos TVDE |
| [visao_cursor.md](../visao_cursor.md) | Visão + checklist comercialização |

---

## Lista numerada (referência rápida)

| # | Ficheiro |
|---|----------|
| 1 | [README.md](../../README.md) |
| 2 | [TODOdoDIA.md](../../TODOdoDIA.md) |
| 3 | [PROXIMA_SESSAO.md](PROXIMA_SESSAO.md) |
| 4 | [DOCS_INDEX.md](DOCS_INDEX.md) |
| 5 | [PROJECT.md](PROJECT.md) |
| 6 | [GITHUB_MANUAL_TVDE.md](../GITHUB_MANUAL_TVDE.md) |
| 7 | [TVDE_ENGINEERING_ROADMAP.md](../architecture/TVDE_ENGINEERING_ROADMAP.md) |
| 8 | [I18N.md](../architecture/I18N.md) |
| 9 | [GUIA_TESTES.md](../testing/GUIA_TESTES.md) |
| 10 | [PREPARACAO_RENDER.md](../deploy/PREPARACAO_RENDER.md) |
| 11 | [IMPLEMENTACAO_E_TESTES.md](../IMPLEMENTACAO_E_TESTES.md) |
| 12 | [TODO_CODIGO_TVDE.md](../TODO_CODIGO_TVDE.md) |
| 13 | [driver-ux-fixes-backlog.md](../ux/driver-ux-fixes-backlog.md) |
| 14 | [navigation-inventory.md](../ux/navigation-inventory.md) |
| 15 | [STAGING_A2-02_RUNBOOK.md](../ops/STAGING_A2-02_RUNBOOK.md) |
| 16 | [PROJECT_AUDIT_2026-05-02.md](../audit/PROJECT_AUDIT_2026-05-02.md) |
| 17 | [AUDIT_EXEC_BACKLOG_AL_2026-05.md](../audit/AUDIT_EXEC_BACKLOG_AL_2026-05.md) |
| 18 | [BACKLOG_POST_PILOTO.md](BACKLOG_POST_PILOTO.md) |
| 19 | [HISTORICO_FORA_DO_GIT.md](../HISTORICO_FORA_DO_GIT.md) |
| 20 | [pilot-commercial/README.md](../prompts/pilot-commercial/README.md) |

_Arquivado Lotes 1–4: Alpha Abril, inventários UI Maio, test book EN, handoff histórico — ver HISTORICO._
