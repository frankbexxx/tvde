# Implementação e Guia de Testes

Lista exaustiva do que foi implementado (com snippets) e como testar — **todas as prompts do A000_SYSTEM_RULES.md**.

---

## Índice (A000 — prompts concluídas)

| Prompt | Descrição |
|--------|-----------|
| A001 | Driver Availability (online/offline) |
| A002 | Multi-Offer Dispatch |
| A003 | Rejection Timeout (offer expiry + redispatch) |
| A004 | Pricing Engine |
| A005 | Cancellation Rules |
| B001 | WebSocket Infra |
| C001 | Rating System |
| D001 | Background Workers (Cron) |

**Secções adicionais:** Diagnóstico passageiro–motorista | Localização demo (Oeiras) | Ferramentas admin na web-app

---

## 1. A001 — Driver Availability

### O que foi feito

- Campo `drivers.is_available` (boolean)
- Endpoints: `POST /driver/status/online`, `POST /driver/status/offline`
- Dispatch considera apenas motoristas com `is_available = true`

### Código principal

**`backend/app/api/routers/driver_status.py`**

```python
@router.post("/online", status_code=status.HTTP_200_OK)
async def go_online(
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> dict:
    """Set driver available to receive trip offers."""
    driver = db.execute(select(Driver).where(Driver.user_id == user.user_id)).scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="driver_not_found")
    driver.is_available = True
    db.commit()
    return {"status": "online", "is_available": True}

@router.post("/offline", status_code=status.HTTP_200_OK)
async def go_offline(...):
    driver.is_available = False
    db.commit()
    return {"status": "offline", "is_available": False}
```

**`backend/app/services/offer_dispatch.py` — filtro em create_offers_for_trip**

```python
drivers_with_loc = list(
    db.execute(
        select(Driver, DriverLocation)
        .join(DriverLocation, ...)
        .where(Driver.status == DriverStatus.approved)
        .where(Driver.is_available == True)  # ← A001
    ).all()
)
```

### Exemplo

```bash
POST /driver/status/online
Authorization: Bearer <driver_token>
# → {"status": "online", "is_available": true}

POST /driver/status/offline
Authorization: Bearer <driver_token>
# → {"status": "offline", "is_available": false}
```

---

## 2. A002 — Multi-Offer Dispatch

### O que foi feito

- Tabela `trip_offers` (id, trip_id, driver_id, status, expires_at)
- Ao criar trip: encontra motoristas em `GEO_RADIUS_KM`, ordena por distância, cria ofertas para top N (OFFER_TOP_N=5)
- Endpoints: `POST /driver/offers/{offer_id}/accept`, `POST /driver/offers/{offer_id}/reject`
- Primeiro accept ganha; outros recebem 409 `offer_already_taken`

### Código principal

**`backend/app/services/offer_dispatch.py`**

```python
def create_offers_for_trip(db: Session, trip: Trip) -> list[TripOffer]:
    top_n = getattr(settings, "OFFER_TOP_N", 5)
    radius_km = settings.GEO_RADIUS_KM
    # Drivers within radius, sorted by distance
    candidates.sort(key=lambda x: x[1])
    selected = candidates[:top_n]

    for driver, dist_km in selected:
        offer = TripOffer(
            trip_id=trip.id,
            driver_id=driver.user_id,
            status=OfferStatus.pending,
            expires_at=expires_at,
        )
        db.add(offer)
```

**`backend/app/api/routers/driver_offers.py`**

```python
@router.get("", response_model=List[TripOfferItem])
async def list_offers(...):
    """List pending offers for the current driver."""
    rows = list_offers_for_driver(db=db, driver_id=user.user_id)
    return [TripOfferItem(...) for offer, trip in rows]

@router.post("/{offer_id}/accept", response_model=TripStatusResponse)
async def accept_offer(...):
    """Accept an offer. First accept wins; others get 409."""
    trip, _ = accept_offer_service(db=db, driver_id=user.user_id, offer_id=offer_id.strip())
    return trip_to_status_response(trip, include_stripe_pi=False)

@router.post("/{offer_id}/reject", status_code=200)
async def reject_offer(...):
    reject_offer_service(db=db, driver_id=user.user_id, offer_id=offer_id.strip())
    return {"status": "rejected"}
```

**`backend/app/services/trips.py` — accept_offer com FOR UPDATE**

```python
offer = db.execute(select(TripOffer).where(TripOffer.id == offer_id).with_for_update()).scalar_one_or_none()
trip = db.execute(select(Trip).where(Trip.id == offer.trip_id).with_for_update()).scalar_one_or_none()
# ... first accept wins, others get 409 offer_already_taken
```

### Exemplo de fluxo

1. Passageiro: `POST /trips` → cria trip + 5 ofertas
2. Motorista A: `POST /driver/offers/{id}/accept` → 200, trip accepted
3. Motorista B: `POST /driver/offers/{outro_id}/accept` → 409 `offer_already_taken`

---

## 3. A003 — Rejection Timeout

### O que foi feito

- Oferta expira em 15 s (`OFFER_TIMEOUT_SECONDS`)
- Após timeout: `offer.status = expired`
- Ofertas expiradas disparam **redispatch** — novas ofertas para outros motoristas (excluindo os que já tiveram)

### Código principal

**`backend/app/services/offer_dispatch.py`**

```python
timeout_sec = getattr(settings, "OFFER_TIMEOUT_SECONDS", 15)
expires_at = datetime.now(timezone.utc) + timedelta(seconds=timeout_sec)

def expire_stale_offers(db: Session, now: datetime | None = None) -> int:
    """Mark offers with expires_at < now as expired."""
    stale = list(db.execute(
        select(TripOffer).where(
            TripOffer.status == OfferStatus.pending,
            TripOffer.expires_at < now,
        )
    ).scalars().all())
    for o in stale:
        o.status = OfferStatus.expired
    return len(stale)

def redispatch_expired_trips(db: Session) -> List[TripOffer]:
    """For trips with all offers expired, create new offers (excluding previous drivers)."""
    expire_stale_offers(db, now)
    # Find requested trips with only expired/rejected offers
    # Exclude drivers who already had offers
    # Create new offers for next N drivers
```

**Cron chama redispatch** — `backend/app/api/routers/cron.py`:

```python
expired = expire_stale_offers(db)
new_offers = redispatch_expired_trips(db)
```

### Exemplo

- Trip requested, 5 ofertas criadas
- Nenhum motorista aceita em 15 s
- Cron corre → `expire_stale_offers` marca expired → `redispatch_expired_trips` cria novas ofertas para outros 5 motoristas

---

## 4. A004 — Pricing Engine

### O que foi feito

- Config: `BASE_FARE`, `PRICE_PER_KM`, `PRICE_PER_MIN`
- Fórmula: `price = BASE_FARE + (distance_km × PRICE_PER_KM) + (duration_min × PRICE_PER_MIN)`
- Haversine para distância; OSRM opcional para distância/duração real

### Código principal

**`backend/app/core/pricing.py`**

```python
def calculate_price(distance_km: float, duration_min: float) -> float:
    total = (
        settings.BASE_FARE
        + (settings.PRICE_PER_KM * distance_km)
        + (settings.PRICE_PER_MIN * duration_min)
    )
    return round(total, 2)
```

**`backend/app/services/trips.py` — estimativa em create_trip**

```python
def _estimate_trip(payload: TripCreateRequest) -> tuple[float, float, float, int]:
    from app.services.osrm import get_route_distance_duration

    osrm_result = get_route_distance_duration(...)
    if osrm_result:
        distance_km, duration_min = osrm_result
    else:
        distance_km = haversine_km(...)
        duration_min = round(distance_km * 2.5, 2)  # ~24 km/h city

    estimated_price = calculate_price(distance_km, duration_min)
    return estimated_price, distance_km, duration_min, eta_minutes
```

**`backend/app/services/osrm.py`**

```python
def get_route_distance_duration(origin_lat, origin_lng, dest_lat, dest_lng) -> tuple[float, float] | None:
    base = getattr(settings, "OSRM_BASE_URL", None) or ""
    if not base:
        return None
    # httpx GET to OSRM route API, parse distance_m/duration_s
    return (distance_km, duration_min)
```

### Exemplo

- `BASE_FARE=1.50`, `PRICE_PER_KM=0.60`, `PRICE_PER_MIN=0.15`
- 10 km, 15 min → `1.50 + 6.00 + 2.25 = 9.75 €`

---

## 5. A005 — Cancellation Rules

### O que foi feito

- `cancellation_reason`, `cancellation_fee`, `cancelled_by` em Trip
- Fee passageiro: `max(CANCELLATION_FEE_MIN, estimated_price × CANCELLATION_FEE_PERCENT)`
- `driver.cancellation_count` quando motorista cancela

### Código principal

**`backend/app/services/trips.py` — cancel passageiro**

```python
fee = 0.0
if old_status in (TripStatus.accepted, TripStatus.arriving, TripStatus.ongoing):
    pct = getattr(settings, "CANCELLATION_FEE_PERCENT", 0.20)
    min_fee = getattr(settings, "CANCELLATION_FEE_MIN", 1.50)
    fee = max(min_fee, round(float(trip.estimated_price) * pct, 2))

trip.cancellation_reason = (reason or "").strip() or None
trip.cancellation_fee = fee if fee > 0 else None
trip.cancelled_by = "passenger"
```

**Cancel motorista — penalty**

```python
trip.cancelled_by = "driver"
driver = db.execute(select(Driver).where(Driver.user_id == driver_id)).scalar_one_or_none()
if driver:
    driver.cancellation_count = (driver.cancellation_count or 0) + 1
```

### Exemplo

- Trip `estimated_price=10.0`, cancel após accept
- Fee = `max(1.50, 10.0 × 0.20)` = **2.0 €**

---

## 6. B001 — WebSocket

### O que foi feito

- Eventos: `driver_location_update`, `trip_status_update`, **new_trip_offer**
- `/ws/driver/offers` — motoristas subscrevem e recebem `new_trip_offer` quando ofertas são criadas
- `DriverOffersHub` em `app/realtime/driver_offers_hub.py`
- Publicação em `create_offers_for_trip` e `redispatch_expired_trips`

### Código principal

**`backend/app/api/routers/ws.py`**

```python
@router.websocket("/ws/driver/offers")
async def driver_offers_ws(websocket: WebSocket) -> None:
    """Driver subscribes to receive new_trip_offer events in real time."""
    await websocket.accept()
    driver_id = await _authorize_driver(websocket)
    if not driver_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    await driver_offers_hub.subscribe(driver_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except Exception:
        pass
    finally:
        await driver_offers_hub.unsubscribe(driver_id, websocket)
```

**`backend/app/realtime/driver_offers_hub.py`**

```python
def publish_new_offer(self, driver_id, offer_id, trip_id, origin_lat, origin_lng, ...):
    payload = {
        "event": "new_trip_offer",
        "offer_id": offer_id,
        "trip_id": trip_id,
        "origin_lat": origin_lat,
        "origin_lng": origin_lng,
        "destination_lat": destination_lat,
        "destination_lng": destination_lng,
        "estimated_price": estimated_price,
        "expires_at": expires_at.isoformat(),
    }
    loop.create_task(self._broadcast(driver_id, payload))
```

### Exemplo de payload `new_trip_offer`

```json
{
  "event": "new_trip_offer",
  "offer_id": "uuid",
  "trip_id": "uuid",
  "origin_lat": 38.6973,
  "origin_lng": -9.30836,
  "destination_lat": 38.7223,
  "destination_lng": -9.1393,
  "estimated_price": 12.50,
  "expires_at": "2025-02-22T12:00:15Z"
}
```

---

## 7. C001 — Rating System

### O que foi feito

- `POST /trips/{id}/rate` (passageiro avalia motorista)
- `POST /driver/trips/{id}/rate` (motorista avalia passageiro)
- `Driver.avg_rating`, **`User.avg_rating_as_passenger`**
- Ratings guardados em Trip; médias atualizadas ao submeter

### Código principal

**`backend/app/api/routers/passenger_trips.py`**

```python
@router.post("/{trip_id}/rate", response_model=TripStatusResponse)
async def rate_trip(...):
    """Passenger rates driver after trip completion."""
    trip = rate_trip_as_passenger(
        db=db,
        passenger_id=user.user_id,
        trip_id=trip_id.strip(),
        rating=payload.rating,
    )
    return trip_to_status_response(trip, include_stripe_pi=False)
```

**`backend/app/services/trips.py` — atualização de médias**

```python
# Driver avg_rating
avg_row = db.execute(select(func.avg(Trip.driver_rating).where(Trip.driver_id == driver_id)...)).one_or_none()
if avg_row and avg_row.avg is not None:
    driver.avg_rating = round(float(avg_row.avg), 2)

# User avg_rating_as_passenger (quando motorista avalia)
avg_row = db.execute(select(func.avg(Trip.passenger_rating).where(Trip.passenger_id == passenger_id)...)).one_or_none()
if avg_row and avg_row.avg is not None:
    user.avg_rating_as_passenger = round(float(avg_row.avg), 2)
```

### Exemplo de request

```bash
POST /trips/{trip_id}/rate
Authorization: Bearer <passenger_token>
Content-Type: application/json

{"rating": 5}
```

---

## 8. D001 — Background Workers (Cron)

### O que foi feito

- Endpoint `GET /cron/jobs?secret=<CRON_SECRET>` para cron-job.org
- Executa: trip timeouts, offer expiry + redispatch, **cleanup** (audit_events > 90 dias)
- Config: `CRON_SECRET`, `AUDIT_EVENTS_RETENTION_DAYS`

### Código principal

**`backend/app/api/routers/cron.py`**

```python
@router.get("/jobs")
async def run_scheduled_jobs(
    secret: str = Query(..., description="CRON_SECRET from env"),
    db: Session = Depends(get_db),
) -> dict:
    cron_secret = getattr(settings, "CRON_SECRET", None)
    if not cron_secret:
        raise HTTPException(status_code=503, detail="CRON_SECRET not configured")
    if secret != cron_secret:
        raise HTTPException(status_code=401, detail="invalid_secret")

    timeouts = run_trip_timeouts(db)
    expired = expire_stale_offers(db)
    new_offers = redispatch_expired_trips(db)
    cleanup = run_cleanup(db)

    return {
        "status": "ok",
        "timeouts": {...},
        "offers": {"expired_count": expired, "redispatch_created": len(new_offers)},
        "cleanup": cleanup,
    }
```

**`backend/app/services/cleanup.py`**

```python
def run_cleanup(db: Session) -> dict[str, int]:
    retention_days = getattr(settings, "AUDIT_EVENTS_RETENTION_DAYS", 90)
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    result = db.execute(delete(AuditEvent).where(AuditEvent.occurred_at < cutoff))
    deleted = result.rowcount or 0
    if deleted > 0:
        db.commit()
    return {"audit_events_deleted": deleted}
```

**`backend/app/services/trip_timeouts.py`**

```python
# assigned > 2 min → requested
# accepted > 10 min → cancelled
# ongoing > 6 h → failed
```

### Exemplo de resposta

```json
{
  "status": "ok",
  "timeouts": {
    "assigned_to_requested": 0,
    "accepted_to_cancelled": 0,
    "ongoing_to_failed": 0
  },
  "offers": {
    "expired_count": 0,
    "redispatch_created": 0
  },
  "cleanup": {
    "audit_events_deleted": 0
  }
}
```

---

## 9. Schema Updates (startup)

### O que foi feito

- `_dev_add_columns_if_missing()` em `main.py` corre em **todos os ambientes** (sem guard ENV/BETA)
- Adiciona colunas em falta: `cancellation_reason`, `cancellation_fee`, `cancelled_by`, `driver_rating`, `passenger_rating`, `cancellation_count`, `avg_rating`, `avg_rating_as_passenger`, etc.

### Código

**`backend/app/main.py`**

```python
def _dev_add_columns_if_missing() -> None:
    try:
        with engine.connect() as conn:
            for stmt in [
                "ALTER TABLE trips ADD COLUMN IF NOT EXISTS distance_km NUMERIC(8,2)",
                "ALTER TABLE trips ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(280)",
                "ALTER TABLE trips ADD COLUMN IF NOT EXISTS cancellation_fee NUMERIC(10,2)",
                "ALTER TABLE trips ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(16)",
                "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS cancellation_count INTEGER DEFAULT 0 NOT NULL",
                "ALTER TABLE trips ADD COLUMN IF NOT EXISTS driver_rating INTEGER",
                "ALTER TABLE trips ADD COLUMN IF NOT EXISTS passenger_rating INTEGER",
                "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2)",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS avg_rating_as_passenger NUMERIC(3,2)",
                "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true NOT NULL",
                # ...
            ]:
                conn.execute(text(stmt))
            conn.commit()
    except Exception as e:
        print(f"[WARN] Schema update: {e}")
```

---

# O que testar e como testar

## Testes automatizados (pytest)

```bash
cd backend
pytest -v --ignore=tests/test_admin_operational.py
```

| Módulo | Prompt | O que cobre |
|--------|--------|-------------|
| `test_driver_availability.py` | A001 | go_online, go_offline, offline driver não recebe dispatch |
| `test_multi_offer_dispatch.py` | A002 | 5 ofertas criadas, first accept wins, reject, expired |
| `test_offer_timeout.py` | A003 | Offer expiry, redispatch quando todas expiradas |
| `test_pricing_engine.py` | A004 | BASE_FARE, PRICE_PER_KM, PRICE_PER_MIN |
| `test_osrm.py` | A004 | OSRM retorna None sem config; distância/duração com config |
| `test_cancellation_rules.py` | A005 | Cancel sem fee, cancel com fee, driver penalty |
| `test_websocket_updates.py` | B001 | trip_status, driver_location, new_trip_offer |
| `test_rating_system.py` | C001 | Rating passageiro→motorista, motorista→passageiro, avg_rating, avg_rating_as_passenger |
| `test_cleanup.py` | D001 | Cleanup apaga audit_events antigos |

---

## Testes manuais

### 1. A001 — Driver Availability

```bash
POST /driver/status/online
Authorization: Bearer <driver_token>
# → {"status": "online", "is_available": true}

POST /driver/status/offline
Authorization: Bearer <driver_token>
# → {"status": "offline", "is_available": false}
```

### 2. A002 — Multi-Offer

```bash
# Passageiro cria trip (exemplo: Oeiras → Lisboa)
POST /trips
{"origin_lat": 38.6973, "origin_lng": -9.30836, "destination_lat": 38.7223, "destination_lng": -9.1393}

# Motorista lista ofertas
GET /driver/trips
Authorization: Bearer <driver_token>

# Motorista aceita
POST /driver/offers/{offer_id}/accept
Authorization: Bearer <driver_token>

# Motorista rejeita
POST /driver/offers/{offer_id}/reject
Authorization: Bearer <driver_token>
```

### 3. D001 — Cron endpoint

```bash
curl "http://localhost:8000/cron/jobs?secret=TEU_CRON_SECRET"
# → 200, JSON com status, timeouts, offers, cleanup

curl "http://localhost:8000/cron/jobs?secret=wrong"
# → 401
```

### 4. A004 — Pricing (create_trip)

Verificar `estimated_price` na resposta de `POST /trips` segue fórmula. Com `OSRM_BASE_URL`: distância/duração reais.

### 5. A005 — Cancellation

```bash
# Cancel antes de accept → cancellation_fee = null
# Cancel após accept → cancellation_fee = max(1.50, estimated_price * 0.20)
# Cancel pelo motorista → driver.cancellation_count incrementado
```

### 6. B001 — WebSocket new_trip_offer

1. Conectar motorista a `ws://localhost:8000/ws/driver/offers` com token JWT
2. Criar trip como passageiro
3. Verificar JSON com `event: "new_trip_offer"`

```javascript
const ws = new WebSocket("ws://localhost:8000/ws/driver/offers?token=JWT");
ws.onmessage = (e) => {
  const data = JSON.parse(e.data);
  console.log(data.event, data.offer_id, data.trip_id);
};
```

### 7. C001 — Rating

```bash
POST /trips/{trip_id}/rate
Authorization: Bearer <passenger_token>
{"rating": 5}

POST /driver/trips/{trip_id}/rate
Authorization: Bearer <driver_token>
{"rating": 4}
```

### 8. Trip flow completo (E2E)

1. Passageiro: `POST /trips` → trip criado, ofertas criadas
2. Motorista: `GET /driver/trips` → vê ofertas
3. Motorista: `POST /driver/offers/{offer_id}/accept` → trip accepted
4. Motorista: `POST /driver/trips/{id}/arriving` → arriving
5. Motorista: `POST /driver/trips/{id}/start` → ongoing
6. Motorista: `POST /driver/trips/{id}/complete` → completed
7. Passageiro: `POST /trips/{id}/rate` com rating 1–5
8. Motorista: `POST /driver/trips/{id}/rate` com rating 1–5

---

## Diagnóstico de comunicação passageiro–motorista

Quando o passageiro pede viagem e o motorista não vê ofertas, usa os endpoints de diagnóstico para identificar a causa com 100% de certeza.

### Endpoints (BETA_MODE ou ENABLE_DEV_TOOLS)

| Endpoint | Token | Descrição |
|----------|-------|-----------|
| `GET /debug/trip-matching/{trip_id}` | Passageiro (dono da viagem) | Diagnóstico: drivers com localização, no raio, ofertas criadas |
| `GET /debug/driver-eligibility` | Motorista | Diagnóstico: localização, is_available, ofertas pendentes |

### Botões no DevTools (▶ Dev)

- **Passageiro:** "Diagnóstico viagem" — quando há viagem ativa. Mostra `root_cause` e contagens no log.
- **Motorista:** "Diagnóstico motorista" — mostra estado do motorista e ofertas pendentes.

### Possíveis root_cause (trip-matching)

| root_cause | Significado |
|------------|-------------|
| `ZERO_OFFERS: 0 drivers with location and is_available=true` | Nenhum motorista com localização e disponível |
| `ZERO_OFFERS: N drivers with location but 0 within Xkm` | Motoristas existem mas fora do raio |
| `ZERO_OFFERS: drivers in radius but no offers in DB` | Bug ou ofertas expiraram antes de criar |
| `ZERO_OFFERS: N offers exist but all expired or taken` | Ofertas criadas mas já expiraram |
| `OK: N pending offers` | Ofertas pendentes — motorista deveria ver |

### Possíveis root_cause (driver-eligibility)

| root_cause | Significado |
|------------|-------------|
| `NO_LOCATION: driver has no DriverLocation row` | Motorista nunca enviou `POST /drivers/location` |
| `OFFLINE: is_available=false` | Motorista está Offline (toggle "Disponível") |
| `NOT_APPROVED: driver status=X` | Motorista não aprovado |
| `NO_OFFERS: 0 pending offers` | create_offers_for_trip não incluiu este motorista |
| `OK: N pending offers` | Motorista tem ofertas — deveria ver na lista |

### Pré-condições para teste válido

1. **Motorista:** Login como motorista → toggle "Disponível" → app envia `POST /driver/status/online` e `POST /drivers/location` periodicamente.
2. **Passageiro:** Login como passageiro → pedir viagem.
3. **Ordem:** Motorista deve estar online e com localização **antes** do passageiro pedir viagem.
4. **Raio:** Origem da viagem e localização do motorista dentro de `GEO_RADIUS_KM` (default 50 km).

---

## Localização demo e geolocalização

### Coordenadas demo (Oeiras)

- **Origem:** Câmara Municipal de Oeiras, Largo Marquês de Pombal — `38.6973, -9.30836`
- **Destino demo:** Lisboa centro — `38.7223, -9.1393`
- **Mapa inicial:** Centro em Oeiras

### Modo Demo Oeiras (sem pedir permissão)

Para testar no PC sem pedir permissão de localização em cada refresh:

1. **DevTools:** Expandir ▶ Dev → clicar **Demo Oeiras** → a app recarrega e usa Oeiras sem geolocalização.
2. **URL:** Aceder a `/passenger?demo=1` ou `/driver?demo=1` para usar Oeiras numa sessão.
3. **Persistência:** O botão Demo Oeiras grava em `localStorage` — fica ativo até desativar.

### Fallback automático (após erro)

- Se a geolocalização falhar (timeout, permissão negada), a app usa Oeiras e grava em `sessionStorage`.
- Nos refreshes seguintes da mesma sessão, **não volta a pedir permissão** — usa Oeiras diretamente.
- Banner: "A usar Oeiras (localização indisponível). Para não pedir permissão no próximo carregamento, ativa **Demo Oeiras** em ▶ Dev."

### MapTiler

- Estilo: `basic-v2` (menos sprites, evita erros de imagem no mapa).
- `VITE_MAPTILER_KEY` no Render (tvde-app) para tiles.

---

## Ferramentas admin na web-app

Todas as operações admin estão na web-app (gestão no telemóvel sem Swagger).

### Tabs no AdminDashboard

| Tab | Conteúdo |
|-----|----------|
| Pendentes | Aprovar utilizadores (BETA) |
| Utilizadores | Lista, promover/rebaixar motorista, editar, eliminar |
| Viagens | Lista de viagens ativas; Atribuir, Cancelar, Debug |
| Métricas | active_trips, drivers_available/busy, trips_requested, etc. |
| Operações | Executar timeouts, Expirar ofertas + redispatch, Exportar logs CSV, Recuperar motorista |
| Saúde | Status do sistema, warnings, anomalias (viagens accepted/ongoing há muito, etc.) |

### Endpoints usados

- `GET /admin/trips/active` — viagens em requested, assigned, accepted, arriving, ongoing
- `GET /admin/trips/{trip_id}` — detalhe da viagem
- `GET /admin/trip-debug/{trip_id}` — debug completo (payment, driver, logs)
- `POST /admin/trips/{trip_id}/assign` — atribuir viagem
- `POST /admin/cancel-trip/{trip_id}` — cancelar viagem
- `GET /admin/metrics` — métricas operacionais
- `GET /admin/system-health` — saúde do sistema
- `POST /admin/run-timeouts` — executar timeouts
- `POST /admin/run-offer-expiry` — expirar ofertas e redispatch
- `POST /admin/recover-driver/{driver_id}` — forçar is_available=true
- `GET /admin/export-logs?format=csv` — exportar logs

---

## Variáveis de ambiente relevantes

| Variável | Descrição |
|----------|-----------|
| `CRON_SECRET` | Secret para `/cron/jobs` |
| `AUDIT_EVENTS_RETENTION_DAYS` | Dias de retenção (default 90) |
| `GEO_RADIUS_KM` | Raio de matching (default 50) |
| `OFFER_TOP_N` | Número de ofertas por trip (default 5) |
| `OFFER_TIMEOUT_SECONDS` | Timeout da oferta (default 15) |
| `BASE_FARE` | Tarifa base (default 1.50) |
| `PRICE_PER_KM` | Preço por km (default 0.60) |
| `PRICE_PER_MIN` | Preço por minuto (default 0.15) |
| `OSRM_BASE_URL` | URL OSRM (opcional) |
| `CANCELLATION_FEE_PERCENT` | % do preço estimado (default 0.20) |
| `CANCELLATION_FEE_MIN` | Mínimo em € (default 1.50) |
| `BETA_MODE` | Modo BETA (login por telefone, rate limit) |
| `ENABLE_DEV_TOOLS` | Seed, tokens, debug em produção |

### Frontend (Render tvde-app)

| Variável | Descrição |
|----------|-----------|
| `VITE_API_URL` | URL do backend (ex: `https://tvde-api-xxx.onrender.com`) |
| `VITE_MAPTILER_KEY` | Chave MapTiler para tiles do mapa |
