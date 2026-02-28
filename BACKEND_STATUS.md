## Estado atual do backend (FastAPI)

### 1. Autenticação (OTP + JWT)
- **Fluxo OTP**  
  - `POST /auth/otp/request`  
    - Gera um código OTP aleatório (`generate_otp_code`).  
    - Calcula `expires_at` (`otp_expiration_time`).  
    - Guarda em `otp_codes` o `phone`, `code_hash` (HMAC SHA‑256 com `OTP_SECRET`) e `expires_at`.  
    - Em ambiente de desenvolvimento (`ENV=dev`), escreve no terminal:  
      `[DEV OTP] phone=<phone> code=<code>` (apenas para testes locais).  
  - `POST /auth/otp/verify`  
    - Vai buscar o último OTP não consumido e não expirado para aquele `phone`.  
    - Valida o código com `verify_otp_code`.  
    - Marca `consumed_at` com o timestamp atual se for válido.  
    - Se ainda não existir `User` com aquele `phone`, cria um:  
      - `role = passenger`  
      - `name = phone`  
      - `status = active`
- **JWT**  
  - Gerado por `create_access_token(subject=<user_id>, role=<role>)`.  
  - Claims incluídas:  
    - `sub` – ID do utilizador  
    - `role` – role atual (`passenger`, `driver` ou `admin`)  
    - `iat` – issued at  
    - `exp` – expiração (agendada para `JWT_ACCESS_TOKEN_MINUTES` no `.env`)  
  - Resposta de `/auth/otp/verify` devolve:  
    - `access_token`, `token_type="bearer"`, `user_id`, `role`, `expires_at`.
- **Validação do token nas rotas protegidas**  
  - `HTTPBearer` simples em `api/deps.py` (`bearer_scheme = HTTPBearer(scheme_name="BearerAuth")`).  
  - `get_current_user` extrai o token do header `Authorization: Bearer <token>`.  
  - Decodifica o JWT, lê `sub`, procura o `User` na base de dados e:  
    - rejeita se o token for inválido/expirado  
    - rejeita se o utilizador não existir  
    - rejeita se `status != active` (retorna `blocked`).  
  - `require_role(...)` restringe rotas a `passenger`, `driver` ou `admin`.

### 2. Trips (modelo, serviços e endpoints)
- **Modelo `Trip`**  
  - Campos principais:  
    - `id` (UUID), `passenger_id`, `driver_id` (opcional)  
    - `status` (`TripStatus`)  
    - `origin_lat`, `origin_lng`, `destination_lat`, `destination_lng`  
    - `estimated_price`, `final_price`  
    - `started_at`, `completed_at` (timestamps de lifecycle)  
    - `created_at`, `updated_at`  
  - Estados (`TripStatus`):  
    - `requested`, `assigned`, `accepted`, `arriving`, `ongoing`, `completed`, `cancelled`, `failed`.

- **Service layer (`services/trips.py`)**  
  - `create_trip(db, passenger_id, payload)`  
    - Calcula `estimated_price` e `eta` (placeholder: `0.0`, `0`).  
    - Cria `Trip` com `status = requested`.  
    - Persiste na base de dados e faz `refresh`.  
    - Emite `TripStatusChangedEvent` com (`trip_id`, `status`, `timestamp`).  
    - Devolve `(trip, eta)`.  
  - `cancel_trip_by_passenger(db, passenger_id, trip_id)`  
    - Garante que a trip pertence ao passageiro.  
    - Só permite cancelar se `status` ∈ `{requested, assigned, accepted, arriving}`.  
    - Atualiza para `cancelled` e emite evento.  
  - `cancel_trip_by_driver(db, driver_id, trip_id)`  
    - Garante que a trip pertence ao driver.  
    - Só permite cancelar se `status` ∈ `{accepted, arriving}`.  
    - Atualiza para `cancelled` e emite evento.  
  - `assign_trip(db, trip_id)`  
    - Apenas se `status == requested` e `driver_id is None`.  
    - Atualiza para `assigned` e emite evento.  
  - `accept_trip(db, driver_id, trip_id)`  
    - Apenas se `status == assigned` e `driver_id is None`.  
    - Valida que o driver existe (tabela `drivers`) e está `approved`.  
    - **Stripe:** Cria PaymentIntent (manual capture), em dev confirma com cartão de teste (4242...).  
    - Cria `Payment` interno com `status=processing`.  
    - Liga `driver_id` e muda `status` para `accepted`, emitindo evento.  
    - Idempotência: se `Payment` já existe, retorna 409.  
  - `mark_trip_arriving(db, driver_id, trip_id)`  
    - Apenas se `status == accepted`.  
    - Atualiza para `arriving` e emite evento.  
  - `start_trip(db, driver_id, trip_id)`  
    - Apenas se `status == arriving`.  
    - Atualiza para `ongoing`, define `started_at`, emite evento.  
  - `complete_trip(db, driver_id, trip_id)`  
    - Apenas se `status == ongoing`.  
    - Valida `Payment.status == processing`.  
    - Captura PaymentIntent no Stripe.  
    - Atualiza para `completed`, define `completed_at`, emite evento.  
    - `Payment.status` permanece `processing` até webhook confirmar `succeeded`.  
  - `list_available_trips(db, driver_id)`  
    - Só permite drivers com `DriverStatus.approved`.  
    - Devolve todas as trips com `status == assigned`.

- **Endpoints (API)**  
  - Passageiro (`passenger_trips.py`):  
    - `POST /trips`  
      - Requer JWT com `role=passenger`.  
      - Body: `TripCreateRequest` (lat/lng origem/destino).  
      - Chama `create_trip`, devolve `TripCreateResponse` com `trip_id`, `status`, `estimated_price`, `eta`.  
    - `POST /trips/{trip_id}/cancel`  
      - Requer JWT com `role=passenger`.  
      - Chama `cancel_trip_by_passenger`.  
  - Driver (`driver_trips.py`):  
    - `GET /driver/trips/available`  
      - Requer `role=driver`.  
      - Lista trips `assigned` convertidas em `TripAvailableItem`.  
    - `POST /driver/trips/{trip_id}/accept`  
      - Requer `role=driver`.  
      - Chama `accept_trip` (Stripe + Payment + trip accepted).  
    - `POST /driver/trips/{trip_id}/arriving`  
      - Requer `role=driver`.  
      - Chama `mark_trip_arriving`.  
    - `POST /driver/trips/{trip_id}/start`  
      - Requer `role=driver`.  
      - Chama `start_trip`.  
    - `POST /driver/trips/{trip_id}/complete`  
      - Requer `role=driver`.  
      - Body: `TripCompletionRequest` (final_price, atualmente ignorado).  
      - Chama `complete_trip` (captura Stripe).  
    - `POST /driver/trips/{trip_id}/cancel`  
      - Requer `role=driver`.  
      - Chama `cancel_trip_by_driver`.  
  - Admin (`admin.py`):  
    - `POST /admin/trips/{trip_id}/assign`  
      - Requer `role=admin`.  
      - Chama `assign_trip`.  
    - Endpoints de `approve_driver`, `reject_driver` e `list_active_trips` ainda são `501 Not Implemented`.

### 3. Pagamentos (Stripe)
- **Modelo `Payment`**  
  - Campos: `id`, `trip_id`, `total_amount`, `commission_amount`, `driver_amount`, `currency`, `status`, `stripe_payment_intent_id`, `authorization_expires_at`, `created_at`, `updated_at`.  
  - Status: `pending`, `processing`, `succeeded`, `failed`.  
  - Criado no `accept_trip` (não no `complete_trip`).

- **Stripe service (`services/stripe_service.py`)**  
  - `create_authorization_payment_intent(amount_cents, currency, metadata)` – PaymentIntent com `capture_method="manual"`.  
  - `capture_payment_intent(payment_intent_id)` – captura autorização.  
  - `confirm_payment_intent_with_test_card(payment_intent_id)` – em dev, confirma com cartão 4242... para passar a `requires_capture`.  
  - `update_payment_intent_amount` – reservado para ajuste de valor final futuro.

- **Webhook (`api/routers/webhooks/stripe.py`)**  
  - `POST /webhooks/stripe`  
  - Valida assinatura com `STRIPE_WEBHOOK_SECRET` (obrigatório).  
  - Trata `payment_intent.succeeded` → `Payment.status = succeeded`.  
  - Trata `payment_intent.payment_failed` → `Payment.status = failed`.  
  - Idempotente: se já estiver no estado correto, não altera e retorna 200.

### 4. Eventos, auditoria e realtime
- **Esquema de eventos**  
  - `TripStatusChangedEvent` (Pydantic) com:  
    - `event = "trip.status_changed"`  
    - `trip_id`, `status`, `timestamp`  
  - Gerado sempre que o estado da trip muda nas funções de serviço (`create`, `cancel`, `assign`, `accept`, `mark_arriving`, `start`, `complete`).

- **Dispatcher (`events/dispatcher.py`)**  
  - Interface `EventProtocol` (Protocol) com `.event` e `.model_dump()`.  
  - `_event_to_audit_payload` usa `model_dump(mode="json")` para garantir payload JSON‑serializável.  
  - `_event_entity` mapeia `TripStatusChangedEvent` para `("trip", trip_id)`.  
  - `emit(event)` faz:  
    1. Persistência em `audit_events`:  
       - Cria `AuditEvent` com `event_type`, `entity_type`, `entity_id`, `payload`, `occurred_at`.  
       - Usa `SessionLocal()` interno e `commit`.  
       - Em erro, faz `logger.exception("Failed to persist audit event")` e retorna (não quebra o request).  
    2. Publicação realtime:  
       - Chama `hub.publish(event)` e `admin_hub.publish(event)` se o evento for `TripStatusChangedEvent`.  
       - Em erro, faz `logger.exception("Failed to publish realtime event")`.

- **Realtime WebSockets**  
  - `realtime/hub.py`  
    - Mantém subscrições `trip_id -> set(WebSocket)`.  
    - `publish` cria uma task assíncrona `_broadcast` que envia JSON:  
      `{"trip_id", "status", "timestamp"}`.  
  - `realtime/admin_hub.py`  
    - Mantém um conjunto de WebSockets de admin.  
    - Publica os mesmos eventos de estado de trips para todos os admins conectados.  
  - Rotas WS:  
    - `/ws/trips/{trip_id}` (`ws.py`):  
      - Extrai token do header ou query string.  
      - Decodifica JWT, valida `User` ativo.  
      - Valida que o utilizador é `passenger` ou `driver` daquela trip.  
      - Subscreve ao `hub` e mantém a ligação até o cliente fechar.  
    - `/ws/admin/trips` (`admin_ws.py`):  
      - Exige JWT de utilizador `role=admin` e `status=active`.  
      - Subscreve ao `admin_hub` e recebe todos os eventos de trip.  
    - `realtime.py` (reservado):  
      - `/trips/{trip_id}` e `/driver/trips/{trip_id}` atualmente fecham imediatamente com `Not implemented` (serão usados para tracking de localização).

### 5. Configuração, startup e Swagger
- **Startup (`app/main.py`)**  
  - Carrega `.env` de `backend/.env` usando `python-dotenv`.  
  - Cria `app = FastAPI(...)`.  
  - Substitui `app.openapi` por `custom_openapi` que:  
    - Gera o schema com `get_openapi`.  
    - Ajusta o esquema `securitySchemes.BearerAuth` para ter:  
      - `bearerFormat = "JWT"`  
      - `description = 'Paste: "Bearer <token>"'`.  
  - Evento `startup`:  
    - Imprime `ENGINE URL` (útil para debugging).  
    - Executa `Base.metadata.create_all(bind=engine)` para criar tabelas.  
    - **Decisão:** Manter `create_all` em dev (sem Alembic). Se alterares modelos, pode ser preciso `ALTER TABLE` manual ou recriar container. Reavaliar migrations (ex.: Alembic) quando fores para staging/produção.
- **Swagger / Security**  
  - Em `api/deps.py`, `HTTPBearer(scheme_name="BearerAuth")` faz com que apareça **um único** esquema Bearer na UI.  
  - O botão **Authorize** aceita diretamente `Bearer <token>` gerado pelo `/auth/otp/verify`.

### 6. Variáveis de ambiente (.env)
Exemplo atual de `.env` em `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg2://ride:ride@localhost:5432/ride_db

JWT_SECRET_KEY=dev-secret-super-inseguro-muito-maior-123
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_MINUTES=60

OTP_SECRET=dev-otp-secret
OTP_EXPIRATION_MINUTES=5

ENV=dev

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...   # Obtido via: stripe listen --forward-to localhost:8000/webhooks/stripe
```

- `DATABASE_URL` é obrigatória; `SessionLocal` lança erro claro se faltar.  
- `ENV=dev` é usada para OTP no terminal e confirmação automática de PaymentIntent com cartão de teste.  
- `STRIPE_WEBHOOK_SECRET` obrigatório para o webhook; em dev obter via Stripe CLI.  
- Valores de `JWT_SECRET_KEY`, `OTP_SECRET` e `STRIPE_SECRET_KEY` devem ser trocados por segredos reais em produção.

### 7. Resumo: o que está pronto vs. o que falta
- **Pronto e validado (com testes manuais e DB)**  
  - OTP login completo em dev (request → verify → JWT).  
  - Autorização Bearer simples em todas as rotas protegidas.  
  - Criação de trips como passageiro (estado `requested`).  
  - Cancelamento de trips (passageiro/driver) com regras de estado.  
  - Admin `assign` de trips (`requested -> assigned`).  
  - Fluxo completo de driver: `accept` → `arriving` → `start` → `complete`.  
  - Stripe: autorização no accept, captura no complete, webhook idempotente.  
  - Auditoria de mudanças de estado em `audit_events` (confirmado no Postgres).  
  - WebSockets de status de trip (`/ws/trips/{trip_id}` e `/ws/admin/trips`).

- **Por implementar nas próximas fases**  
  - Gestão de drivers no admin:  
    - Criar/atualizar `Driver`, aprovar/rejeitar (`DriverStatus`).  
    - Endpoint para listar trips ativas para monitorização.  
  - Cálculo real de `estimated_price` e uso de `final_price` no complete.  
  - Stripe Connect (parceiros A).  
  - Ratings e histórico detalhado para passageiro/driver.  
  - Realtime de localização (provavelmente usando `DriverLocationEvent` e rotas WS específicas).
