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
| [TESTE_STRIPE_COMPLETO.md](TESTE_STRIPE_COMPLETO.md) | Fluxo Stripe end-to-end, troubleshooting |
| [BACKEND_STATUS.md](BACKEND_STATUS.md) | Estado técnico do backend — auth, trips, Stripe, endpoints |

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

## Documentos arquivados

| Localização | Conteúdo |
|-------------|----------|
| `archive_support/` | Runbooks e manuais desatualizados |
| `archive/` | Screenshots, PDFs, imagens de sessão |
