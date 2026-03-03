# PROXIMA_SESSAO.md — Handoff para Continuação

Documento de contexto para a próxima sessão. Inclui estado atual, decisões arquiteturais, e informação para prosseguir sem perder continuidade.

---

# Secção A — Resumo do ROADMAP Completo

## ROADMAP — Fase Atual (MVP Público Web)

### Estado Atual (concluído)
- Backend funcional
- Stripe authorization + capture funcional
- Webhook como fonte de verdade
- Web App operacional (web-test-console removido)
- Tokens dev ativos
- State machine estável
- **Etapa Operacional** implementada (disponibilidade, timeouts, dispatch, race condition)

---

### Fase 1 — Modelo Financeiro Real (Base Económica) — **Concluída**

| Item | Estado |
|------|--------|
| Pricing Engine | ✅ `app/core/pricing.py` |
| Integração no complete_trip | ✅ Recalcula `final_price`, update amount, capture |
| Campos distance_km, duration_min | ✅ Mock se null |
| driver_payout no Payment | ✅ Armazenado |
| Stripe Connect | ❌ Não integrado (conforme plano) |

---

### Fase 2 — Web App Responsiva (MVP Validável) — **Concluída**

| Item | Estado |
|------|--------|
| Novo projeto web-app | ✅ React + Vite + TypeScript |
| Passenger Dashboard | ✅ Pedir viagem, estado, preço, histórico |
| Driver Dashboard | ✅ Lista assigned, Accept/Arriving/Start/Complete |
| Polling 5s | ✅ |
| Painel de atividade (log + estado) | ✅ Implementado |
| Guia de testes | ✅ GUIA_TESTES.md |

---

### Princípios Arquiteturais (ROADMAP)
- Stripe é a fonte financeira externa
- Webhook é a fonte de verdade interna
- `Payment.status` só muda via webhook
- `complete_trip` nunca altera `payment.status` manualmente
- `update_payment_intent_amount` só pode ocorrer antes de capture

### Restrições Técnicas (ROADMAP)
- Não quebrar state machine existente
- Não alterar fluxo de authorization no `accept_trip`
- Não alterar webhook handler
- Manter idempotência e atomicidade

---

### Pendente no ROADMAP (não implementado)
- **Confirmação no Accept** — `ENABLE_CONFIRM_ON_ACCEPT` existe mas não ativado
- **Stripe Connect** — split automático para motoristas
- **Migrations** — Alembic para evolução de schema
- **API de rotas** — distância/duração reais (Google Maps, OSRM, etc.)
- **Notificações push** — para motoristas e passageiros

---

# Secção B — Resumo do que Existe, Estado de Testes e Cuidados

## O que existe

### Backend
- FastAPI, SQLAlchemy 2, PostgreSQL, Stripe (manual capture)
- Modelos: User, Driver, Trip, Payment, AuditEvent, OtpCode
- Driver: `is_available` (nova coluna)
- Serviços: trips, stripe_service, trip_timeouts, system_health, payments
- Endpoints: passenger, driver, admin, dev_tools, webhooks
- **POST /admin/run-timeouts** — execução manual de timeouts

### Web App
- React + Vite + TypeScript, Tailwind
- Passenger: pedir viagem, viagem ativa, histórico, cancelar
- Driver: lista available, Accept, Arriving, Start, Complete, Cancel, histórico
- DevTools: Seed, Auto-trip, Run timeouts, Assign
- Painel direito: log sequencial, estado em tempo real, vista, copiar log
- Role derivado do URL (`/driver` → motorista, `/passenger` → passageiro)

### Fluxo Operacional (implementado)
- Auto-dispatch: trip criada com driver disponível → `assigned`
- Timeouts: assigned 2min→requested, accepted 10min→cancelled, ongoing 6h→failed
- Driver `is_available`: false ao aceitar, true ao completar/cancelar
- Race condition: `SELECT FOR UPDATE` em `accept_trip`
- `assign_trip` idempotente (se já assigned, retorna sucesso)

---

## Estado atual de testes

**Testes concluídos com sucesso:**
- Fluxo completo: Pedir viagem → Assign (ou auto-dispatch) → Accept → Arriving → Start → Complete
- Auto-trip, Run timeouts, Seed
- Vista Passageiro e Motorista funcionais
- **Validação em campo (28/02/2026):** 4 telemóveis, rede móvel (dados móveis, sem Wi‑Fi), 1 motorista + 3 passageiros — 100% positivo

---

## Cuidados a ter

1. **Ordem de arranque:** Docker Desktop → PostgreSQL → Backend → Stripe webhook → Web App (ver GUIA_TESTES.md)
2. **Seed** — Executar antes de usar a app (ou após reset). Repõe `is_available=True` em drivers existentes.
3. **Auto-trip** — Requer driver disponível. Se falhar com "Driver is not available", executar Seed primeiro.
4. **Stripe webhook** — Obrigatório para `payment.status` passar a `succeeded`. Sem `stripe listen`, o complete funciona mas o payment fica em `processing`.
5. **Invariantes** — Não alterar accept_trip, complete_trip, stripe_service, webhook, model financeiro.
6. **Run timeouts** — Execução manual: POST /admin/run-timeouts. Não há cron job; em produção seria necessário agendar.

---

# Secção C — Visão

O sistema está num **MVP validável** — fluxo técnico e operacional completos, com testes manuais a passar. A base está sólida:

- **Financeiro:** Stripe manual capture, webhook como fonte de verdade, pricing engine integrado
- **Operacional:** Disponibilidade, timeouts, dispatch, proteção contra race
- **UX:** Web app com log e estado em tempo real, guia de testes para não-técnicos

A **validação em contexto real** foi concluída com sucesso (4 dispositivos, rede móvel). Próximo passo natural: **decisão sobre confirmação** — quando o preço passa a ser definitivo (ver STRIPE_CONFIRMACAO_FUTURA.md). A introdução de Stripe Connect ou confirmação no accept deve ser feita depois dessa decisão.

---

# Secção D — O que Deve Ser a Próxima Sessão

## Recomendação

**Prioridade 1 — Concluída**
- Validação em campo: 4 dispositivos, rede móvel, fluxo completo — 100% positivo

**Prioridade 2 — Melhorias incrementais (se necessário)**
1. Ajustes de UI/UX na Web App
2. Cron job ou scheduler para execução periódica de `run-timeouts` (se aplicável)
3. Revisão do GUIA_TESTES.md com feedback do utilizador

**Prioridade 3 — Decisão pendente**
- **Quando o preço passa a ser definitivo?** (modo atual: no complete; modo futuro: antes de confirm)
- Definir antes de qualquer implementação de confirmação no accept
- Ver `STRIPE_CONFIRMACAO_FUTURA.md` — estratégias A, B, C

**Não fazer ainda**
- Não ativar `ENABLE_CONFIRM_ON_ACCEPT` até definir filosofia de pricing
- Não introduzir Stripe Connect
- Não alterar state machine, webhook ou fluxo financeiro

---

# Secção E — Assuntos Pertinentes Não Focados Anteriormente

1. **Migrations** — O projeto usa `create_all` + `_dev_add_columns_if_missing()`. Para produção, Alembic (ou equivalente) será necessário. A adição de novas colunas pode exigir scripts de migração.

2. **Testes automatizados** — Não existem testes unitários ou de integração. O fluxo é validado manualmente. Para evolução segura, pytest (backend) e Vitest/React Testing Library (frontend) seriam úteis.

3. **Distância / duração reais** — O pricing usa valores mock (2–5 km, 5–15 min). Integração com API de rotas (Google Maps, OSRM) seria o próximo passo para preços realistas.

4. **OTP em produção** — O auth usa OTP; em dev, `/dev/tokens` sem OTP. Para produção, configurar gateway SMS real.

5. **Segurança** — Tokens em memory no frontend; sem refresh token. Para sessões longas, considerar refresh flow.

6. **web-test-console** — Removido; a web-app substitui-o completamente.

7. **API de rotas** — O prefixo `/trips` (passenger) e `/driver/trips` (driver) estão separados. O role é validado pelo JWT; o token correto é usado conforme o pathname.

8. **Tema escuro** — O index.css foi alterado para forçar tema claro (`color-scheme: light`). O template Vite usava tema escuro por defeito, o que causava ecrã negro na vista do motorista.

---

# Como Correr

```bash
# Docker Desktop aberto primeiro
docker run --name ride_postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ride_db -p 5432:5432 -d postgres
# ou: docker start ride_postgres

cd backend
.\venv\Scripts\activate
uvicorn app.main:app --reload --port 8000

# Outra janela: Stripe webhook
stripe listen --forward-to localhost:8000/webhooks/stripe

# Outra janela: Web App
cd web-app
npm run dev
# http://localhost:5173
```

Ver **GUIA_TESTES.md** para instruções completas e sequenciais.

---

# Ficheiros Chave

| Ficheiro | Responsabilidade |
|----------|------------------|
| `app/services/trips.py` | Lógica trip; accept, complete, assign_trip (idempotente) |
| `app/services/trip_timeouts.py` | run_trip_timeouts() |
| `app/services/stripe_service.py` | Wrappers Stripe |
| `app/api/routers/webhooks/stripe.py` | Webhook |
| `app/db/models/driver.py` | is_available |
| `web-app/src/context/AuthContext.tsx` | Token em memory; role derivado do pathname |
| `web-app/src/context/ActivityLogContext.tsx` | Log e estado |
| `web-app/src/components/ActivityPanel.tsx` | Painel direito |
| `GUIA_TESTES.md` | Guia passo a passo para testes |
