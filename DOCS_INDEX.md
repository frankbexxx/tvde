# Índice da Documentação — TVDE

Referência de todos os ficheiros de documentação do projeto.

---

## Documentos principais

| Ficheiro | Propósito |
|----------|-----------|
| [README.md](README.md) | Entrada do projeto — estrutura, início rápido |
| [PROJECT.md](PROJECT.md) | Visão geral, stack, modelo de dados, fluxo de viagem e pagamento |
| [ROADMAP.md](ROADMAP.md) | Etapas de implementação, princípios, restrições técnicas |
| [PROXIMA_SESSAO.md](PROXIMA_SESSAO.md) | Handoff entre sessões — estado atual, próximas ações |

---

## Deploy e operação

| Ficheiro | Propósito |
|----------|-----------|
| [PREPARACAO_RENDER.md](PREPARACAO_RENDER.md) | Deploy no Render — PostgreSQL, backend, Stripe webhook, frontend |
| [VALIDACAO_HUMANA_CAMPO.md](VALIDACAO_HUMANA_CAMPO.md) | Teste humano em campo — preparação, cenários, observação |
| [docs/DEBUG_BETA_RENDER.md](docs/DEBUG_BETA_RENDER.md) | Depuração modo BETA no Render |

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
| 3 | [ROADMAP.md](ROADMAP.md) | Etapas e princípios |
| 4 | [PROXIMA_SESSAO.md](PROXIMA_SESSAO.md) | Handoff e contexto |
| 5 | [DOCS_INDEX.md](DOCS_INDEX.md) | Este índice |
| 6 | [PREPARACAO_RENDER.md](PREPARACAO_RENDER.md) | Deploy no Render |
| 7 | [GUIA_TESTES.md](GUIA_TESTES.md) | Manual de testes |
| 8 | [VALIDACAO_HUMANA_CAMPO.md](VALIDACAO_HUMANA_CAMPO.md) | Teste em campo |
| 9 | [TESTE_STRIPE_COMPLETO.md](TESTE_STRIPE_COMPLETO.md) | Fluxo Stripe |
| 10 | [INTERACTION_LOGGING.md](INTERACTION_LOGGING.md) | Logs e telemetria |
| 11 | [docs/DEBUG_BETA_RENDER.md](docs/DEBUG_BETA_RENDER.md) | Depuração BETA |
| 12 | [docs/STACK_TECNOLOGICO.md](docs/STACK_TECNOLOGICO.md) | Stack técnico |
| 13 | [docs/ESTRUTURA_GUI.md](docs/ESTRUTURA_GUI.md) | Estrutura da GUI |
| 14 | [backend/DATABASE_SCHEMA_RAW.md](backend/DATABASE_SCHEMA_RAW.md) | Schema da BD |
| 15 | [web-app/README.md](web-app/README.md) | Web app |

---

## Documentos arquivados

| Localização | Conteúdo |
|-------------|----------|
| `archive/docs_nao_essenciais/` | Docs movidos em 2026-03-08 (guias alternativos, relatórios, design system antigo, etc.) — ver README nessa pasta |
| `archive_support/` | Runbooks e manuais desatualizados |
| `archive/` (resto) | Screenshots, PDFs, imagens de sessão |
