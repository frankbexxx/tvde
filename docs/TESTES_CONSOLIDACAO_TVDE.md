# TESTES — TVDE (FASE DE CONSOLIDAÇÃO)

Objetivo, princípios e escopo alinham-se com a suíte em `backend/tests/test_consolidacao_tvde.py`.

## O que corre sozinho (sem Stripe real)

- `pytest tests/test_consolidacao_tvde.py` — sete testes: fluxo de viagem, métricas no `complete`, webhooks (sucesso, falha, idempotência), fluxo com `STRIPE_MOCK`, cancelamento.
- Stripe real: **fechado / não necessário**. Os webhooks usam mock de `stripe.Webhook.construct_event` no módulo da app.
- Frontend / browser: **fechado / não necessário**.

## O que tens de ter aberto (infra)

1. **PostgreSQL** a aceitar ligações no host e porta definidos em `DATABASE_URL` (ficheiro `backend/.env` ou variável de ambiente).
   - **Docker Desktop**: aberto e a correr (Windows/macOS).
   - **Contentor Postgres** (exemplo): `docker run -d --name tvde_pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ride_db -p 5432:5432 postgres:15`
   - Garante que `DATABASE_URL` aponta para essa instância (ex.: `postgresql+psycopg2://postgres:postgres@localhost:5432/ride_db` — ajusta driver/URL ao que o projeto usa).

2. **Migrações aplicadas** na mesma base que `DATABASE_URL` (schema compatível com os modelos). Se a BD estiver vazia ou desatualizada, os testes podem falhar por FK/tabelas em falta — não é “skip por infra”, é falha de schema.

## Comportamento sem Postgres

- Se não houver ligação ao motor configurado em `engine` / `DATABASE_URL`, o módulo faz **skip** explícito (não conta como falha por “infra em baixo”).

## Passos manuais (checklist rápida)

| Passo | Aberto | Fechado |
|-------|--------|---------|
| 1. Arrancar Docker (se usares Postgres em contentor) | Docker Desktop | — |
| 2. Arrancar Postgres | serviço ou `docker run` acima | — |
| 3. Confirmar `backend/.env` com `DATABASE_URL` válido | — | valores errados / outra porta |
| 4. (Opcional) `stripe listen` / Stripe CLI | **Não** necessário para esta suíte | — |
| 5. Na shell: `cd backend`, ativar venv, `pytest tests/test_consolidacao_tvde.py -v` | terminal na pasta `backend` | — |

## Definição de sucesso

- Com Postgres ativo e schema OK: **7 passed**, 0 falhas.
- Nenhum teste depende de rede Stripe real; `complete_trip` com métricas em falta devolve **422** e `detail == "trip_metrics_required_before_completion"`.

## Não fazer (escopo)

- Testes de UI; mocks complexos além do webhook; simulação de rede; frameworks de teste extra.
