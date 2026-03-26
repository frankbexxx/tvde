# Índice da Documentação — TVDE

Referência de todos os ficheiros de documentação do projeto.

---

## Documentos principais

| Ficheiro | Propósito |
|----------|-----------|
| [README.md](README.md) | Entrada do projeto — estrutura, início rápido |
| [PROJECT.md](PROJECT.md) | Visão geral, stack, modelo de dados, fluxo de viagem e pagamento |
| [docs/architecture/TVDE_ENGINEERING_ROADMAP.md](docs/architecture/TVDE_ENGINEERING_ROADMAP.md) | Roadmap técnico — fases de estabilização, simulação, geo matching, etc. |
| [PROXIMA_SESSAO.md](PROXIMA_SESSAO.md) | Handoff entre sessões — estado atual, próximas ações |
| [docs/visao_cursor.md](docs/visao_cursor.md) | Visão geral do projeto (perspectiva Cursor), ideias e checklist de comercialização |

---

## Deploy e operação

| Ficheiro | Propósito |
|----------|-----------|
| [PREPARACAO_RENDER.md](PREPARACAO_RENDER.md) | Deploy no Render — PostgreSQL, backend, Stripe webhook, frontend |
| [VALIDACAO_HUMANA_CAMPO.md](VALIDACAO_HUMANA_CAMPO.md) | Teste humano em campo — preparação, cenários, observação |
| [docs/DEBUG_BETA_RENDER.md](docs/DEBUG_BETA_RENDER.md) | Depuração modo BETA no Render |
| [docs/TODO_CODIGO_TVDE.md](docs/TODO_CODIGO_TVDE.md) | TODO código top-down — validação PROD, staging, backups, migrações, hardening |

---

## Testes e guias

| Ficheiro | Propósito |
|----------|-----------|
| [GUIA_TESTES.md](GUIA_TESTES.md) | Manual de testes passo a passo (local e Render) |
| [TESTE_STRIPE_COMPLETO.md](TESTE_STRIPE_COMPLETO.md) | Fluxo Stripe end-to-end, troubleshooting |

---

## Observabilidade

| Ficheiro | Propósito |
|----------|-----------|
| [INTERACTION_LOGGING.md](INTERACTION_LOGGING.md) | Telemetria comportamental — export de logs (request_trip, accept, complete, etc.) |

---

## Arquitetura e prompts

| Ficheiro | Propósito |
|----------|-----------|
| [docs/README.md](docs/README.md) | Mapa da pasta `docs/` (ativo vs arquivo) |
| [docs/architecture/TVDE_SYSTEM_BLUEPRINT.md](docs/architecture/TVDE_SYSTEM_BLUEPRINT.md) | Blueprint do sistema — objetivos, camadas, trip lifecycle |
| [docs/architecture/ARCHITECTURE_STATUS.md](docs/architecture/ARCHITECTURE_STATUS.md) | Estado técnico atual — backend, frontend, pipelines |
| [docs/prompts/A000_SYSTEM_RULES.md](docs/prompts/A000_SYSTEM_RULES.md) | Regras do projeto para agentes / implementação |
| [docs/prompts/A014_UX_POLISH.md](docs/prompts/A014_UX_POLISH.md) | Polish UX (em curso) |
| [docs/prompts/A033_B_VALIDATION_HARDENING_PLAYBOOK.md](docs/prompts/A033_B_VALIDATION_HARDENING_PLAYBOOK.md) | A033-B — validação produção (env, webhook, cron, e2e, migrações, backup) |
| [archive/docs_maint_2026_02_23/](archive/docs_maint_2026_02_23/README.md) | Prompts já implementadas, imagens e notas arquivadas (sem apagar) |

---

## Referência técnica

| Ficheiro | Propósito |
|----------|-----------|
| [docs/STACK_TECNOLOGICO.md](docs/STACK_TECNOLOGICO.md) | Stack e convenções técnicas |
| [docs/ESTRUTURA_GUI.md](docs/ESTRUTURA_GUI.md) | Estrutura da GUI (web e Android) |
| [backend/DATABASE_SCHEMA_RAW.md](backend/DATABASE_SCHEMA_RAW.md) | Schema da base de dados |
| [web-app/README.md](web-app/README.md) | Web app — visão geral |

---

## Fluxo recomendado para novos devs

1. **README.md** — visão geral e estrutura
2. **PROJECT.md** — produto e modelo
3. **PREPARACAO_RENDER.md** — deploy (ou **GUIA_TESTES.md** para local)
4. **PROXIMA_SESSAO.md** — estado atual e próximos passos

---

## Lista de documentos ativos

| # | Ficheiro | Propósito |
|---|----------|-----------|
| 1 | [README.md](README.md) | Entrada do projeto |
| 2 | [PROJECT.md](PROJECT.md) | Visão geral, stack, modelo |
| 3 | [docs/architecture/TVDE_ENGINEERING_ROADMAP.md](docs/architecture/TVDE_ENGINEERING_ROADMAP.md) | Roadmap técnico |
| 4 | [PROXIMA_SESSAO.md](PROXIMA_SESSAO.md) | Handoff e contexto |
| 5 | [DOCS_INDEX.md](DOCS_INDEX.md) | Este índice |
| 6 | [PREPARACAO_RENDER.md](PREPARACAO_RENDER.md) | Deploy no Render |
| 7 | [GUIA_TESTES.md](GUIA_TESTES.md) | Manual de testes |
| 8 | [VALIDACAO_HUMANA_CAMPO.md](VALIDACAO_HUMANA_CAMPO.md) | Teste em campo |
| 9 | [TESTE_STRIPE_COMPLETO.md](TESTE_STRIPE_COMPLETO.md) | Fluxo Stripe |
| 10 | [INTERACTION_LOGGING.md](INTERACTION_LOGGING.md) | Logs e telemetria |
| 11 | [docs/DEBUG_BETA_RENDER.md](docs/DEBUG_BETA_RENDER.md) | Depuração BETA |
| 12 | [docs/README.md](docs/README.md) | Mapa da documentação ativa em `docs/` |
| 13 | [docs/STACK_TECNOLOGICO.md](docs/STACK_TECNOLOGICO.md) | Stack técnico |
| 14 | [docs/ESTRUTURA_GUI.md](docs/ESTRUTURA_GUI.md) | Estrutura da GUI |
| 15 | [docs/IMPLEMENTACAO_E_TESTES.md](docs/IMPLEMENTACAO_E_TESTES.md) | Implementação e testes |
| 16 | [docs/LOGS_E_TESTES_SINTESE.md](docs/LOGS_E_TESTES_SINTESE.md) | Logs e testes (síntese) |
| 17 | [backend/DATABASE_SCHEMA_RAW.md](backend/DATABASE_SCHEMA_RAW.md) | Schema da BD |
| 18 | [web-app/README.md](web-app/README.md) | Web app |
| 19 | [scripts/README.md](scripts/README.md) | Scripts do projeto |
| 20 | [docs/visao_cursor.md](docs/visao_cursor.md) | Visão Cursor + checklist comercialização |
| 21 | [docs/TODO_CODIGO_TVDE.md](docs/TODO_CODIGO_TVDE.md) | TODO código pré-produção (árvore ajustada) |
| 22 | [docs/prompts/A033_B_VALIDATION_HARDENING_PLAYBOOK.md](docs/prompts/A033_B_VALIDATION_HARDENING_PLAYBOOK.md) | Playbook validação PROD (A033-B) |

---

## Documentos arquivados

| Localização | Conteúdo |
|-------------|----------|
| `archive/docs_nao_essenciais/` | Docs movidos em 2026-03-08 (guias alternativos, relatórios, design system antigo, etc.) — ver README nessa pasta |
| `archive/docs_2026_03_22/` | Docs movidos em 2026-03-22 (arquitetura duplicada, regressão, visão produto, logs simulator) — ver README nessa pasta |
| `archive/docs_2026_03_26/` | Worktree, relatórios A021/lint, auditorias visuais snapshot — ver README nessa pasta |
| `archive/docs_maint_2026_02_23/` | Manutenção 2026-02: prompts implementadas (A001–A013, B*, …), `docs/vision/`, imagens, análises pontuais — ver README nessa pasta |
| `archive_support/` | Runbooks e manuais desatualizados |
| `archive/` (resto) | Screenshots, PDFs, imagens de sessão |
