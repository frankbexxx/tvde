# Índice da Documentação — Ride Sharing Backend

Este documento referencia todos os ficheiros de documentação do projeto e o seu propósito.

---

## Documentos principais

| Ficheiro | Propósito |
|----------|-----------|
| [PROJECT.md](PROJECT.md) | Visão geral, stack, modelo de dados, fluxo de viagem e pagamento, princípios orientadores |
| [ROADMAP.md](ROADMAP.md) | Etapas de implementação (1–6), decisões entre etapas, próximos passos |
| [BACKEND_STATUS.md](BACKEND_STATUS.md) | Estado técnico atual: auth, trips, Stripe, eventos, config, o que está pronto vs. por implementar |
| [TESTE_STRIPE_COMPLETO.md](TESTE_STRIPE_COMPLETO.md) | **Guia completo de testes** — fluxo Stripe end-to-end, OTP, assign, accept, arriving, start, complete, webhook, troubleshooting |
| [SESSAO_PROXIMA.md](SESSAO_PROXIMA.md) | Handoff entre sessões — onde paramos, próximas ações, ficheiros chave |
| [backend/DATABASE_SCHEMA_RAW.md](backend/DATABASE_SCHEMA_RAW.md) | Schema da base de dados (reflete modelos SQLAlchemy) |

---

## Fluxo recomendado para novos devs

1. Ler **PROJECT.md** — entender o produto e o modelo
2. Ler **ROADMAP.md** — ver o que já foi feito e o que falta
3. Consultar **BACKEND_STATUS.md** — estado técnico detalhado
4. Seguir **TESTE_STRIPE_COMPLETO.md** — arrancar ambiente e testar fluxo completo

---

## Documentos arquivados

Os seguintes documentos foram arquivados em `archive_support/` por estarem desatualizados ou redundantes:

| Ficheiro arquivado | Motivo |
|--------------------|--------|
| `archive_support/runbook_testes_local.md` | Substituído por TESTE_STRIPE_COMPLETO.md (fluxo completo) e BACKEND_STATUS.md |
| `archive_support/runbook_tecnico_local.md` | Substituído por TESTE_STRIPE_COMPLETO.md; estado desatualizado |
