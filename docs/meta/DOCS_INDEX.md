# Índice da Documentação — TVDE

Referência de todos os ficheiros de documentação do projeto.

---

## Espinha dorsal (canónico)

Ordem sugerida para não te perderes: **README** → **PROJECT** → **GitHub manual** → **PROXIMA_SESSAO** → este índice para o resto. Implementação técnica e testes: **[IMPLEMENTACAO_E_TESTES.md](../IMPLEMENTACAO_E_TESTES.md)**. Documentação histórica que **já não está no clone**: **[HISTORICO_FORA_DO_GIT.md](../HISTORICO_FORA_DO_GIT.md)**.

---

## Inventário e próximo arquivo

| Ficheiro                                                                          | Propósito                                                                                                                                                                                    |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [DOCUMENTATION_INVENTORY_2026-03-27.md](../DOCUMENTATION_INVENTORY_2026-03-27.md) | O que o Git rastreia (`.md` + imagens): **manter / fundir / arquivar** — fusões principais feitas; próximo passo opcional: cópia para `C:\dev\_archives\APP\` + `git rm` do que sair do repo |

---

## Documentos principais

| Ficheiro                                                                                     | Propósito                                                                                                                                                             |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [README.md](../../README.md)                                                                 | Entrada do projeto — estrutura, início rápido                                                                                                                         |
| [PROJECT.md](PROJECT.md)                                                                     | Visão geral, stack, modelo de dados, fluxo de viagem e pagamento                                                                                                      |
| [docs/architecture/TVDE_ENGINEERING_ROADMAP.md](../architecture/TVDE_ENGINEERING_ROADMAP.md) | Roadmap técnico (fases 1–6) + **anexo A023–A035** com colunas Estado/Evidência + **checklist entrega app**; **estado atual 2026-03-28** (Alembic, CI, gaps A028/A034) |
| [PROXIMA_SESSAO.md](PROXIMA_SESSAO.md)                                                       | Handoff — estado, roadmap resumido; **Seção F** operação (ex-checklist); **Seção G** relatório projeto                                                                |
| [docs/visao_cursor.md](../visao_cursor.md)                                                   | Visão geral do projeto (perspectiva Cursor), ideias e checklist de comercialização                                                                                    |

---

## Deploy e operação

| Ficheiro                                                          | Propósito                                                                     |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [PREPARACAO_RENDER.md](../deploy/PREPARACAO_RENDER.md)            | Deploy no Render — PostgreSQL, backend, Stripe webhook, frontend              |
| [VALIDACAO_HUMANA_CAMPO.md](../testing/VALIDACAO_HUMANA_CAMPO.md) | Teste humano em campo — preparação, cenários, observação                      |
| [docs/DEBUG_BETA_RENDER.md](../DEBUG_BETA_RENDER.md)              | Depuração modo BETA no Render                                                 |
| [docs/TODO_CODIGO_TVDE.md](../TODO_CODIGO_TVDE.md)                | TODO código top-down — validação PROD, staging, backups, migrações, hardening |

---

## Legal e parceiro (operacional)

| Ficheiro                                                                     | Propósito                                                                                                                                        |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| [docs/legal/PARCEIRO_TVDE_CHECKLIST.md](../legal/PARCEIRO_TVDE_CHECKLIST.md) | Inventário **não jurídico**: perguntas e papelada para alinhar com o **titular TVDE**; liga a onboarding técnico e a `visao_cursor` (compliance) |

---

## Testes e guias

| Ficheiro                                                        | Propósito                                       |
| --------------------------------------------------------------- | ----------------------------------------------- |
| [GUIA_TESTES.md](../testing/GUIA_TESTES.md)                     | Manual de testes passo a passo (local e Render) |
| [TESTE_STRIPE_COMPLETO.md](../testing/TESTE_STRIPE_COMPLETO.md) | Fluxo Stripe end-to-end, troubleshooting        |

---

## Git e GitHub

| Ficheiro                                               | Propósito                                                                                                            |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| [docs/GITHUB_MANUAL_TVDE.md](../GITHUB_MANUAL_TVDE.md) | Manual ordenado: antes de começar, sessão de trabalho, branch, PR, merge, limpeza — com links para `frankbexxx/tvde` |

---

## Observabilidade

| Ficheiro                                                                                                   | Propósito                                                                         |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [INTERACTION_LOGGING.md](../ops/INTERACTION_LOGGING.md)                                                    | Telemetria comportamental — export de logs (request_trip, accept, complete, etc.) |
| [docs/TVDE_BACKEND_PROXIMOS_PASSOS_OBSERVABILIDADE.md](../TVDE_BACKEND_PROXIMOS_PASSOS_OBSERVABILIDADE.md) | Backend: observabilidade, reconciliação via cron, roadmap escala                  |

---

## Arquitetura e prompts

| Ficheiro                                                                                                   | Propósito                                                                                              |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| [docs/README.md](../README.md)                                                                             | Mapa da pasta `docs/` (ativo vs arquivo)                                                               |
| [docs/architecture/TVDE_SYSTEM_BLUEPRINT.md](../architecture/TVDE_SYSTEM_BLUEPRINT.md)                     | Blueprint do sistema — objetivos, camadas, trip lifecycle                                              |
| [docs/architecture/ARCHITECTURE_STATUS.md](../architecture/ARCHITECTURE_STATUS.md)                         | Estado técnico atual — backend, frontend, pipelines                                                    |
| [docs/prompts/A000_SYSTEM_RULES.md](../prompts/A000_SYSTEM_RULES.md)                                       | Regras do projeto para agentes / implementação                                                         |
| [docs/prompts/A014_UX_POLISH.md](../prompts/A014_UX_POLISH.md)                                             | Polish UX (em curso)                                                                                   |
| [docs/prompts/A033_B_VALIDATION_HARDENING_PLAYBOOK.md](../prompts/A033_B_VALIDATION_HARDENING_PLAYBOOK.md) | A033-B — validação produção (env, webhook, cron, e2e, migrações, backup)                               |
| [docs/prompts/UX_MINI_ROADMAP_E_PROMPTS.md](../prompts/UX_MINI_ROADMAP_E_PROMPTS.md)                       | **UX web-app (3–5 dias):** princípios, mini-roadmap, formato de prompts, **Prompt 1** estados visíveis |

---

## Diagramas (Mermaid)

| Ficheiro                                           | Propósito                                                                                        |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [docs/diagrams/README.md](../diagrams/README.md) | **Índice** — mapa do sistema + links para fluxos (viagem, ofertas, pagamentos, WS, cron, papéis) |
| [docs/diagrams/07_AUTH_OTP.md](../diagrams/07_AUTH_OTP.md) | OTP + login BETA (Mermaid)                                                                     |

---

## Referência técnica

| Ficheiro                                                               | Propósito                        |
| ---------------------------------------------------------------------- | -------------------------------- |
| [docs/STACK_TECNOLOGICO.md](../STACK_TECNOLOGICO.md)                   | Stack e convenções técnicas      |
| [docs/ESTRUTURA_GUI.md](../ESTRUTURA_GUI.md)                           | Estrutura da GUI (web e Android) |
| [backend/DATABASE_SCHEMA_RAW.md](../../backend/DATABASE_SCHEMA_RAW.md) | Schema da base de dados          |
| [web-app/README.md](../../web-app/README.md)                           | Web app — visão geral            |

---

## Fluxo recomendado para novos devs

1. **README.md** — visão geral e estrutura
2. **docs/GITHUB_MANUAL_TVDE.md** — clone, `main`, branches, PRs e limpeza (ordem obrigatória)
3. **PROJECT.md** — produto e modelo
4. **PREPARACAO_RENDER.md** — deploy (ou **GUIA_TESTES.md** para local)
5. **PROXIMA_SESSAO.md** — estado atual e próximos passos

---

## Lista de documentos ativos

| #   | Ficheiro                                                                                                   | Propósito                                                                     |
| --- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 1   | [README.md](../../README.md)                                                                               | Entrada do projeto                                                            |
| 2   | [PROJECT.md](PROJECT.md)                                                                                   | Visão geral, stack, modelo                                                    |
| 3   | [docs/architecture/TVDE_ENGINEERING_ROADMAP.md](../architecture/TVDE_ENGINEERING_ROADMAP.md)               | Roadmap técnico + entrega app (atualizado 2026-03-28)                         |
| 4   | [PROXIMA_SESSAO.md](PROXIMA_SESSAO.md)                                                                     | Handoff e contexto                                                            |
| 5   | [DOCS_INDEX.md](DOCS_INDEX.md)                                                                             | Este índice                                                                   |
| 6   | [PREPARACAO_RENDER.md](../deploy/PREPARACAO_RENDER.md)                                                     | Deploy no Render                                                              |
| 7   | [GUIA_TESTES.md](../testing/GUIA_TESTES.md)                                                                | Manual de testes                                                              |
| 8   | [VALIDACAO_HUMANA_CAMPO.md](../testing/VALIDACAO_HUMANA_CAMPO.md)                                          | Teste em campo                                                                |
| 9   | [TESTE_STRIPE_COMPLETO.md](../testing/TESTE_STRIPE_COMPLETO.md)                                            | Fluxo Stripe                                                                  |
| 10  | [INTERACTION_LOGGING.md](../ops/INTERACTION_LOGGING.md)                                                    | Logs e telemetria                                                             |
| 11  | [docs/DEBUG_BETA_RENDER.md](../DEBUG_BETA_RENDER.md)                                                       | Depuração BETA                                                                |
| 12  | [docs/README.md](../README.md)                                                                             | Mapa da documentação ativa em `docs/`                                         |
| 13  | [docs/STACK_TECNOLOGICO.md](../STACK_TECNOLOGICO.md)                                                       | Stack técnico                                                                 |
| 14  | [docs/ESTRUTURA_GUI.md](../ESTRUTURA_GUI.md)                                                               | Estrutura da GUI                                                              |
| 15  | [docs/IMPLEMENTACAO_E_TESTES.md](../IMPLEMENTACAO_E_TESTES.md)                                             | Implementação, testes e logs (Parte II = ex-LOGS_E_TESTES)                    |
| 16  | [docs/LOGS_E_TESTES_SINTESE.md](../LOGS_E_TESTES_SINTESE.md)                                               | Redireciona para IMPLEMENTACAO_E_TESTES (Parte II)                            |
| 17  | [backend/DATABASE_SCHEMA_RAW.md](../../backend/DATABASE_SCHEMA_RAW.md)                                     | Schema da BD                                                                  |
| 18  | [web-app/README.md](../../web-app/README.md)                                                               | Web app                                                                       |
| 19  | [scripts/README.md](../../scripts/README.md)                                                               | Scripts do projeto                                                            |
| 20  | [docs/visao_cursor.md](../visao_cursor.md)                                                                 | Visão Cursor + checklist comercialização                                      |
| 21  | [docs/TODO_CODIGO_TVDE.md](../TODO_CODIGO_TVDE.md)                                                         | TODO código pré-produção (árvore ajustada)                                    |
| 22  | [docs/prompts/A033_B_VALIDATION_HARDENING_PLAYBOOK.md](../prompts/A033_B_VALIDATION_HARDENING_PLAYBOOK.md) | Playbook validação PROD (A033-B)                                              |
| 23  | [docs/TVDE_BACKEND_PROXIMOS_PASSOS_OBSERVABILIDADE.md](../TVDE_BACKEND_PROXIMOS_PASSOS_OBSERVABILIDADE.md) | Backend: observabilidade e reconciliação                                      |
| 24  | [docs/GITHUB_MANUAL_TVDE.md](../GITHUB_MANUAL_TVDE.md)                                                     | Git + GitHub — fluxo TVDE (antes / durante / depois)                          |
| 25  | [docs/DOCUMENTATION_INVENTORY_2026-03-27.md](../DOCUMENTATION_INVENTORY_2026-03-27.md)                     | Inventário docs/media tracked — plano manter/fundir/arquivar                  |
| 26  | [docs/HISTORICO_FORA_DO_GIT.md](../HISTORICO_FORA_DO_GIT.md)                                               | O que saiu do Git + cópia local de arquivo                                    |
| 27  | [docs/prompts/UX_MINI_ROADMAP_E_PROMPTS.md](../prompts/UX_MINI_ROADMAP_E_PROMPTS.md)                       | UX web-app: mini roadmap 3–5 d + Prompt 1 (estados visíveis)                  |
| 28  | [docs/legal/PARCEIRO_TVDE_CHECKLIST.md](../legal/PARCEIRO_TVDE_CHECKLIST.md)                               | Checklist operacional parceiro / licença TVDE (não é aconselhamento jurídico) |
| 29  | [docs/diagrams/README.md](../diagrams/README.md)                                                           | Índice Mermaid — fluxos TVDE (viagem, ofertas, pagamentos, …)                 |
| 30  | [docs/diagrams/07_AUTH_OTP.md](../diagrams/07_AUTH_OTP.md)                                               | Mermaid — OTP / login BETA / parceiro só via admin                            |

---

## Documentos arquivados (fora do Git)

A pasta `archive/` e `archive_support/` **deixaram de fazer parte do repositório** (clone mais leve). Cópia de segurança e lista de ficheiros: **[docs/HISTORICO_FORA_DO_GIT.md](../HISTORICO_FORA_DO_GIT.md)**.

Histórico ainda acessível com `git show <commit>:archive/...` para commits **anteriores** à remoção.
