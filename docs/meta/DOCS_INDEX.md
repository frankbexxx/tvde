# Índice da Documentação — TVDE (CURRENT)

Índice de documentação **activa** — não inventário histórico. Regras: [`DOCUMENT_GOVERNANCE.md`](DOCUMENT_GOVERNANCE.md). Histórico fora do Git: [`HISTORICO_FORA_DO_GIT.md`](../HISTORICO_FORA_DO_GIT.md).

**Começar aqui:** [`README.md`](../../README.md) → [`TODOdoDIA.md`](../../TODOdoDIA.md) → [`ROADMAP_FINAL_ENTREGA_TVDE_2026.md`](../ROADMAP_FINAL_ENTREGA_TVDE_2026.md) → este índice.

---

## Fontes de verdade

| Papel | Ficheiro |
|-------|----------|
| **Estado actual (operacional diário)** | [`TODOdoDIA.md`](../../TODOdoDIA.md) |
| **Plano mestre** | [`ROADMAP_FINAL_ENTREGA_TVDE_2026.md`](../ROADMAP_FINAL_ENTREGA_TVDE_2026.md) |
| **Governance documental** | [`DOCUMENT_GOVERNANCE.md`](DOCUMENT_GOVERNANCE.md) |
| **Arquitectura (entry)** | [`architecture/README.md`](../architecture/README.md) |
| **Ambiente** | [`ENV_SINGLE_REALITY.md`](../env/ENV_SINGLE_REALITY.md) |
| **Decisões (índice)** | [`registers/DECISIONS.md`](../registers/DECISIONS.md) |
| **Findings (índice)** | [`registers/FINDINGS.md`](../registers/FINDINGS.md) |
| **Consultas externas (índice)** | [`registers/EXTERNAL_CONSULTATIONS.md`](../registers/EXTERNAL_CONSULTATIONS.md) |
| **Documentação externa (política)** | [`external/README.md`](../external/README.md) |

---

## Operação e checklist técnico

| Ficheiro | Propósito |
| -------- | --------- |
| [TODOdoDIA.md](../../TODOdoDIA.md) | Painel operacional (IDs / Estado) |
| [TODO_CODIGO_TVDE.md](../TODO_CODIGO_TVDE.md) | Checklist pré-produção |
| [PR_REVIEW_CHECKLIST.md](PR_REVIEW_CHECKLIST.md) | Revisão manual de PRs |
| [GITHUB_MANUAL_TVDE.md](../GITHUB_MANUAL_TVDE.md) | Git + GitHub TVDE |
| [TODO_FUTURO.md](../TODO_FUTURO.md) | Backlog não urgente |
| [todo-futuro-nuances.md](../todo-futuro-nuances.md) | Nuances futuras |
| [BACKLOG_POST_PILOTO.md](BACKLOG_POST_PILOTO.md) | Pós-piloto |

---

## Plano e negócio

| Ficheiro | Propósito |
| -------- | --------- |
| [ROADMAP_FINAL_ENTREGA_TVDE_2026.md](../ROADMAP_FINAL_ENTREGA_TVDE_2026.md) | Carril mestre A–H |
| [A1_MODELO_ECONOMICO_SETEMBRO_2026.md](../business/A1_MODELO_ECONOMICO_SETEMBRO_2026.md) | Modelo económico |
| [VAMULA_DECISOES_OPERACIONAIS_2026-09-09.md](../business/VAMULA_DECISOES_OPERACIONAIS_2026-09-09.md) | Decisões Manel |
| [TVDE_DECISOES_PENDENTES_M2_M3_2026-09-25.md](../business/TVDE_DECISOES_PENDENTES_M2_M3_2026-09-25.md) | Decisões M2/M3 |
| [TVDE_DECISOES_EXTERNAS_PENDENTES.md](../business/TVDE_DECISOES_EXTERNAS_PENDENTES.md) | Perguntas externas (working list) |

---

## Arquitectura, env, diagramas

| Ficheiro | Propósito |
| -------- | --------- |
| [architecture/README.md](../architecture/README.md) | Actual vs histórico |
| [USER_IDENTITIES.md](../architecture/USER_IDENTITIES.md) | Identidades login |
| [S-AUTH-01_OTP_SMS_DECISION.md](../architecture/S-AUTH-01_OTP_SMS_DECISION.md) | Decisão OTP/SMS |
| [TVDE_59_2026_TECHNICAL_FINDINGS.md](../architecture/TVDE_59_2026_TECHNICAL_FINDINGS.md) | Findings Lei 59/2026 |
| [I18N.md](../architecture/I18N.md) · [I18N_NICHOS_EN.md](../architecture/I18N_NICHOS_EN.md) | i18n |
| [ENV_SINGLE_REALITY.md](../env/ENV_SINGLE_REALITY.md) | Env local / CI / Render |
| [ENV_VARS_VERIFICATION.md](../env/ENV_VARS_VERIFICATION.md) | Cruzamento env |
| [diagrams/](../diagrams/) | Fluxos Mermaid |

---

## Legal / compliance

| Ficheiro | Propósito |
| -------- | --------- |
| [LEGAL_SOURCES_INDEX.md](../legal/LEGAL_SOURCES_INDEX.md) | Fontes primárias (PDF) |
| [TVDE_LEGAL_IMPACT_MATRIX_2026-09-04.md](../legal/TVDE_LEGAL_IMPACT_MATRIX_2026-09-04.md) | Matriz L-xx |
| [A3_REQUISITOS_TVDE_SETEMBRO_2026.md](../legal/A3_REQUISITOS_TVDE_SETEMBRO_2026.md) | Requisitos A3 |
| [VAMULA_VENTOS_FERTEIS_REGISTO_OFICIAL_2026.md](../legal/VAMULA_VENTOS_FERTEIS_REGISTO_OFICIAL_2026.md) | Registo entidade |
| [L25_LIVRO_RECLAMACOES_RAL_2026-09-07.md](../legal/L25_LIVRO_RECLAMACOES_RAL_2026-09-07.md) | L25 / RAL |
| [PARCEIRO_TVDE_CHECKLIST.md](../legal/PARCEIRO_TVDE_CHECKLIST.md) | Checklist parceiro |

---

## Runbooks e ops (CURRENT)

| Ficheiro | Propósito |
| -------- | --------- |
| [runbooks/PILOT_STRIPE_STAGING_CHECKLIST.md](../runbooks/PILOT_STRIPE_STAGING_CHECKLIST.md) | Piloto Stripe staging |
| [runbooks/PILOT_PAYMENT_RECONCILIATION.md](../runbooks/PILOT_PAYMENT_RECONCILIATION.md) | Reconciliação |
| [runbooks/PILOT_STRIPE_REFUND.md](../runbooks/PILOT_STRIPE_REFUND.md) | Refund manual |
| [O_STRIPE_1_RUNBOOK.md](../ops/O_STRIPE_1_RUNBOOK.md) | Stripe local test mode |
| [W1_PROD_SMOKE.md](../ops/W1_PROD_SMOKE.md) | Smoke W1 |
| [W2_RUNBOOK.md](../ops/W2_RUNBOOK.md) | Onda W2 |
| [STAGING_A2-02_RUNBOOK.md](../ops/STAGING_A2-02_RUNBOOK.md) | OAuth staging |
| [TVDE_BKP_RUNBOOK.md](../ops/TVDE_BKP_RUNBOOK.md) | Backup Postgres |
| [DEMO_4_PAPEIS.md](../ops/DEMO_4_PAPEIS.md) | Demo 4 papéis |
| [PF3D_VEHICLE_DOCUMENT_COMPLIANCE.md](../ops/PF3D_VEHICLE_DOCUMENT_COMPLIANCE.md) | Gates docs viatura |
| [CRON_JOB_ORG_INSTRUCOES.md](../CRON_JOB_ORG_INSTRUCOES.md) | Cron externo |
| [INTERACTION_LOGGING.md](../ops/INTERACTION_LOGGING.md) | Telemetria |

---

## Produto e UX

| Ficheiro | Propósito |
| -------- | --------- |
| [DRIVER_MENU_SPEC.md](../product/DRIVER_MENU_SPEC.md) | Menu motorista |
| [DRIVER_HOME_TOP3_MANEL.md](../product/DRIVER_HOME_TOP3_MANEL.md) | Home motorista |
| [PORTAGENS_SPEC.md](../product/PORTAGENS_SPEC.md) | Portagens |
| [navigation-inventory.md](../ux/navigation-inventory.md) | Navegação 4 apps |
| [driver-ux-fixes-backlog.md](../ux/driver-ux-fixes-backlog.md) | Backlog UX driver |

---

## Testes e deploy

| Ficheiro | Propósito |
| -------- | --------- |
| [BACKEND_PYTEST_SAFE.md](../testing/BACKEND_PYTEST_SAFE.md) | Pytest BD local |
| [GUIA_TESTES.md](../testing/GUIA_TESTES.md) | Manual testes |
| [TESTE_STRIPE_COMPLETO.md](../testing/TESTE_STRIPE_COMPLETO.md) | Stripe E2E |
| [PREPARACAO_RENDER.md](../deploy/PREPARACAO_RENDER.md) | Deploy Render |
| [DEBUG_BETA_RENDER.md](../DEBUG_BETA_RENDER.md) | Debug BETA |

---

## Prompts (agentes — não canónico produto)

| Ficheiro | Propósito |
| -------- | --------- |
| [A000_SYSTEM_RULES.md](../prompts/A000_SYSTEM_RULES.md) | Regras agentes |
| [A033_B_VALIDATION_HARDENING_PLAYBOOK.md](../prompts/A033_B_VALIDATION_HARDENING_PLAYBOOK.md) | Validação PROD |
| [PROMPT_I18N_INDEX.md](../prompts/i18n-v2/PROMPT_I18N_INDEX.md) | i18n v2 |

---

## Meta

| Ficheiro | Propósito |
| -------- | --------- |
| [PROJECT.md](PROJECT.md) | Visão produto + dados |
| [DOCUMENT_GOVERNANCE.md](DOCUMENT_GOVERNANCE.md) | Governance |

---

## Arquivo (`docs/archive/`)

Histórico válido **fora** da documentação CURRENT. Ver [`../archive/README.md`](../archive/README.md).

| Pasta | Conteúdo (Fase 2A) |
| ----- | ------------------- |
| [`archive/ops/`](../archive/ops/) | Smokes PASS, checkpoints, demos/milestones fechados |
| [`archive/plans/`](../archive/plans/) | MODO FÉRIAS, retoma Set, roadmap pós-demo Jul |
| [`archive/audits/`](../archive/audits/) | Auditorias Mai/Set, portagens/HERE, relatório Jul |
| [`archive/prompts/`](../archive/prompts/) | Piloto comercial (prompts agente) |
| [`archive/ux/`](../archive/ux/) | Auditorias navegação Jul 2026 |
| [`archive/reference/`](../archive/reference/) | Benchmark veículos Lisboa (MD) |
| [`archive/plans/`](../archive/plans/) | FORWARD Jul · STATUS Set · PROXIMA_SESSAO · ENGINEERING · biblioteca Set |
| [`archive/audits/P1_RUNTIME…`](../archive/audits/P1_RUNTIME_SECURITY_REVIEW_2026-09.md) | Segurança runtime Set 2026 (fechado) |

## Histórico no path antigo / LEGACY (banner)

| Ficheiro | Nota |
| -------- | ---- |
| [STRIPE_LIVE_READINESS_2026-10-08.md](../architecture/STRIPE_LIVE_READINESS_2026-10-08.md) | **AUDIT** snapshot (GOV-DOC-006) |
| [visao_cursor.md](../visao_cursor.md) · [PRICING_DECISION.md](../PRICING_DECISION.md) | **LEGACY** |
| [docs/audits/ux/2026-10/](../audits/ux/2026-10/) | **REVIEW** — auditoria UX Out (execução aberta) |

---

## Lista numerada (referência rápida — CURRENT)

| # | Ficheiro |
|---|----------|
| 1 | [README.md](../../README.md) |
| 2 | [TODOdoDIA.md](../../TODOdoDIA.md) |
| 3 | [ROADMAP_FINAL_ENTREGA_TVDE_2026.md](../ROADMAP_FINAL_ENTREGA_TVDE_2026.md) |
| 4 | [DOCUMENT_GOVERNANCE.md](DOCUMENT_GOVERNANCE.md) |
| 5 | [DOCS_INDEX.md](DOCS_INDEX.md) |
| 6 | [registers/DECISIONS.md](../registers/DECISIONS.md) |
| 7 | [architecture/README.md](../architecture/README.md) |
| 8 | [ENV_SINGLE_REALITY.md](../env/ENV_SINGLE_REALITY.md) |
| 9 | [GUIA_TESTES.md](../testing/GUIA_TESTES.md) |
| 10 | [LEGAL_SOURCES_INDEX.md](../legal/LEGAL_SOURCES_INDEX.md) |
