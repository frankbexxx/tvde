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
| [CRIAR_REPO_GITHUB.md](CRIAR_REPO_GITHUB.md) | Criação do repositório GitHub e acesso de parceiros |

---

## Testes e guias

| Ficheiro | Propósito |
|----------|-----------|
| [GUIA_TESTES.md](GUIA_TESTES.md) | Manual de testes passo a passo (local e Render) |
| [GUIA_TESTE_COMPLETO_COMPANHEIRO.md](GUIA_TESTE_COMPLETO_COMPANHEIRO.md) | Guia simples para não-técnicos (passageiro + motorista) |
| [TESTES_RENDER_TIMING.md](TESTES_RENDER_TIMING.md) | Testes cold start, dormancy, fricção de rede, Stripe — resultados 04/03 |
| [TESTE_STRIPE_COMPLETO.md](TESTE_STRIPE_COMPLETO.md) | Fluxo Stripe end-to-end, troubleshooting |
| [BACKEND_STATUS.md](BACKEND_STATUS.md) | Estado técnico do backend — auth, trips, Stripe, endpoints |

---

## Observabilidade

| Ficheiro | Propósito |
|----------|-----------|
| [INTERACTION_LOGGING.md](INTERACTION_LOGGING.md) | Telemetria comportamental — export de logs (request_trip, accept, complete, etc.) |

---

## Referência técnica

| Ficheiro | Propósito |
|----------|-----------|
| [CIRCUITOS_APP.md](CIRCUITOS_APP.md) | Diagramas — arquitetura, state machine, fluxos |
| [ETAPA_OPERACIONAL_FLUXO.md](ETAPA_OPERACIONAL_FLUXO.md) | Timeouts, disponibilidade, dispatch — especificação |
| [STRIPE_CONFIRMACAO_FUTURA.md](STRIPE_CONFIRMACAO_FUTURA.md) | Estratégias de confirmação de pagamento (futuro) |
| [backend/DATABASE_SCHEMA_RAW.md](backend/DATABASE_SCHEMA_RAW.md) | Schema da base de dados |

---

## Outros

| Ficheiro | Propósito |
|----------|-----------|
| [TEMPLATE.md](TEMPLATE.md) | Template para novos documentos |
| [RESUMO_TECNICO_PROJETO.md](RESUMO_TECNICO_PROJETO.md) | Resumo técnico consolidado |

---

## Fluxo recomendado para novos devs

1. **README.md** — visão geral e estrutura
2. **PROJECT.md** — produto e modelo
3. **PREPARACAO_RENDER.md** — deploy (ou **GUIA_TESTES.md** para local)
4. **PROXIMA_SESSAO.md** — estado atual e próximos passos

---

## Lista completa de .md (para partilha)

| # | Ficheiro | Propósito |
|---|----------|-----------|
| 1 | [README.md](README.md) | Entrada do projeto |
| 2 | [PROJECT.md](PROJECT.md) | Visão geral, stack, modelo |
| 3 | [ROADMAP.md](ROADMAP.md) | Etapas e princípios |
| 4 | [PROXIMA_SESSAO.md](PROXIMA_SESSAO.md) | Handoff e contexto |
| 5 | [DOCS_INDEX.md](DOCS_INDEX.md) | Este índice |
| 6 | [PREPARACAO_RENDER.md](PREPARACAO_RENDER.md) | Deploy no Render |
| 7 | [GUIA_TESTES.md](GUIA_TESTES.md) | Manual de testes |
| 8 | [TESTES_RENDER_TIMING.md](TESTES_RENDER_TIMING.md) | Testes Render (resultados) |
| 9 | [VALIDACAO_HUMANA_CAMPO.md](VALIDACAO_HUMANA_CAMPO.md) | Teste em campo |
| 10 | [TESTE_STRIPE_COMPLETO.md](TESTE_STRIPE_COMPLETO.md) | Fluxo Stripe |
| 11 | [INTERACTION_LOGGING.md](INTERACTION_LOGGING.md) | Logs e telemetria |
| 12 | [CIRCUITOS_APP.md](CIRCUITOS_APP.md) | Diagramas |
| 13 | [ETAPA_OPERACIONAL_FLUXO.md](ETAPA_OPERACIONAL_FLUXO.md) | Timeouts e dispatch |
| 14 | [STRIPE_CONFIRMACAO_FUTURA.md](STRIPE_CONFIRMACAO_FUTURA.md) | Confirmação de preço |
| 15 | [BACKEND_STATUS.md](BACKEND_STATUS.md) | Estado do backend |
| 16 | [CRIAR_REPO_GITHUB.md](CRIAR_REPO_GITHUB.md) | Repo e acesso |
| 17 | [RESUMO_TECNICO_PROJETO.md](RESUMO_TECNICO_PROJETO.md) | Resumo técnico |
| 18 | [TEMPLATE.md](TEMPLATE.md) | Template para novos docs |
| 19 | [backend/DATABASE_SCHEMA_RAW.md](backend/DATABASE_SCHEMA_RAW.md) | Schema da BD |
| 20 | [web-app/README.md](web-app/README.md) | Web app |
| 21 | [web-app/TESTES_OPERACIONAIS.md](web-app/TESTES_OPERACIONAIS.md) | Testes operacionais |
| 22 | [web-app/PAINEL_ATIVIDADE.md](web-app/PAINEL_ATIVIDADE.md) | Painel de atividade |
| 23 | [web-app/ESTRUTURA_COMPONENTES.md](web-app/ESTRUTURA_COMPONENTES.md) | Estrutura de componentes |

*Nota: `archive_support/` e `archive/` contêm docs arquivados.*

---

## Documentos arquivados

| Localização | Conteúdo |
|-------------|----------|
| `archive_support/` | Runbooks e manuais desatualizados |
| `archive/` | Screenshots, PDFs, imagens de sessão |
