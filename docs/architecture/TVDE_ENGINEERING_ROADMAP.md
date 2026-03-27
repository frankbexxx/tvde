# TVDE — Engineering Roadmap

Objetivo:
Transformar o sistema atual num MVP robusto sem reescrever arquitetura.

Princípios:

- não alterar código que funciona
- mudanças pequenas e testáveis
- cada alteração deve ser verificável
- rollback possível

---

# Fase 1 — Stabilization

Objetivo:
Eliminar inconsistências de estado e edge cases.

Tasks:

1. Trip state guardrails
2. State transition validation
3. Melhorar logs críticos
4. Endpoint consistency checks

Resultado esperado:

Trip lifecycle completamente seguro.

---

# Fase 2 — Driver Simulation Engine

Objetivo:

Simular vários motoristas para testar concorrência.

Features:

- gerar N drivers
- enviar localização
- aceitar viagens automaticamente

Permite testar:

- dispatch
- concorrência
- estabilidade do sistema

---

# Fase 3 — Geo Matching

Objetivo:

Filtrar trips por proximidade.

Implementação inicial:

distance(driver, pickup)

Exemplo:

driver vê trips dentro de 5 km.

---

# Fase 4 — Dispatch Improvements

Objetivo:

melhorar atribuição de viagens.

Possibilidades:

- ranking por distância
- prioridade
- heurísticas simples

---

# Fase 5 — Observability

Adicionar:

- métricas de trips
- métricas de dispatch
- métricas de supply

---

# Fase 6 — Tracking Improvements

Melhorias futuras:

- WebSockets
- atualização mais rápida

Não prioritário para MVP.

---

# Ordem de Implementação

1 — Trip guardrails  
2 — Driver simulation  
3 — Geo matching  
4 — Dispatch improvements  
5 — Observability  
6 — Tracking improvements

---

# Anexo — Pré-produção (blocos A023–A035)

_Consolidado a partir de `docs/ROADMAP_TVDE_ATE_PRODUCAO.md` (ficheiro redirecionado). Fases numeradas abaixo são trabalho tático até “pronto para produção”; não substituem as fases 1–6 acima (visão de engenharia)._

## Estado de referência (quando o anexo foi fundido)

- Sistema funcional; hardening base; testes e Docker estáveis.
- Fase mental: **consolidação → pré-produção**.

## Bloco 1 — Integridade (crítico)

| ID                          | Tema                                                                          |
| --------------------------- | ----------------------------------------------------------------------------- |
| A023_SECURITY_BASE_SEC      | JWT hardening, CORS restrito, dev endpoints desligados em produção            |
| A024_STRIPE_EDGE_CASES_EXEC | `requires_capture`, alinhar Trip.final_price vs Payment.amount, idempotência  |
| A025_DB_CONSTRAINTS_DATA    | `stripe_payment_intent_id` único (nullable-safe), índices, limpeza duplicados |

## Bloco 2 — Operação

| ID                    | Tema                                          |
| --------------------- | --------------------------------------------- |
| A026_CRON_JOBS_OPS    | Timeouts, cleanup, frequência 30–60 s         |
| A027_ENVIRONMENTS_OPS | dev / staging / prod; `STRIPE_MOCK` só em dev |
| A028_BACKUPS_OPS      | Script backup, antes de deploy, regular       |

## Bloco 3 — Observabilidade

| ID                       | Tema                                         |
| ------------------------ | -------------------------------------------- |
| A029_LOG_CORRELATION_OBS | `trip_id`, `payment_intent_id`, `request_id` |
| A030_SYSTEM_HEALTH_OBS   | stuck payments, métricas básicas             |

## Bloco 4 — Testes

| ID                       | Tema                                                               |
| ------------------------ | ------------------------------------------------------------------ |
| A031_TEST_EXPANSION_TEST | Poucos testes; só flows com risco financeiro                       |
| A032_CI_PIPELINE_TEST    | PostgreSQL em CI, sem skips críticos, merge bloqueado em regressão |

## Bloco 5 — Preparação produção

| ID                          | Tema                                          |
| --------------------------- | --------------------------------------------- |
| A033_DEPLOYMENT_READY_OPS   | Env, secrets, Stripe                          |
| A034_SECURITY_AUDIT_AUDIT   | Endpoints, permissões, auth                   |
| A035_FINAL_VALIDATION_AUDIT | Simulação completa trip + pagamento test mode |

## Notas

- Não adicionar features grandes antes do fecho A035; não refatorar arquitetura “por gosto”.
- **Definição de pronto:** pagamentos fiáveis, sistema previsível, erros visíveis, operação clara.
