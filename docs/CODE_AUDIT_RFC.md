# RFC — Code Audit (circuito lógico + correções propostas)

Objetivo: criar uma estrutura mental do sistema (camadas + domínios), identificar riscos/fragilidades e listar correções propostas **sem as aplicar ainda**.

Este RFC está pensado para ser lido “de cima para baixo”:

- primeiro mapa (onde vive o quê e como encaixa),
- depois os circuitos críticos end‑to‑end,
- depois a lista de correções propostas (com risco/validação),
- e por fim uma ordem de execução recomendada.

---

## TL;DR (executivo)

- **Arquitetura está clara e relativamente modular por domínio** (routers → services → models/schemas), com algumas exceções por pragmatismo (ex.: auto‑dispatch em `driver_location`).
- **Realtime no `web-app` é predominantemente polling**; o backend tem WebSockets para alguns streams, mas o cliente web usa polling como “fonte de verdade”.
- **Pontos de risco mais relevantes** (sem refactor):
  - **Eventos/audit fora da transação principal** (`backend/app/events/dispatcher.py`) → risco de audit “adiantado” vs DB state.
  - **Mistura de domínios**: `upsert_driver_location(...)` faz tracking + (em beta) dispatch/estado de trip.
  - **Cron secret em query string** (`/cron/jobs?secret=...`) → risco de leak (logs/proxies).
  - **Matching/dispatch com loops + Haversine em Python** → risco de performance quando crescer.
  - **Estado “optimistic vs polled” no frontend** (passenger/driver) → edge cases de corrida (já mitigados, mas ainda sensíveis).

---

## Mapa por camadas (design “estrutural”)

### Backend (FastAPI)

- **Entry point + wiring**: `backend/app/main.py`
  - monta routers + middleware (`RequestIDMiddleware`) + CORS + lifespan logs.
- **Routers (contrato HTTP)**: `backend/app/api/routers/*`
  - delegam para services; aplicam RBAC via `require_role(...)` / `get_current_partner(...)`.
- **Services (domínio + regras)**: `backend/app/services/*`
  - regras de negócio, transações, dispatch, Stripe, queries partner/admin.
- **DB models + session**: `backend/app/db/models/*`, `backend/app/db/session.py`
- **Schemas (Pydantic)**: `backend/app/schemas/*`
- **Crosscutting**
  - **Auth deps/RBAC/tenant context**: `backend/app/api/deps.py`
  - **Logging estruturado + request_id**: `backend/app/utils/logging.py`, `backend/app/middleware/request_id.py`
  - **State machine**: `backend/app/utils/state_machine.py`
  - **Realtime**: `backend/app/realtime/*`
  - **Eventos/audit**: `backend/app/events/dispatcher.py`, `backend/app/db/models/audit_event.py`

### Frontend (`web-app`)

- **Entry + routing**: `web-app/src/main.tsx`, `web-app/src/routes/index.tsx`
- **Providers/contexts**: `web-app/src/context/*` (Auth, ActiveTrip, Logs)
- **Features** (por role): `web-app/src/features/{passenger,driver,partner,admin}/*`
- **Hooks (polling/geolocation/tracking/smoothing)**: `web-app/src/hooks/*`
- **API client + módulos**: `web-app/src/api/*` e `web-app/src/services/*`
- **Mapas**: `web-app/src/maps/*`
- **Dev/demo/mocks**: `web-app/src/dev/*`

### Tools/Ops

- **Runner**: `tools/api_runner/runner.py` + `tools/api_runner/flows/*.json` + `tools/api_runner/session.json` (runtime)
- **Cron batch**: `backend/app/api/routers/cron.py` (exec timeouts/expiry/cleanup/health)
- **Scripts**: `scripts/*` (inclui “footguns” que reescrevem `.env`)
- **CI**: `.github/workflows/*`

---

## Routers e “fronteiras” (backend)

Routers montados em `backend/app/main.py` (principais):

- `GET /`, `GET /health`, `GET /config`: `backend/app/api/routers/health.py`
- `/auth/*`: `backend/app/api/routers/auth.py`
- `/trips/*` (passenger): `backend/app/api/routers/passenger_trips.py`
- `/driver/trips/*`: `backend/app/api/routers/driver_trips.py`
- `/driver/offers/*`: `backend/app/api/routers/driver_offers.py`
- `/driver/status/*`: `backend/app/api/routers/driver_status.py`
- `POST /drivers/location` + alias `POST /driver/location`: `backend/app/api/routers/drivers.py`
- `/partner/*`: `backend/app/api/routers/partner.py`
- `/admin/*`: `backend/app/api/routers/admin.py`
- `WS /ws/*`: `backend/app/api/routers/ws.py`, `backend/app/api/routers/admin_ws.py`
- `POST /webhooks/stripe`: `backend/app/api/routers/webhooks/stripe.py`
- `GET /cron/jobs?secret=...`: `backend/app/api/routers/cron.py`

Tenant scope e RBAC:

```23:148:c:\dev\APP\backend\app\api\deps.py
class UserContext(BaseModel):
    """Session context. partner_id is derived from DB (driver.partner_id or user.partner_org_id)."""
...
async def get_current_user(...):
    ...
    if user.role == Role.driver and user.driver_profile is not None:
        partner_scope = str(user.driver_profile.partner_id)
    elif user.role == Role.partner and user.partner_org_id is not None:
        partner_scope = str(user.partner_org_id)
...
async def get_current_partner(...):
    """Partner-only: must have role partner and a resolved tenant (partner_org_id)."""
```

---

## Circuitos críticos (end‑to‑end)

### Circuito 1 — Passenger “pedir viagem” → oferta/assign → driver aceita → tracking → completar

```mermaid
flowchart TD
  PassengerUI[PassengerDashboard] -->|POST /trips| TripsRouter[passenger_trips.py]
  TripsRouter --> TripsServiceCreate[services/trips.create_trip]
  TripsServiceCreate --> OfferDispatch[services/offer_dispatch.create_offers_for_trip]
  OfferDispatch --> DBTrips[(Trip, TripOffer, DriverLocation)]
  DriverUI[DriverDashboard] -->|poll available| DriverTripsRouter[driver_trips.py]
  DriverUI -->|accept| DriverTripsRouter
  DriverTripsRouter --> TripsServiceAccept[services/trips.accept_trip_or_accept_offer]
  TripsServiceAccept --> Stripe[services/stripe_service]
  TripsServiceAccept --> DBPayments[(Payment)]
  DriverUI -->|POST /drivers/location| DriverLocRouter[drivers.py]
  DriverLocRouter --> DriverLocService[services/driver_location.upsert_driver_location]
  DriverLocService --> RealtimeHub[realtime/hub.publish_driver_location]
  PassengerUI -->|poll /trips/{id}/driver-location| TrackingService[web-app/services/trackingService]
  TripsServiceAccept --> Events[events/dispatcher.emit]
  Events --> Audit[(AuditEvent)]
```

Observações:

- `accept_trip` é atomicamente desenhado (lock + PI + Payment + state change + commit + emit).

```547:701:c:\dev\APP\backend\app\services\trips.py
def accept_trip(...):
    """Accept trip with atomic payment authorization.
    Order of operations (atomic):
    1. Lock trip row (FOR UPDATE) ...
    5. Create Stripe PaymentIntent ...
    8. Single commit
    9. Emit event
    """
```

- O tracking driver→passenger é **polling** no `web-app`, apesar do backend ter hubs WS.

### Circuito 2 — Driver location: tracking + (beta) auto‑dispatch

`upsert_driver_location(...)` faz:

1. valida coordenadas/timestamp,
2. upsert na tabela `driver_locations`,
3. se houver trip ativa: publica event realtime,
4. se `BETA_MODE`: pode auto‑assign de um `Trip(requested)` sem offers,
5. commit.

```55:205:c:\dev\APP\backend\app\services\driver_location.py
def upsert_driver_location(...):
    ...
    if active_trip:
        ...
        hub.publish_driver_location(...)
    ...
    if beta_mode and getattr(driver, "is_available", True):
        ... Trip.status = TripStatus.assigned ...
    db.commit()
```

Isto é um ponto de “mistura de domínios” (tracking + dispatch) a ser decidido conscientemente.

### Circuito 3 — Eventos/audit e o risco de “fora da transação”

O `emit(...)` atual:

- abre uma **SessionLocal própria**,
- persiste `AuditEvent` e commita,
- e só depois publica realtime.

```32:58:c:\dev\APP\backend\app\events\dispatcher.py
def emit(event: TripStatusChangedEvent) -> None:
    ...
    with SessionLocal() as db:
        audit_event = AuditEvent(...)
        db.add(audit_event)
        db.commit()
    ...
    hub.publish(event)
    admin_hub.publish(event)
```

Risco: o audit pode existir mesmo se a transação do request (trip/payment) falhar depois (ou vice‑versa).

### Circuito 4 — Cron batch (timeouts/expiry/cleanup/health)

`GET /cron/jobs?secret=...` executa um batch (timeouts + expire + redispatch + cleanup + health snapshot).

Risco: secret na query string (logs/proxies) + endpoint sem JWT.

---

## Correções propostas (sem aplicar ainda)

Formato:

- **Problema**
- **Impacto**
- **Proposta (mudança mínima)**
- **Risco de mudança**
- **Validação**
- **Ficheiros**

### R1 — Audit/evento fora da transação principal

- **Problema**: `emit(...)` persiste `AuditEvent` com `SessionLocal()` separada (fora do `db` do request).
- **Impacto**: observabilidade enganadora (audit “adiantado” ou “atrasado” vs estado real), dificuldade em debug de corridas.
- **Proposta** (mínima):
  - opção A: permitir `emit(..., db: Session | None)` e, quando houver `db` do request, persistir audit no mesmo `db` (sem commit extra).
  - opção B: persistir audit **após** commit principal mas usando um “outbox” simples (mais trabalho).
- **Risco**: médio (toca infra de eventos).
- **Validação**:
  - testes: falhar uma transação em `accept_trip` e garantir que audit não é gravado antes do rollback.
  - confirmar que WS continua a publicar como antes.
- **Ficheiros**: `backend/app/events/dispatcher.py`, callers em `backend/app/services/trips.py` etc.

### R2 — Mistura tracking + dispatch em `upsert_driver_location`

- **Problema**: endpoint de tracking faz mudanças de estado (`Trip.requested → assigned`) em BETA.
- **Impacto**: efeitos colaterais inesperados; difícil raciocinar “o que muda trips”.
- **Proposta** (mínima):
  - mover o bloco “beta auto-dispatch” para `offer_dispatch`/`trip_timeouts`/cron, ou para um endpoint dev explícito;
  - manter a lógica, mas “isolar” num service separado e chamar apenas em job, não no tracking.
- **Risco**: médio‑alto (pode alterar comportamento em dev/beta).
- **Validação**:
  - testar “zero offers” flow: driver envia location → trip é atribuída por job (não por tracking) dentro de janela aceitável.
- **Ficheiros**: `backend/app/services/driver_location.py`, `backend/app/services/offer_dispatch.py`, `backend/app/api/routers/cron.py`.

### R3 — Cron secret em query string

- **Problema**: `/cron/jobs?secret=...` → leak em logs e ferramentas.
- **Impacto**: segurança (segredo exposto).
- **Proposta** (mínima):
  - aceitar também header `X-Cron-Secret` (mantendo compat com query param por agora),
  - documentar para usar header no Render Cron/Jobs (ou Render cron service).
- **Risco**: baixo (backwards compatible).
- **Validação**:
  - request sem secret → 401/503 como antes
  - request com header → 200
- **Ficheiros**: `backend/app/api/routers/cron.py`, docs cron.

### R4 — Rate limit em memória (não escala)

- **Problema**: rate limit in‑process (`api/rate_limit.py`) não funciona com multi‑instância.
- **Impacto**: segurança/abuso.
- **Proposta**:
  - curto prazo: explicitar que é “best‑effort” e limitar endpoints críticos por IP/phone no reverse proxy (Render/Cloudflare) quando possível;
  - médio prazo: Redis/DB based.
- **Risco**: baixo (documental) / médio (se trocar implementação).
- **Ficheiros**: `backend/app/api/rate_limit.py`, `backend/app/api/routers/auth.py`.

### R5 — Matching/dispatch performance (loops + Haversine em Python)

- **Problema**: `matching.py` e partes de `offer_dispatch.py` varrem muita coisa e calculam distâncias em Python.
- **Impacto**: degrada rápido com volume (N drivers \* M trips).
- **Proposta** (mínima incremental):
  - adicionar filtros: freshness de location, `Driver.is_available`, `Driver.status`, limitar N candidatos cedo;
  - mover cálculo para SQL (PostGIS) numa fase futura (avançado).
- **Risco**: médio (pode alterar quem recebe offers).
- **Validação**:
  - testes de matching existentes + cenários com drivers stale.
- **Ficheiros**: `backend/app/services/matching.py`, `backend/app/services/offer_dispatch.py`.

### R6 — Estado optimistic vs polled no frontend (edge cases)

- **Problema**: passenger e driver usam merges de snapshots otimistas com polling.
- **Impacto**: glitches/oscilações raras, especialmente em rede móvel/cold start.
- **Proposta** (mínima):
  - normalizar “ranked state machine” para merge (já existe em `constants/tripStatus.ts`) e garantir que todos os merges usam ranking consistente;
  - documentar invariantes: “UI nunca retrocede status”.
- **Risco**: baixo‑médio.
- **Validação**:
  - testes RTL/vitest para merges + e2e flow.
- **Ficheiros**: `web-app/src/features/passenger/PassengerDashboard.tsx`, `web-app/src/features/driver/DriverDashboard.tsx`, `web-app/src/constants/tripStatus.ts`.

### R7 — Dev tools / scripts como superfície de ataque (ops)

- **Problema**: vários scripts dependem de `/dev/*` (seed/tokens/reset) e há footguns que reescrevem `.env`.
- **Impacto**: se `ENABLE_DEV_TOOLS` vazar para ambiente exposto, é crítico.
- **Proposta**:
  - hard gate em produção: `dev_tools_router_enabled()` deve ser impossível em prod (mesmo com env errada) OU exigir secret adicional;
  - marcar scripts “dangerous” com nomes/guards e garantir `.env` tooling não ativa dev tools por default.
- **Risco**: médio (pode afetar workflows dev).
- **Validação**:
  - garantir que em prod `GET /dev/*` dá 404/403 sempre.
- **Ficheiros**: `backend/app/api/routers/dev_tools.py`, `backend/app/core/config.py`, `scripts/*`.

---

## Ordem recomendada (para correções futuras)

1. **Segurança/ops sem risco de produto**: R3 (cron header), R7 (dev tools hard gate)
2. **Determinismo/observabilidade**: R1 (audit/emit transacional)
3. **Separação de domínios**: R2 (auto‑dispatch fora do tracking)
4. **Escalabilidade**: R5 (filtros/limites no dispatch/matching)
5. **UX/realtime**: R6 (harmonizar merges + testes)

---

## Apêndice — notas de hardening já implementadas (snapshot)

- **Render hardening**: migrations removidas do startup + `/health` com DB ping (PR separado).
- **API client cold start**: `withColdStartRetries(...)` no `web-app/src/api/client.ts`.

```104:125:c:\dev\APP\web-app\src\api\client.ts
export async function withColdStartRetries<T>(fn: (timeoutMs: number) => Promise<T>): Promise<T> {
  const delaysBeforeAttempt = [0, 0, 2000, 5000]
  ...
}
```
