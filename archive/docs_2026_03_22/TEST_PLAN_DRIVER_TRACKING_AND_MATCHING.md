## TVDE – Test Plan: Driver Tracking & Matching

Este documento foca‑se **apenas** em como testar, o que correr, e quais os resultados esperados para a nova pipeline de:

- tracking de localização de motorista
- endpoint de tracking para passageiro
- serviço/endpoint de matching geográfico básico

Sem necessidade de procurar noutros sítios; tudo o que é relevante para testes está aqui.

---

## 1. Pré‑requisitos

- **Postgres** a correr (exemplo usado):

```bash
cd c:\dev\APP\backend
docker start ride_postgres
docker ps  # confirmar container ride_postgres a correr
```

- **Backend** da API a correr (local ou Render). Para testes locais:

```bash
cd c:\dev\APP\backend
uvicorn app.main:app --reload
```

- **Web‑app** já deployada (Render) ou em dev:

```bash
cd c:\dev\APP\web-app
npm install
npm run dev
```

- **Utilizadores de teste existentes** (já usados no projeto):
  - 1 utilizador com role `driver` (para testes end‑to‑end).
  - 1 utilizador com role `passenger`.

Se precisares de criar mais utilizadores, segue os fluxos já existentes de signup/login; não é necessário nada especial para estes testes.

---

## 2. Testes Automatizados – Backend (pytest)

### 2.1. Suite completa de backend

Com Postgres a correr:

```bash
cd c:\dev\APP
pytest backend/tests -q
```

**Resultado esperado:**

```text
................                                                         [100%]
16 passed in ~0.3s
```

Isto valida:

- Endpoints admin básicos (health/metrics/cancel trip – apenas auth).
- Nova pipeline de localização:
  - `POST /drivers/location`
  - `GET /trips/{trip_id}/driver-location`
- Matching:
  - `POST /matching/find-driver`

### 2.2. Foco só nos novos testes

Se quiseres correr apenas a parte desta fase:

```bash
cd c:\dev\APP
pytest backend/tests/test_driver_location.py backend/tests/test_driver_tracking.py backend/tests/test_matching.py -q
```

**Resultado esperado:**

```text
...........                                                              [100%]
11 passed in ~0.2s
```

---

## 3. Testes Detalhados por Endpoint (Backend)

### 3.1. `POST /drivers/location`

Coberto por `backend/tests/test_driver_location.py`.

#### Caso 1 – Atualização válida

- Condição:
  - Driver autenticado (role `driver`).
  - Body:

```json
{
  "lat": 40.0,
  "lng": -8.0,
  "timestamp": 1700000000000
}
```

- Esperado:
  - `status_code == 204`
  - Na DB (tabela `driver_locations`):
    - 1 linha para `driver_id` correspondente.
    - `lat == 40.0`
    - `lng == -8.0`
    - `timestamp` ≈ agora (UTC).

#### Caso 2 – Latitude inválida

- Body:

```json
{
  "lat": 100.0,
  "lng": -8.0,
  "timestamp": 1700000000000
}
```

- Esperado:
  - `status_code == 422` (Pydantic rejeita latitude fora de [-90, 90]).

#### Caso 3 – Longitude inválida

- Body:

```json
{
  "lat": 40.0,
  "lng": -200.0,
  "timestamp": 1700000000000
}
```

- Esperado:
  - `status_code == 422` (Pydantic rejeita longitude fora de [-180, 180]).

#### Caso 4 – Timestamp inválido

- Body:

```json
{
  "lat": 40.0,
  "lng": -8.0,
  "timestamp": (Date.now() - 2 * 60 * 60 * 1000)
}
```

- Esperado:
  - Passa a validação Pydantic.
  - No service `upsert_driver_location`, é rejeitado por estar fora de ±1h.
  - `status_code == 400`
  - `detail == "invalid_timestamp"`.

---

### 3.2. `GET /trips/{trip_id}/driver-location`

Coberto por `backend/tests/test_driver_tracking.py`.

#### Caso 1 – Passageiro dono da viagem

- Setup:
  - Criada `Trip` com:
    - `passenger_id = P`
    - `driver_id = D`
    - `status` ∈ {`accepted`,`arriving`,`ongoing`}
  - Existe `DriverLocation` para `D`.
  - Request autenticada como `P` (role `passenger`).

- Esperado:

```http
GET /trips/{trip_id}/driver-location
```

- `status_code == 200`
- Body:

```json
{
  "lat": 40.0,
  "lng": -8.0,
  "timestamp": 1700000000000
}
```

`timestamp` é em ms desde epoch (int).

#### Caso 2 – Driver atribuído à viagem

- Mesmo trip de cima.
- Request autenticada como `D` (role `driver`).
- Esperado:
  - `status_code == 200`
  - Estrutura igual ao Caso 1.

#### Caso 3 – Outro passageiro

- Outro `User` com role `passenger`, não dono da trip.
- Esperado:
  - `status_code == 403`
  - `detail == "forbidden_trip_access"`.

#### Caso 4 – `trip_id` inválido

- `trip_id` inexistente.
- Esperado:
  - `status_code == 404`
  - `detail == "trip_not_found"`.

---

### 3.3. `POST /matching/find-driver`

Coberto por `backend/tests/test_matching.py`.

#### Caso 1 – Sem drivers

- Tabela `driver_locations` vazia.
- Request:

```json
{
  "lat": 40.0,
  "lng": -8.0
}
```

- Esperado:
  - `status_code == 404`
  - `detail == "no_driver_found"`.

#### Caso 2 – Um único driver

- Um `DriverLocation` em `(40.0, -8.0)`.
- Mesmo request acima.
- Esperado:
  - `status_code == 200`
  - Body:

```json
{
  "driver_id": "<uuid>",
  "lat": 40.0,
  "lng": -8.0,
  "distance_km": ~0.0
}
```

#### Caso 3 – Vários drivers

- Registos:
  - `D1` em `(40.0, -8.0)` (perto).
  - `D2` em `(41.0, -9.0)` (longe).
- Request:

```json
{
  "lat": 40.0,
  "lng": -8.0
}
```

- Esperado:
  - `status_code == 200`
  - `distance_km < 5.0` (driver mais próximo).
  - O driver devolvido corresponde ao mais perto (não há assert directo de `driver_id` no teste, só distância).

---

## 4. Script de Integração `scripts/test_endpoints.py`

### 4.1. Variáveis de ambiente usadas

O script usa as seguintes variáveis (todas já definidas no código; não precisas inventar nomes):

- `TEST_API_URL` – URL base da API (por ex. `http://localhost:8000` ou URL do Render).
- `TEST_DRIVER_EMAIL` – email do driver de teste.
- `TEST_DRIVER_PASSWORD` – password correspondente.
- `TEST_PASSENGER_EMAIL` – email do passageiro de teste.
- `TEST_PASSENGER_PASSWORD` – password correspondente.

Exemplo em PowerShell:

```powershell
cd c:\dev\APP
$env:TEST_API_URL = "http://localhost:8000"
$env:TEST_DRIVER_EMAIL = "driver@test.local"
$env:TEST_DRIVER_PASSWORD = "password"
$env:TEST_PASSENGER_EMAIL = "passenger@test.local"
$env:TEST_PASSENGER_PASSWORD = "password"
python scripts/test_endpoints.py
```

### 4.2. Passos que o script executa

1. **Autentica driver** → `POST /auth/login`
   - Esperado: `200`, body contém `access_token`.

2. **Envia localização do driver** → `POST /drivers/location`
   - Esperado: `204 No Content`.
   - Em consola: algo como  
     `/drivers/location -> 204 ...`

3. **Autentica passageiro** → `POST /auth/login`
   - Esperado: `200`.

4. **Cria trip de teste** → `POST /trips`
   - Body com coordenadas tipo Lisboa (já no script).
   - Esperado: `200` ou `201` (consoante implementação atual).
   - Body contém `trip_id`.

5. **Vai buscar localização do motorista** → `GET /trips/{trip_id}/driver-location`
   - Esperado: `200`.
   - Body com `{ lat, lng, timestamp }`.

6. **Matching mais próximo** → `POST /matching/find-driver`
   - Esperado: `200` com `{ driver_id, lat, lng, distance_km }`.

Se algum passo falhar (4xx/5xx), o script mostra o `status_code` e o `text` da resposta na consola, o que ajuda a perceber rapidamente onde está a quebra.

---

## 5. Testes Manuais via UI (Render ou Dev)

### 5.1. Motorista – Tracking

1. Abrir a web‑app (Render ou `npm run dev`).
2. Autenticar como driver.
3. No dashboard do motorista:
   - Estado `Disponível` (toggle ligado).
   - Confirmar que o mapa aparece com marcador do motorista:
     - Marcador maior (`DriverMarker`) com cor de `accent` e movimento suave.
4. Mover fisicamente (em telemóvel real) ou simular localização no browser devtools.
5. Esperado:
   - A cada ~3s, a posição no mapa atualiza.
   - No backend, tabela `driver_locations` reflete novas coordenadas.

### 5.2. Passageiro – Tracking + Rota

1. Autenticar como passageiro.
2. Pedir uma viagem (`Pedir viagem`).
3. Quando a viagem estiver em estado ativo (assigned/accepted/...):
   - O `StatusHeader` mostra estado atual (`À procura`, `A caminho`, etc.).
   - O **mapa** mostra:
     - Marcador do passageiro com halo pulsante.
     - Marcador do motorista a movimentar‑se (se houver updates de localização reais).
     - Rota desenhada com cor de accent (via OSRM) entre origem/destino.

4. Verificar no `ActivityPanel`:
   - Logs de ações (pedido, aceitação, etc.) continuam coerentes.

---

## 6. Resumo Rápido – “Checklist”

- [x] `pytest backend/tests -q` → **16 passed**.
- [x] `python -m compileall backend/app` → sem erros.
- [x] `npm run build` em `web-app` → sem erros.
- [x] `scripts/test_endpoints.py` com `TEST_*` devidamente configuradas:
  - `/drivers/location -> 204`
  - `/trips -> 200/201` com `trip_id`
  - `/trips/{trip_id}/driver-location -> 200`
  - `/matching/find-driver -> 200`
- [x] UI:
  - Motorista online → marcador atualiza.
  - Passageiro com viagem ativa → vê movimento + rota no mapa.
