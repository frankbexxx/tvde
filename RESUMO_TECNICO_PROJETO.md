# Resumo Técnico — TVDE Ride-Sharing Backend (Stripe v2)

Documento de referência para onboarding de engenheiros. Permite compreender o sistema sem ler todo o código.

---

## 1. Estrutura Geral

### Framework
- **FastAPI** — API REST assíncrona
- **SQLAlchemy 2** — ORM com modelos declarativos
- **PostgreSQL** — Base de dados
- **Stripe** — Pagamentos (manual capture)
- **PyJWT** — Autenticação JWT

### Organização de Pastas

```
APP/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py              # get_db, get_current_user, require_role
│   │   │   └── routers/             # Endpoints por domínio
│   │   │       ├── admin.py
│   │   │       ├── admin_ws.py
│   │   │       ├── auth.py          # OTP request/verify
│   │   │       ├── dev_tools.py     # Reset, seed, tokens, auto-trip (ENV=dev ou ENABLE_DEV_TOOLS)
│   │   │       ├── driver_trips.py  # Driver: available, accept, arriving, start, complete, cancel
│   │   │       ├── health.py
│   │   │       ├── passenger_trips.py  # Passenger: create, cancel
│   │   │       ├── realtime.py
│   │   │       ├── ws.py
│   │   │       └── webhooks/
│   │   │           └── stripe.py    # Webhook Stripe
│   │   ├── auth/
│   │   │   ├── otp.py               # generate_otp_code, verify_otp_code, hash_otp_code
│   │   │   └── security.py         # create_access_token, decode_access_token
│   │   ├── core/
│   │   │   ├── config.py           # Settings (pydantic_settings)
│   │   │   └── pricing.py         # Pricing engine
│   │   ├── db/
│   │   │   ├── base.py
│   │   │   ├── models/            # SQLAlchemy models
│   │   │   └── session.py
│   │   ├── events/
│   │   │   └── dispatcher.py      # emit(), AuditEvent + realtime publish
│   │   ├── models/
│   │   │   └── enums.py           # Role, TripStatus, PaymentStatus, etc.
│   │   ├── schemas/               # Pydantic request/response
│   │   ├── services/
│   │   │   ├── payments.py       # create_payment_for_trip (alternativo)
│   │   │   ├── stripe_service.py # Wrappers Stripe API
│   │   │   └── trips.py          # Lógica de negócio de trips
│   │   └── realtime/             # SSE hubs
│   ├── .env
│   └── requirements.txt
├── web-app/                      # React+Vite+TypeScript
└── ROADMAP.md
```

### Principais Routers

| Router | Prefixo | Tags | Descrição |
|--------|---------|------|-----------|
| `health` | — | — | Health check |
| `dev_tools` | `/dev` | dev ou ENABLE_DEV_TOOLS | Reset, seed, tokens, auto-trip, list trips |
| `auth` | `/auth` | auth | OTP request, OTP verify |
| `passenger_trips` | `/trips` | passenger | Create trip, cancel trip |
| `driver_trips` | `/driver/trips` | driver | Available, accept, arriving, start, complete, cancel |
| `admin` | — | — | Admin endpoints |
| `realtime` | — | — | SSE |
| `ws` | — | — | WebSocket |
| `admin_ws` | — | — | Admin WebSocket |
| `stripe_webhook` | `/webhooks` | webhooks | Stripe webhook |

### Camadas

- **api/routers** — Endpoints HTTP, validação de payload, chamada a services
- **services** — Lógica de negócio (trips, stripe_service, payments)
- **db/models** — Modelos SQLAlchemy
- **schemas** — Pydantic (request/response)
- **core** — Config, pricing
- **auth** — OTP, JWT

---

## 2. Modelos SQLAlchemy

### Trip (`app/db/models/trip.py`)

| Campo | Tipo | Constraints | Descrição |
|-------|------|--------------|-----------|
| `id` | UUID | PK, default uuid4 | Identificador único |
| `passenger_id` | UUID | FK users.id, NOT NULL | Passageiro |
| `driver_id` | UUID | FK drivers.user_id, NULL | Motorista (até accept) |
| `status` | TripStatus | NOT NULL | Estado da viagem |
| `origin_lat` | Numeric(9,6) | NOT NULL | Latitude origem |
| `origin_lng` | Numeric(9,6) | NOT NULL | Longitude origem |
| `destination_lat` | Numeric(9,6) | NOT NULL | Latitude destino |
| `destination_lng` | Numeric(9,6) | NOT NULL | Longitude destino |
| `estimated_price` | Numeric(10,2) | NOT NULL | Preço estimado |
| `distance_km` | Numeric(8,2) | NULL | Distância (mock se null) |
| `duration_min` | Numeric(8,2) | NULL | Duração em min (mock se null) |
| `final_price` | Numeric(10,2) | NULL | Preço final (após complete) |
| `started_at` | DateTime(TZ) | NULL | Início da viagem |
| `completed_at` | DateTime(TZ) | NULL | Fim da viagem |
| `created_at` | DateTime(TZ) | server_default | Criação |
| `updated_at` | DateTime(TZ) | onupdate | Atualização |

**Relações:** `passenger` → User, `driver` → Driver, `payment` → Payment (1:1)

**Índices:** `ix_trips_status`, `ix_trips_passenger_id`, `ix_trips_driver_id`

---

### Payment (`app/db/models/payment.py`)

| Campo | Tipo | Constraints | Descrição |
|-------|------|--------------|-----------|
| `id` | UUID | PK, default uuid4 | Identificador único |
| `trip_id` | UUID | FK trips.id, UNIQUE | Trip associada |
| `total_amount` | Numeric(10,2) | NOT NULL | Total cobrado |
| `commission_amount` | Numeric(10,2) | NOT NULL | Comissão plataforma |
| `driver_amount` | Numeric(10,2) | NOT NULL | Legacy (driver_payout é final) |
| `driver_payout` | Numeric(10,2) | NULL | Payout final do motorista |
| `stripe_payment_intent_id` | String(128) | NULL | ID PaymentIntent Stripe |
| `currency` | String(3) | default EUR | Moeda |
| `status` | PaymentStatus | NOT NULL | processing → succeeded (webhook) |
| `authorization_expires_at` | DateTime(TZ) | NULL | Expiração autorização |
| `created_at` | DateTime(TZ) | server_default | Criação |
| `updated_at` | DateTime(TZ) | onupdate | Atualização |

**Constraints:** `uq_payments_trip_id` (1 payment por trip)

**Relações:** `trip` → Trip

---

### User (`app/db/models/user.py`)

| Campo | Tipo | Constraints | Descrição |
|-------|------|--------------|-----------|
| `id` | UUID | PK, default uuid4 | Identificador único |
| `role` | Role | NOT NULL | passenger, driver, admin |
| `name` | String(120) | NOT NULL | Nome |
| `phone` | String(32) | NOT NULL, UNIQUE | Telefone (OTP) |
| `status` | UserStatus | NOT NULL | active, blocked |
| `created_at` | DateTime(TZ) | server_default | Criação |
| `updated_at` | DateTime(TZ) | onupdate | Atualização |

**Relações:** `driver_profile` → Driver, `passenger_trips` → Trip

**Índices:** `ix_users_role_status`

---

### Driver (`app/db/models/driver.py`)

| Campo | Tipo | Constraints | Descrição |
|-------|------|--------------|-----------|
| `user_id` | UUID | FK users.id, PK | User do motorista |
| `status` | DriverStatus | NOT NULL | pending, approved, rejected |
| `documents` | Text | NULL | Referências documentos |
| `commission_percent` | Numeric(5,2) | NOT NULL | **Fonte única de comissão** |
| `created_at` | DateTime(TZ) | server_default | Criação |
| `updated_at` | DateTime(TZ) | onupdate | Atualização |

**Relações:** `user` → User, `trips` → Trip

**Índices:** `ix_drivers_status`

---

### AuditEvent (`app/db/models/audit_event.py`)

| Campo | Tipo | Constraints | Descrição |
|-------|------|--------------|-----------|
| `id` | UUID | PK, default uuid4 | Identificador único |
| `event_type` | String(64) | NOT NULL | Tipo de evento |
| `entity_type` | String(32) | NOT NULL | trip, etc. |
| `entity_id` | String(64) | NOT NULL | ID da entidade |
| `payload` | JSONB | NOT NULL | Payload serializado |
| `occurred_at` | DateTime(TZ) | NOT NULL | Quando ocorreu |
| `created_at` | DateTime(TZ) | server_default | Persistência |

**Índices:** `ix_audit_events_entity`, `ix_audit_events_occurred_at`

---

### OtpCode (`app/db/models/otp.py`)

| Campo | Tipo | Constraints | Descrição |
|-------|------|--------------|-----------|
| `id` | UUID | PK, default uuid4 | Identificador único |
| `phone` | String(32) | NOT NULL | Telefone |
| `code_hash` | String(128) | NOT NULL | Hash do código OTP |
| `expires_at` | DateTime(TZ) | NOT NULL | Expiração |
| `consumed_at` | DateTime(TZ) | NULL | Quando foi usado |
| `created_at` | DateTime(TZ) | server_default | Criação |

**Índices:** `ix_otp_codes_phone_expires`

---

## 3. Enums

| Enum | Valores |
|------|---------|
| **Role** | `passenger`, `driver`, `admin` |
| **UserStatus** | `active`, `blocked` |
| **DriverStatus** | `pending`, `approved`, `rejected` |
| **TripStatus** | `requested`, `assigned`, `accepted`, `arriving`, `ongoing`, `completed`, `cancelled`, `failed` |
| **PaymentStatus** | `pending`, `processing`, `succeeded`, `failed` |

---

## 4. Serviços Stripe (`app/services/stripe_service.py`)

| Função | Descrição |
|--------|-----------|
| `create_authorization_payment_intent(amount_cents, currency, metadata)` | Cria PaymentIntent sem confirmar. `capture_method="manual"`, `confirm=False`. Status: `requires_confirmation`. |
| `update_payment_intent_amount(payment_intent_id, amount_cents)` | Atualiza o amount do PaymentIntent. Só permitido em `requires_payment_method`, `requires_confirmation`, `requires_action`. **Não** em `requires_capture`. |
| `confirm_payment_intent(payment_intent_id, payment_method=None)` | Confirma o PaymentIntent. Em dev pode passar `pm_card_visa` para fluxo backend-only. |
| `capture_payment_intent(payment_intent_id)` | Captura o PaymentIntent previamente autorizado. |
| `retrieve_payment_intent(payment_intent_id)` | Obtém o PaymentIntent (ex.: para retry logic). |

---

## 5. Fluxo `accept_trip`

**Ficheiro:** `app/services/trips.py` → `accept_trip()`

1. **Query:** `select(Trip).where(Trip.id == trip_id)` → trip
2. **Validações:**
   - Trip existe
   - `trip.status == TripStatus.assigned`
   - `trip.driver_id is None`
   - Idempotência: não existe Payment para esta trip
3. **Query:** `select(Driver).where(Driver.user_id == driver_id)` → driver (deve existir)
4. **Amount placeholder:** 50 cêntimos (Stripe exige ≥50 para EUR)
5. **Comissão:** `driver.commission_percent` (fonte única)
6. **Stripe:** `create_authorization_payment_intent(amount_cents=50, currency="EUR", metadata={"trip_id": trip.id})` → status `requires_confirmation`
7. **Criação Payment:** `Payment(trip_id, total_amount=0.50, commission_amount, driver_amount, status=processing, stripe_payment_intent_id)`
8. **Atualização Trip:** `trip.driver_id = driver_id`, `trip.status = TripStatus.accepted`
9. **Commit** único
10. **Emit** `TripStatusChangedEvent`

Se Stripe falhar → HTTP 402, trip permanece `assigned`.

---

## 6. Fluxo `complete_trip`

**Ficheiro:** `app/services/trips.py` → `complete_trip()`

1. **Validações:**
   - Trip existe e pertence ao driver
   - `trip.status == TripStatus.ongoing`
   - Payment existe e `payment.status == PaymentStatus.processing`
   - `payment.stripe_payment_intent_id` existe
2. **Query:** `select(Driver)` → `driver.commission_percent`
3. **Distance/duration:** Se `trip.distance_km` ou `trip.duration_min` null → mock (2–5 km, 5–15 min)
4. **Preço:** `calculate_price(distance_km, duration_min)` → `final_price`
5. **Comissão:** `driver.commission_percent` → `commission_amount`, `driver_payout`
6. **Retry logic:** `retrieve_payment_intent` → se `pi_status == "requires_capture"`:
   - Salta update/confirm
   - Usa amount do Stripe para DB
   - Vai direto a capture
7. **Fluxo normal (pi_status != "requires_capture"):**
   - `update_payment_intent_amount(amount_cents)` — rollback em erro
   - `confirm_payment_intent` (em dev: `pm_card_visa`) — rollback em erro
8. **Capture:** `capture_payment_intent` — rollback em erro
9. **Só após capture OK:** commit DB:
   - `trip.final_price`, `trip.status=completed`, `trip.completed_at`
   - `payment.total_amount`, `commission_amount`, `driver_amount`, `driver_payout`
   - **`payment.status` NÃO é alterado** — webhook marca `succeeded`
10. **Emit** `TripStatusChangedEvent`

---

## 7. Webhook Stripe

**Endpoint:** `POST /webhooks/stripe`  
**Ficheiro:** `app/api/routers/webhooks/stripe.py`

### Validação de assinatura
- Header `stripe-signature` obrigatório
- `stripe.Webhook.construct_event(payload, stripe_signature, STRIPE_WEBHOOK_SECRET)`
- Erros: 400 (payload inválido), 401 (assinatura inválida)

### Lookup do Payment
- `payment_intent_id` extraído de `event.data.object` (PaymentIntent ou Charge)
- `select(Payment).where(Payment.stripe_payment_intent_id == payment_intent_id)`
- Se não existir → retorna `{"status": "ok"}` (200) — idempotente

### Eventos tratados

| Evento | Ação |
|--------|------|
| `payment_intent.succeeded` | `payment.status = succeeded` (idempotente) |
| `payment_intent.payment_failed` | `payment.status = failed` (idempotente) |
| `charge.payment_failed` | `payment.status = failed` (idempotente) |
| `charge.succeeded` | **Ignorado** — dispara na autorização (manual capture) |

### Princípios
- Webhook é **fonte de verdade** para `payment.status`
- `complete_trip` nunca altera `payment.status` manualmente

---

## 8. Pricing Engine

**Ficheiro:** `app/core/pricing.py`

### Constantes
- `BASE_FARE = 1.50`
- `PER_KM = 0.60`
- `PER_MIN = 0.15`
- `COMMISSION_RATE = 0.15` (não usado em complete_trip — usa `driver.commission_percent`)

### Funções
- `calculate_price(distance_km, duration_min) -> float`  
  Fórmula: `BASE_FARE + (PER_KM * distance_km) + (PER_MIN * duration_min)`  
  Arredondamento: `round(total, 2)`

- `calculate_driver_payout(total) -> float`  
  Fórmula: `total * (1 - COMMISSION_RATE)`  
  Arredondamento: `round(payout, 2)`  
  **Nota:** Em `complete_trip` usa-se `driver.commission_percent`, não `COMMISSION_RATE`.

---

## 9. Dev Tools

**Router:** `app/api/routers/dev_tools.py`  
**Prefix:** `/dev`  
**Condição:** Todos retornam 404 quando `ENV != "dev"`

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/dev/reset` | POST | TRUNCATE payments, trips CASCADE (users mantidos) |
| `/dev/seed` | POST | Cria passenger (+351912345678), admin (+351900000000), driver (+351911111111) |
| `/dev/tokens` | POST | JWT para os 3 roles **sem OTP** |
| `/dev/auto-trip` | POST | Fluxo completo: create → assign → accept → arriving → start → complete |
| `/dev/trips` | GET | Lista todas as trips com payment info |

### Seed
- `get_or_create_user(phone, role)` — cria User se não existir
- Driver: `status=approved`, `commission_percent=15`

### Tokens
- `create_access_token(subject=user.id, role=user.role.value)`
- Retorna `{ passenger, admin, driver }` — 3 tokens

---

## 10. Web App (Frontend)

**Path:** `web-app/`  
**Stack:** React + Vite + TypeScript  
**URL:** http://localhost:5173  
**Proxy:** `/api` → localhost:8000

### Estrutura
- `features/passenger` — Dashboard passageiro (pedir viagem, histórico)
- `features/driver` — Dashboard motorista (available, accept, arriving, start, complete)
- `features/shared` — DevTools (Seed, Auto-trip, Assign, Run timeouts)
- `context/` — AuthContext, ActivityLogContext
- `components/ActivityPanel` — Log e estado em tempo real

### Fluxo
- Seed + tokens via `/dev/tokens` (sem OTP)
- Polling 5s para histórico e viagem ativa

---

## 11. Decisões Arquiteturais

| Decisão | Razão |
|---------|-------|
| **Manual capture** | Permite atualizar amount antes de confirm (complete_trip). Autorização no accept, capture no complete. |
| **Webhook como fonte de verdade** | Stripe pode entregar eventos fora de ordem ou com atraso. Evita race conditions. |
| **Commit após capture** | Atomicidade: só persiste trip completed e payment amounts quando Stripe confirma capture. |
| **`driver.commission_percent`** | Comissão por motorista (contratos diferentes). Fonte única em accept e complete. |
| **Retry em complete_trip** | Se PI já em `requires_capture` (confirm OK, capture falhou), salta update/confirm e vai direto a capture. |
| **Sem migrations** | `create_all` em dev + `_dev_add_columns_if_missing()` para novas colunas. Sem Alembic nesta fase. |
| **Sem Stripe Connect** | MVP; split futuro. |

---

## 12. State Machine (Trip)

```
requested → assigned → accepted → arriving → ongoing → completed
     ↓          ↓           ↓
  cancelled  cancelled  cancelled
```

**Transições:**
- `assign_trip`: requested → assigned
- `accept_trip`: assigned → accepted (cria PaymentIntent + Payment)
- `mark_trip_arriving`: accepted → arriving
- `start_trip`: arriving → ongoing
- `complete_trip`: ongoing → completed (update, confirm, capture Stripe)
- `cancel_trip_by_passenger`: requested|assigned|accepted|arriving → cancelled
- `cancel_trip_by_driver`: accepted|arriving → cancelled

---

## 13. Riscos Atuais

| Risco | Mitigação |
|-------|------------|
| Sem migrations | `_dev_add_columns_if_missing()` para dev; produção futura precisa Alembic |
| Distance/duration mock | Valores aleatórios 2–5 km, 5–15 min; integrar API de rotas futuramente |
| Webhook secret em dev | `stripe listen` obrigatório; sem secret → validação falha |
| `driver_amount` vs `driver_payout` | Legacy; `driver_payout` é o valor final; considerar deprecação |
| Sem idempotency key em accept | Idempotência via check de Payment existente |
| OTP em produção | Configurar envio real (SMS gateway) |

---

## 14. Próximos Passos Planeados

### Fase 2 — Web App (ROADMAP)
- Novo projeto **web-app** (React+Vite, TypeScript)
- Polling 5s
- **Passenger Dashboard:** pedir viagem, ver estado, preço, pagamento, histórico
- **Driver Dashboard:** lista assigned, Accept/Arriving/Start/Complete, valor e comissão
- Objetivo: produto testável em telemóvel, fluxo humano validável

### Futuro
- **Stripe Connect** — split automático para motoristas
- **Migrations** — Alembic para evolução de schema
- **API de rotas** — distância/duração reais (Google Maps, OSRM, etc.)
- **Notificações push** — para motoristas e passageiros

---

## 15. Ficheiros Chave

| Ficheiro | Responsabilidade |
|----------|------------------|
| `app/main.py` | FastAPI app, routers, `create_all`, `_dev_add_columns_if_missing` |
| `app/services/trips.py` | create_trip, assign_trip, accept_trip, complete_trip, cancel, etc. |
| `app/services/stripe_service.py` | Wrappers Stripe (create, update, confirm, capture, retrieve) |
| `app/api/routers/webhooks/stripe.py` | Webhook; só `payment_intent.succeeded` para succeeded |
| `app/core/pricing.py` | calculate_price, calculate_driver_payout |
| `app/core/config.py` | Settings (DATABASE_URL, JWT, OTP, STRIPE, ENV) |
| `app/api/routers/dev_tools.py` | Reset, seed, tokens, auto-trip (ENV=dev ou ENABLE_DEV_TOOLS) |
| `app/api/deps.py` | get_db, get_current_user, require_role |
| `app/events/dispatcher.py` | emit() → AuditEvent + realtime publish |

---

## 16. Como Correr

```bash
# PostgreSQL (Docker)
docker run --name ride_postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ride_db -p 5432:5432 -d postgres

# Backend (.env: DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/ride_db)
cd backend
.\venv\Scripts\activate
uvicorn app.main:app --reload --port 8000

# Web App
cd web-app
npm run dev
# Abrir http://localhost:5173

# Stripe webhook (para payment.status succeeded)
stripe listen --forward-to localhost:8000/webhooks/stripe
```

---

## 17. Restrições a Respeitar

- Não quebrar state machine
- Não alterar webhook como fonte de verdade
- Não alterar fluxo accept_trip
- Manter idempotência e atomicidade
- Sem migrations (create_all + _dev_add_columns_if_missing)
- Sem Stripe Connect nesta fase
