# TVDE — Engineering Roadmap

Objetivo:
Transformar o sistema atual num MVP robusto sem reescrever arquitetura.

Princípios:

- não alterar código que funciona
- mudanças pequenas e testáveis
- cada alteração deve ser verificável
- rollback possível

---

## Estado atual (atualização 2026-03-28)

Legenda: **Feito** · **Parcial** · **Falta**

| Fase / tema                | Estado      | Nota breve                                                                                                                  |
| -------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------- |
| Fase 1 — Stabilization     | **Feito**   | Guardrails de estado, validação de transições, logs operacionais; testes dedicados no backend.                              |
| Fase 2 — Driver simulation | **Parcial** | Existe tooling em `backend/tools/simulator/`; não é obrigatório para entrega MVP se os testes automatizados cobrirem risco. |
| Fase 3 — Geo matching      | **Feito**   | Matching por raio, localização motorista, estabilidade temporal (stale location).                                           |
| Fase 4 — Dispatch          | **Feito**   | Multi-offer, timeouts de oferta, dispatch operacional.                                                                      |
| Fase 5 — Observability     | **Parcial** | `system-health`, métricas admin, logs estruturados; falta camada de métricas agregadas / dashboards formais.                |
| Fase 6 — Tracking          | **Parcial** | WS/realtime presentes; polling 5s na web-app; melhorias de latência não bloqueiam entrega MVP.                              |
| Schema / migrações         | **Feito**   | **Alembic** (baseline `80f5b3e9fd12`, head `c4a8e1b2d0f3` com `stripe_webhook_events`); arranque corre `upgrade head`.      |
| CI                         | **Feito**   | `backend-ci` com PostgreSQL, `alembic upgrade head` antes de `pytest`.                                                      |

O que ainda **não** está fechado para “produto completo” (ver anexo A023–A035 e seção **Entrega da app** abaixo): backups formais, auditoria de segurança documentada, expansão de testes além do núcleo, Stripe Connect, confirmação 3DS no accept, notificações push.

---

# Fase 1 — Stabilization

Objetivo:
Eliminar inconsistências de estado e edge cases.

Tasks:

1. ~~Trip state guardrails~~ **Feito**
2. ~~State transition validation~~ **Feito**
3. ~~Melhorar logs críticos~~ **Feito** (incl. `DEBUG_RUNTIME_LOGS`, eventos TVDE/TRIP)
4. Endpoint consistency checks **Parcial** (revisão contínua; sem checklist única fechada)

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

**Estado: Parcial** — simulador em repo; uso opcional em QA.

---

# Fase 3 — Geo Matching

Objetivo:

Filtrar trips por proximidade.

Implementação inicial:

distance(driver, pickup)

Exemplo:

driver vê trips dentro de 5 km.

**Estado: Feito** (raio configurável, OSRM opcional, haversine fallback).

---

# Fase 4 — Dispatch Improvements

Objetivo:

melhorar atribuição de viagens.

Possibilidades:

- ranking por distância
- prioridade
- heurísticas simples

**Estado: Feito** (ofertas múltiplas, expiração, re-dispatch); refinamentos de ranking = melhoria contínua.

---

# Fase 5 — Observability

Adicionar:

- métricas de trips
- métricas de dispatch
- métricas de supply

**Estado: Parcial** — endpoints e logs existem; métricas tipo Prometheus/dashboards **Falta** se for requisito de entrega.

---

# Fase 6 — Tracking Improvements

Melhorias futuras:

- WebSockets
- atualização mais rápida

Não prioritário para MVP.

**Estado: Parcial** — realtime já usado em partes do sistema; otimização de cadência **Falta** como projeto dedicado.

---

# Ordem de Implementação

1 — Trip guardrails  
2 — Driver simulation  
3 — Geo matching  
4 — Dispatch improvements  
5 — Observability  
6 — Tracking improvements

_Na prática, 1–4 estão operacionais; 5–6 evoluem sem bloquear entrega MVP._

---

# Anexo — Pré-produção (blocos A023–A035)

_Consolidado a partir de `docs/ROADMAP_TVDE_ATE_PRODUCAO.md` (ficheiro redirecionado). Fases numeradas abaixo são trabalho tático até “pronto para produção”; não substituem as fases 1–6 acima (visão de engenharia)._

## Estado de referência (quando o anexo foi fundido)

- Sistema funcional; hardening base; testes e Docker estáveis.
- Fase mental: **consolidação → pré-produção**.

## Bloco 1 — Integridade (crítico)

| ID                          | Tema                                                                          | Estado      | Evidência / falta                                                                                                                                                                                                        |
| --------------------------- | ----------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A023_SECURITY_BASE_SEC      | JWT hardening, CORS restrito, dev endpoints desligados em produção            | **Feito**   | CORS por ambiente, `dev_tools` off em prod, `RequestIDMiddleware`.                                                                                                                                                       |
| A024_STRIPE_EDGE_CASES_EXEC | `requires_capture`, alinhar Trip.final_price vs Payment.amount, idempotência  | **Parcial** | Idempotência: chaves Stripe em create/confirm/capture/update; webhook com `stripe_webhook_events` + duplicados de estado; **Falta:** documentar edge cases restantes e `ENABLE_CONFIRM_ON_ACCEPT` se produto exigir 3DS. |
| A025_DB_CONSTRAINTS_DATA    | `stripe_payment_intent_id` único (nullable-safe), índices, limpeza duplicados | **Feito**   | `UniqueConstraint` no modelo `Payment`; **Alembic** como fonte de evolução de schema.                                                                                                                                    |

## Bloco 2 — Operação

| ID                    | Tema                                          | Estado      | Evidência / falta                                                                                                                              |
| --------------------- | --------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| A026_CRON_JOBS_OPS    | Timeouts, cleanup, frequência 30–60 s         | **Feito**   | `/cron/jobs`, timeouts de trip, retention audit.                                                                                               |
| A027_ENVIRONMENTS_OPS | dev / staging / prod; `STRIPE_MOCK` só em dev | **Parcial** | Flags e `ENV` existem; **Falta:** política explícita “staging” se for necessária; garantir `STRIPE_MOCK=false` em prod em checklist de deploy. |
| A028_BACKUPS_OPS      | Script backup, antes de deploy, regular       | **Falta**   | Sem script/documento de backup PG no repo; recomendado antes de entrega formal.                                                                |

## Bloco 3 — Observabilidade

| ID                       | Tema                                         | Estado      | Evidência / falta                                                                                                |
| ------------------------ | -------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------- |
| A029_LOG_CORRELATION_OBS | `trip_id`, `payment_intent_id`, `request_id` | **Parcial** | `request_id` global; correlação em muitos eventos; **Falta:** padronizar 100% dos logs críticos com os três IDs. |
| A030_SYSTEM_HEALTH_OBS   | stuck payments, métricas básicas             | **Feito**   | `GET /admin/system-health` e métricas associadas.                                                                |

## Bloco 4 — Testes

| ID                       | Tema                                                               | Estado      | Evidência / falta                                                                                                            |
| ------------------------ | ------------------------------------------------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| A031_TEST_EXPANSION_TEST | Poucos testes; só flows com risco financeiro                       | **Parcial** | Suite em crescimento (trips, stripe, constraints, cron); **Falta:** mais cobertura em serviços de pagamento/trip sob stress. |
| A032_CI_PIPELINE_TEST    | PostgreSQL em CI, sem skips críticos, merge bloqueado em regressão | **Feito**   | `.github/workflows/backend-ci.yml` com Postgres + Alembic + pytest.                                                          |

## Bloco 5 — Preparação produção

| ID                          | Tema                                          | Estado      | Evidência / falta                                                                                                |
| --------------------------- | --------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------- |
| A033_DEPLOYMENT_READY_OPS   | Env, secrets, Stripe                          | **Parcial** | Deploy Render + Stripe live/test operacionais; **Falta:** rotação de secrets após leaks, checklist por ambiente. |
| A034_SECURITY_AUDIT_AUDIT   | Endpoints, permissões, auth                   | **Falta**   | Revisão formal (ou light) de superfície de ataque e roles não documentada aqui.                                  |
| A035_FINAL_VALIDATION_AUDIT | Simulação completa trip + pagamento test mode | **Parcial** | Validado em campo e em testes; repetir após cada mudança grande (pagamentos, auth).                              |

---

## Entrega da app (checklist para “ir a público”)

Itens que **não** substituem o anexo A023–A035 mas completam o que falta para uma **entrega comercial/regulada** além do MVP técnico:

| #   | Item                                                                                                   | Estado                                             |
| --- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| 1   | **Migrações em produção** — `alembic_version` em head (`c4a8e1b2d0f3`), tabela `stripe_webhook_events` | Feito (após stamp+upgrade na BD Render)            |
| 2   | **Código em `main` + CI verde + deploy Render** alinhado com esse código                               | Verificar após cada release                        |
| 3   | **Backups PostgreSQL** (Render ou script + política de retenção)                                       | Falta (A028)                                       |
| 4   | **Stripe produção** — chaves live, webhook secret live, eventos corretos no dashboard                  | Operacional em testes; rever antes de tráfego real |
| 5   | **Conformidade / legal** (TVDE Portugal: termos, privacidade, registo de tratamentos se aplicável)     | Fora do repo; obrigatório para produto real        |
| 6   | **Suporte e incidentes** — contacto, runbook mínimo (Stripe down, BD, rollback)                        | Falta documentar                                   |
| 7   | **App móvel / lojas** — se a entrega for nativa (iOS/Android); hoje stack é **web**                    | Definir se PWA ou apps nativas = trabalho à parte  |
| 8   | **Stripe Connect** (pagamento automático ao motorista)                                                 | Falta (fora do MVP atual)                          |
| 9   | **Notificações push / SMS OTP produção**                                                               | Falta (OTP/SMS e push não fechados para produção)  |
| 10  | **Monitorização externa** (uptime, alertas além dos logs Render)                                       | Falta se for requisito de SLA                      |

---

## Notas

- Não adicionar features grandes antes do fecho A035; não refatorar arquitetura “por gosto”.
- **Definição de pronto:** pagamentos fiáveis, sistema previsível, erros visíveis, operação clara.
- **Schema:** novas colunas/tabelas passam por **Alembic**; não depender de `ALTER` ad hoc no arranque (removido do fluxo atual).
