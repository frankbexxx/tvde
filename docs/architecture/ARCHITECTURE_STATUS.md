# TVDE — Estado Técnico Atual (2026‑03‑12)

## 1. Arquitetura

- **Frontend (web-app)**
  - React + Vite + TypeScript.
  - Mapas com **MapLibre GL** usando tiles da **MapTiler**:
    - Estilo: `streets-v2`.
    - Chave de API via `VITE_MAPTILER_KEY`.
  - Contextos principais:
    - `AuthContext` (tokens BETA por role, leitura de `/config`).
    - `ActiveTripContext` (trip ativa de passenger/driver).
    - `ActivityLogContext` (log de eventos na UI).

- **Backend (tvde-api)**
  - FastAPI + SQLAlchemy.
  - Postgres na Render:
    - `tvde-db` (`ride_db_wypz`).
    - Acesso local via `DATABASE_URL` externo (Render) no `backend/.env`.
  - Services:
    - `trips.py` — criação, atribuição, estados da viagem, pagamentos.
    - `driver_location.py` — tracking de localização do motorista + auto-dispatch.
    - `matching.py` — matching geográfico MVP com `driver_locations`.
  - Routers:
    - `passenger_trips.py`, `driver_trips.py`, `drivers.py`, `matching.py`, `admin.py`, `dev_tools.py`, `debug_routes.py`.

- **Serviços Render**
  - `tvde-db`: Postgres (Internal + External Database URL).
  - `tvde-api-fd2z`: backend FastAPI.
  - `tvde-app-j51f`: static site (Vite build).

---

## 2. Estado do Backend

- **Configuração**
  - `ENV=dev` (no `.env` local; Render usa ENV=production).
  - `BETA_MODE=True` na Render (modo BETA ativo).
  - `DATABASE_URL` local = External URL da Render → mesma BD em ambos.

- **Trips**
  - Tabela `trips` contém:
    - Várias trips em `assigned` com `driver_id=NULL` (pool de viagens disponíveis).
    - Trips antigas em `accepted`/`cancelled` (histórico).
  - `create_trip`:
    - Cria trip com `status=requested`.
    - Procura `Driver(status=approved, is_available=True)`:
      - Se encontrar → `status=assigned` (auto-dispatch imediato).
      - Caso contrário → permanece `requested`.
    - Agora loga:
      - `create_trip: auto-assigning trip to pool ...`
      - ou `create_trip: no available driver at request time ...`.

- **Driver tracking (`driver_location.py`)**
  - `upsert_driver_location`:
    - Garante `Driver` via `_ensure_driver_profile`:
      - Em BETA, se não existir, cria `Driver(approved, commission=15, is_available=True)`.
    - Valida lat/lng/timestamp.
    - Upsert em `driver_locations`.
    - Se `BETA_MODE=True` e `driver.is_available=True`:
      - Procura a trip mais antiga em `status=requested`.
      - Se encontrar:
        - `trip.status = assigned` (auto-dispatch).
        - Loga: `upsert_driver_location: auto-dispatch trip {...}`.
      - Senão:
        - Loga: `upsert_driver_location: no requested trips to assign {...}`.

  - `get_driver_location_for_trip`:
    - Valida que a trip existe.
    - Em BETA:
      - Permite acesso se `user_id` == `trip.passenger_id` **ou** `trip.driver_id`.
      - Bloqueia terceiros com `403 forbidden_trip_access` (loga detalhe).
    - Exige:
      - `trip.driver_id` não nulo (`404 driver_not_assigned` se faltar).
      - `trip.status` ∈ {`accepted`, `arriving`, `ongoing`} (`409 trip_not_active_for_location_*` se não).
      - Linha correspondente em `driver_locations` (`404 driver_location_not_found` se faltar).
    - Logs detalhados para cada caso (`trip_not_found`, forbidden, `driver_not_assigned`, etc.).

- **Driver trips (`driver_trips.py` + `trips.py`)**
  - `list_available_trips`:
    - Exige `Driver(user_id=driver_id, status=approved)`.
    - Se `!is_available` → retorna `[]` e loga `driver not available`.
    - Caso contrário, lê trips com `status=assigned` e loga `trip_count`.
  - `accept_trip`:
    - Requer `trip.status == assigned`, `trip.driver_id is NULL`, `Driver.is_available`.
    - Cria `Payment` com Stripe PaymentIntent em modo autorização.
    - Atualiza trip:
      - `trip.driver_id = driver_id`
      - `trip.status = accepted`
      - `driver.is_available = False`.

---

## 3. Estado do Frontend

- **MapView (`web-app/src/maps/MapView.tsx`)**
  - Usa `MapLibre` com estilo condicional:
    - Se `VITE_MAPTILER_KEY` definido:
      - `https://api.maptiler.com/maps/streets-v2/style.json?key=${VITE_MAPTILER_KEY}`.
    - Caso contrário:
      - `https://demotiles.maplibre.org/style.json` (fallback).
  - Marca:
    - `PassengerMarker` na localização do passageiro.
    - `DriverMarker` na última `driverLocation`.
    - `RouteLine` com geojson vindo do OSRM (`getRoute`).

- **Dashboards**
  - Passenger:
    - Pede viagens (`POST /trips`).
    - Mostra estado textual (requested/assigned/accepted/arriving/ongoing).
    - Polling:
      - `GET /trips/{trip_id}` (detalhe).
      - `GET /trips/{trip_id}/driver-location` (tracking).
  - Driver:
    - `useGeolocation` com fallback Lisboa → `sendDriverLocation` a cada 3s.
    - Polling:
      - `GET /driver/trips/available` (viagens `assigned`).
      - `GET /driver/trips/history`.
    - Ações:
      - `accept`, `arriving`, `start`, `complete`, `cancel`.

- **Auth / BETA**
  - `/config` diz se `beta_mode` está ativo.
  - `AuthContext` em BETA:
    - Usa um único access token por login (phone + OTP / password).
    - **Papel da shell (passageiro vs motorista):** `appRouteRole` persistido (`localStorage`), definido no login e ajustável em Configuração; rotas `/passenger` e `/driver` têm *guards* que impedem cruzamento (motorista não abre UI de passageiro e vice‑versa).
    - **Admin:** em `/admin`, o token/UI de admin continua a seguir a rota (`pathname`); `role` na UI reflecte admin nessa rota.

---

## 4. Pipeline de Trips (end‑to‑end)

### 4.1 Criação e pool de viagens

1. **Passenger** faz `POST /trips`:
   - Backend `create_trip`:
     - Cria trip em `requested`.
     - Se existir driver `approved & is_available`:
       - marca a trip como `assigned`.
       - (auto-dispatch imediato).
2. Trips `assigned` passam a ser **pool global de pedidos**:
   - Visíveis em `GET /driver/trips/available` para qualquer driver `approved & is_available`.

### 4.2 Dispatch atrasado (auto-dispatch via localização)

Se não houver driver disponível no momento da criação:

1. Trip fica em `requested`.
2. Quando um driver acorda o app e começa a enviar `POST /drivers/location`:
   - `upsert_driver_location`:
     - auto-cria `Driver` se necessário (BETA).
     - se driver `is_available`:
       - pega na trip mais antiga `requested` e muda para `assigned`.
3. Essa trip passa a integrar o pool de `assigned`.

### 4.3 Aceitação e estados seguintes

1. Driver vê lista em `/driver/trips/available` (trips `assigned`).
2. Ao clicar **ACEITAR**:
   - `/driver/trips/{trip_id}/accept`:
     - valida estado `assigned`.
     - cria PaymentIntent Stripe.
     - marca:
       - `trip.driver_id = driver_id`
       - `trip.status = accepted`
       - `driver.is_available = False`.
3. Depois:
   - `/driver/trips/{trip_id}/arriving`, `/start`, `/complete`
   - atualizam `trip.status` (arriving → ongoing → completed) e preenchem distância, preço, payouts, etc.

---

## 5. Pipeline de Driver Tracking

### 5.1 Envio de localização (driver)

No **DriverDashboard**:

1. `useGeolocation`:
   - Tenta `navigator.geolocation.watchPosition`.
   - Se falhar ou demorar >5s:
     - usa fallback Lisboa (`38.7223, -9.1393`) e loga um warning.
   - Atualiza `driverLocation`.

2. `useEffect` com `driverLocation` e `offline=false`:
   - A cada 3s:
     - `sendDriverLocation(lat, lng)` → `POST /drivers/location`:
       - corpo `{ lat, lng, timestamp: Date.now() }`.

### 5.2 Persistência e dispatch (backend)

1. `POST /drivers/location`:
   - `update_location` em `drivers.py`:
     - chama `upsert_driver_location(...)`.

2. `upsert_driver_location`:
   - Garante `Driver` + valida coordenadas/timestamp.
   - Atualiza/insere em `driver_locations` (uma linha por driver).
   - Se BETA + `driver.is_available=True`:
     - auto-dispatch de uma trip `requested` para `assigned`.

### 5.3 Leitura para o passenger

1. Passenger dashboard:
   - A cada 3s (enquanto há trip ativa):
     - `GET /trips/{trip_id}/driver-location`.

2. `get_driver_location_for_trip`:
   - Valida:
     - trip existe.
     - user é passenger ou driver da trip (regra BETA).
     - `trip.driver_id` não é NULL.
     - `trip.status` ∈ {accepted, arriving, ongoing}.
     - existe `DriverLocation` para `trip.driver_id`.
   - Resposta:
     - `{ lat, lng, timestamp }`.

3. `PassengerDashboard`:
   - Atualiza `driverLocation` no estado local.
   - `MapView` reposiciona/mostra `DriverMarker` na nova posição.

---

## 6. Situação Atual (resumo)

- **Trips**
  - Passenger consegue criar trips (`status=assigned`).
  - Driver vê as trips disponíveis, aceita e conclui.
- **Tracking**
  - Driver envia localização (fallback Lisboa cobre falhas de GPS).
  - Passenger vê o ícone do motorista a piscar/mover-se no mapa.
- **Mapas**
  - Estilo base: MapTiler Streets‑v2 via `VITE_MAPTILER_KEY`.
  - Linha de rota OSRM e markers funcionam bem sobre este estilo.
