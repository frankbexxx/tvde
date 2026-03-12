# Análise de Regressão — Mapas/Geolocalização

**Objetivo:** Identificar exatamente onde a regressão foi introduzida, com dados concretos.

**Referência:** Último estado funcional = `44d78c8` (feat: ferramentas operacionais beta + docs testes + ping keep-alive).  
**Estado atual:** `HEAD` (main).

---

## 1. Commits relevantes (ordem cronológica)

### Backend services
```
17e7379 feat: add backend support for driver location tracking
d5a31d1 fix: improve driver location validation and service robustness
67d1f90 feat: add basic geographic driver matching
43e8299 test: add driver location, tracking, and matching tests
77acd07 fix: auto-create driver profile for tracking in beta
e048a78 fix: auto-dispatch requested trips when driver sends location in beta
3f8cd04 fix: relax driver location access rules in beta
```

### Backend API
```
17e7379 feat: add backend support for driver location tracking  (drivers router, passenger_trips)
```

### Web-app features
```
d91ca3c feat: add geolocation hook using browser API
1d14005 feat: add MapLibre and react-map-gl dependencies
6e9c008 feat: add MapView and map primitives using MapLibre
e7fc2e8 feat: integrate MapView into passenger dashboard
c8fef2d feat: integrate MapView into driver dashboard
824b75e feat: add driver location, tracking, and OSRM routing services
f9ae225 feat: wire driver location sending and passenger tracking polling
```

---

## 2. Diff resumido — alterações de lógica

### 2.1 `backend/app/services/trips.py`
**Nenhuma alteração** entre `44d78c8` e `HEAD`.

A lógica atual (inalterada desde o início):
- `create_trip`: se existir `Driver` com `status=approved` e `is_available=True`, trip fica `assigned`; senão fica `requested`.
- `list_available_trips`: exige `Driver` aprovado para o `driver_id`; retorna trips com `status=assigned`; se driver `is_available=False`, retorna `[]`.

### 2.2 `backend/app/services/driver_location.py`
**Ficheiro novo** (criado em `17e7379`). Não existia em `44d78c8`.

Lógica atual:
- `upsert_driver_location`: exige `Driver` para `driver_id` (ou auto-cria em BETA); valida lat/lng/timestamp; upsert em `driver_locations`; em BETA, se driver disponível, promove trip `requested` → `assigned`.
- `get_driver_location_for_trip`: exige trip existente; em BETA relaxa ownership (passenger ou driver da trip); exige `trip.driver_id` não nulo; exige `trip.status` em `accepted|arriving|ongoing`; exige linha em `driver_locations` para `trip.driver_id`.

### 2.3 `backend/app/services/matching.py`
**Ficheiro novo** (criado em `67d1f90`). Não existia em `44d78c8`.

- `find_nearest_driver`: lê `driver_locations`, calcula distância Haversine, retorna driver mais próximo. **Não está ligado ao fluxo principal** (create_trip, list_available_trips).

### 2.4 `backend/app/api/routers/passenger_trips.py`
Alterações:
- Novo endpoint `GET /trips/{trip_id}/driver-location` (chama `get_driver_location_for_trip`).
- `require_role` alterado de `Role.passenger` para `Role.passenger, Role.driver` em history, get_trip_detail, create_trip, cancel_trip.

### 2.5 `backend/app/api/routers/driver_trips.py`
**Nenhuma alteração** entre `44d78c8` e `HEAD` na lógica de `list_available_trips` ou `accept`.

---

## 3. Condição crítica — `list_available_trips`

```python
# trips.py:403-405
trips = db.execute(
    select(Trip).where(Trip.status == TripStatus.assigned)
).scalars()
```

**Só trips com `status=assigned` aparecem.**  
Trips em `requested` nunca aparecem.

**Origem de `assigned`:**
1. `create_trip`: se existir `Driver` approved + `is_available=True` no momento.
2. `upsert_driver_location` (auto-dispatch em BETA): se driver envia localização e há trip `requested`, promove para `assigned`.

**Se `create_trip` não encontrar driver disponível** → trip fica `requested` → `list_available_trips` retorna `[]` → driver não vê nada.

---

## 4. Lógica de autorização — `GET /trips/{trip_id}/driver-location`

```python
# driver_location.py: get_driver_location_for_trip
# 1. trip existe?
# 2. BETA: user_id == trip.passenger_id OU user_id == trip.driver_id
#    não-BETA: role=passenger → user_id == trip.passenger_id; role=driver → user_id == trip.driver_id
# 3. trip.driver_id != None
# 4. trip.status in (accepted, arriving, ongoing)
# 5. existe DriverLocation para trip.driver_id
```

**Resultados possíveis:**
- 404 `trip_not_found`
- 403 `forbidden_trip_access` — user não é passenger nem driver da trip
- 404 `driver_not_assigned` — trip.driver_id é NULL
- 409 `trip_not_active_for_location_assigned` — trip em `assigned` (driver ainda não aceitou)
- 404 `driver_location_not_found` — driver aceitou mas não há linha em driver_locations

---

## 5. Queries para verificação de estado real na BD

Executar estas queries na base de dados (Render ou local) para confirmar o estado:

```sql
-- Trips (últimas 10)
SELECT id, passenger_id, driver_id, status, created_at
FROM trips
ORDER BY created_at DESC
LIMIT 10;

-- Drivers
SELECT user_id, status, is_available
FROM drivers;

-- Driver locations (últimas 10)
SELECT driver_id, lat, lng, timestamp
FROM driver_locations
ORDER BY timestamp DESC
LIMIT 10;
```

**O que confirmar:**
- Trips presas em `requested` ou `assigned`?
- `driver_id` NULL nas trips que o passageiro vê como "Motorista atribuído"?
- Existe `Driver` para o user_id do telemóvel?
- Existem linhas em `driver_locations`?

---

## 6. Script de verificação (BD)

Criar script `scripts/check_db_state.py` para executar localmente ou em CI com `DATABASE_URL`:

```python
#!/usr/bin/env python3
"""Verifica estado real da BD para diagnóstico de regressão."""
import os
import sys
from sqlalchemy import create_engine, text

def main():
    url = os.environ.get("DATABASE_URL")
    if not url:
        print("DATABASE_URL não definida")
        sys.exit(1)
    engine = create_engine(url)
    with engine.connect() as conn:
        print("=== TRIPS (últimas 10) ===")
        for row in conn.execute(text("""
            SELECT id, passenger_id, driver_id, status, created_at
            FROM trips ORDER BY created_at DESC LIMIT 10
        """)):
            print(row)
        print("\n=== DRIVERS ===")
        for row in conn.execute(text("""
            SELECT user_id, status, is_available FROM drivers
        """)):
            print(row)
        print("\n=== DRIVER_LOCATIONS (últimas 10) ===")
        for row in conn.execute(text("""
            SELECT driver_id, lat, lng, timestamp
            FROM driver_locations ORDER BY timestamp DESC LIMIT 10
        """)):
            print(row)

if __name__ == "__main__":
    main()
```

---

## 7. Pipeline verificada (ordem)

1. **Passenger** cria trip → `create_trip` → trip `requested` ou `assigned` (se driver disponível).
2. **Driver** abre dashboard, toggle Disponível → `useGeolocation` + `sendDriverLocation` → `POST /drivers/location`
3. **Backend** `upsert_driver_location`:
   - Se BETA e sem Driver → cria Driver.
   - Upsert em driver_locations.
   - Se BETA e driver disponível → trip `requested` → `assigned`.
4. **Driver** polling `GET /driver/trips/available` → `list_available_trips` → trips com `status=assigned`.
5. **Driver** aceita → `POST /driver/trips/{id}/accept` → trip `assigned` → `accepted`, `driver_id` definido.
6. **Passenger** polling `GET /trips/{id}/driver-location` → exige trip `accepted|arriving|ongoing`; exige `driver_locations` para `trip.driver_id`.

**Ponto de falha mais provável:** se o driver nunca envia `POST /drivers/location` (ex.: GPS falha, geolocation fallback não ativado a tempo), o auto-dispatch não corre e a trip fica `requested` → driver nunca vê nada.

---

## 8. Resumo — sem suposições

| Componente | Estado em 44d78c8 | Estado atual |
|------------|-------------------|--------------|
| trips.py | create_trip auto-dispatch por Driver approved+available | Igual |
| trips.py | list_available_trips só trips assigned | Igual |
| driver_location.py | Não existia | Novo; upsert + get_driver_location_for_trip |
| passenger_trips | Sem /driver-location | Novo endpoint GET /driver-location |
| matching.py | Não existia | Novo; find_nearest_driver (não ligado ao fluxo) |

**Conclusão:** O fluxo de trips (create, assign, accept) em `trips.py` não mudou. O que mudou foi a introdução de `driver_location.py` e do endpoint `/driver-location`, que dependem de `driver_locations` e de `trip.driver_id`/`trip.status` em estados específicos. O fluxo de "driver vê viagens" continua a depender de `status=assigned`, que só acontece se (a) create_trip encontrar driver disponível ou (b) upsert_driver_location (auto-dispatch) promover uma trip requested. Se (a) falhar (ex.: driver sem perfil Driver ou is_available=False) e (b) não correr (ex.: driver não envia POST /drivers/location), o driver nunca vê viagens.

---

## 9. Verificação de pipeline completa (logs a capturar)

Para provar com dados onde falha, adicionar temporariamente `print` ou `logger.info` nos pontos abaixo e executar a sequência: passenger cria trip → driver liga toggle → driver envia location.

| Função | Variáveis a logar | Valor esperado se OK |
|--------|-------------------|----------------------|
| `create_trip` | `available_driver`, `trip.status` após flush | `available_driver` não None OU trip.status=requested |
| `list_available_trips` | `driver_id`, `driver`, `driver.is_available`, `len(trips)` | driver existe, is_available=True, trips≥1 se houver assigned |
| `upsert_driver_location` | `driver_id`, `driver`, `BETA_MODE`, `driver.is_available`, `trip` (se encontrado) | trip requested encontrado → trip.status=assigned |
| `get_driver_location_for_trip` | `user_id`, `role`, `trip.passenger_id`, `trip.driver_id`, `trip.status` | user_id match; trip.driver_id não None; status in accepted/arriving/ongoing |

**Se auto-dispatch não ocorrer:** verificar `settings.BETA_MODE`, `driver.is_available`, existência de trip `requested`.
