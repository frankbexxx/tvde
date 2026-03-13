# Driver Location Tracking & Map Integration

Este documento descreve a implementação atual de tracking de localização de motoristas e integração com o mapa na TVDE Web App.

---

## 1. Visão Geral

Objetivos:

- Enviar a localização GPS real do motorista para o backend.
- Persistir a última posição conhecida por motorista.
- Permitir que o passageiro obtenha a localização atual do motorista para uma viagem ativa.
- Expor estes dados no mapa (MapLibre) com rota calculada via OSRM.

Camadas envolvidas:

- **Frontend** (`web-app`):
  - `useGeolocation` – hook de geolocalização com filtro de ruído.
  - `locationService` – envio de localização do motorista.
  - `trackingService` – polling de localização do motorista por viagem.
  - `routingService` – integração com OSRM para rotas.
  - `MapView` + `PassengerMarker` + `DriverMarker` + `RouteLine`.
  - `DriverDashboard` / `PassengerDashboard`.
- **Backend** (`backend/app`):
  - Modelo `DriverLocation` (SQLAlchemy).
  - Serviço `driver_location`.
  - Router `drivers` (`POST /drivers/location`).
  - Endpoint de tracking para passageiro (`GET /trips/{trip_id}/driver-location`).

---

## 2. Estrutura de Dados no Backend

### 2.1. Modelo `DriverLocation`

Ficheiro: `backend/app/db/models/driver.py`

```python
class DriverLocation(Base):
    """
    Last known GPS location for a driver.
    One row per driver_id (primary key), updated frequently.
    """

    __tablename__ = "driver_locations"

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("drivers.user_id", ondelete="CASCADE"),
        primary_key=True,
        comment="Driver user_id (matches drivers.user_id).",
    )
    lat: Mapped[float] = mapped_column(
        Numeric(9, 6),
        nullable=False,
        comment="Last latitude reported by driver.",
    )
    lng: Mapped[float] = mapped_column(
        Numeric(9, 6),
        nullable=False,
        comment="Last longitude reported by driver.",
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="Timestamp of last location update.",
    )

    driver: Mapped["Driver"] = relationship(backref="location", uselist=False)


Index("ix_driver_locations_driver_id", DriverLocation.driver_id)
```

Notas:

- Uma linha por `driver_id` (PK), atualizada a cada POST `/drivers/location`.
- Armazena latitude, longitude e timestamp (UTC).
- Tabela é criada automaticamente via `Base.metadata.create_all` no startup (sem migrações manuais).

---

## 3. Serviço de Driver Location (Backend)

Ficheiro: `backend/app/services/driver_location.py`

### 3.1. Upsert da localização do motorista

```python
def upsert_driver_location(
    *,
    db: Session,
    driver_id: str,
    lat: float,
    lng: float,
    timestamp_ms: int,
) -> None:
    """Upsert last known location for a driver."""
    driver = db.execute(
        select(Driver).where(Driver.user_id == driver_id)
    ).scalar_one_or_none()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="driver_not_found",
        )

    ts = datetime.fromtimestamp(timestamp_ms / 1000.0, tz=timezone.utc)

    loc = db.execute(
        select(DriverLocation).where(DriverLocation.driver_id == driver_id)
    ).scalar_one_or_none()
    if loc is None:
        loc = DriverLocation(
            driver_id=driver_id,
            lat=lat,
            lng=lng,
            timestamp=ts,
        )
        db.add(loc)
    else:
        loc.lat = lat
        loc.lng = lng
        loc.timestamp = ts

    db.commit()
```

### 3.2. Localização do motorista por viagem

```python
def get_driver_location_for_trip(
    *,
    db: Session,
    passenger_id: str,
    trip_id: str,
) -> tuple[float, float, datetime]:
    """
    Return the last known driver location for a given trip.

    - Validates that the passenger owns the trip.
    - Only returns location if the trip has an assigned driver and is active.
    """
    trip = db.execute(
        select(Trip).where(Trip.id == trip_id)
    ).scalar_one_or_none()
    if not trip or str(trip.passenger_id) != str(passenger_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="trip_not_found",
        )

    if not trip.driver_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="driver_not_assigned",
        )

    if trip.status not in {
        TripStatus.accepted,
        TripStatus.arriving,
        TripStatus.ongoing,
    }:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"trip_not_active_for_location_{trip.status.value}",
        )

    loc = db.execute(
        select(DriverLocation).where(DriverLocation.driver_id == trip.driver_id)
    ).scalar_one_or_none()
    if not loc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="driver_location_not_found",
        )

    return float(loc.lat), float(loc.lng), loc.timestamp
```

---

## 4. Schemas de API

Ficheiro: `backend/app/schemas/driver.py`

```python
class DriverStatusResponse(BaseModel):
  driver_id: str
  status: DriverStatus


class DriverLocationPayload(BaseModel):
  lat: float = Field(..., ge=-90.0, le=90.0)
  lng: float = Field(..., ge=-180.0, le=180.0)
  timestamp: int = Field(..., description="Client-side timestamp in milliseconds since epoch.")


class DriverLocationResponse(BaseModel):
  lat: float
  lng: float
  timestamp: int
```

- `DriverLocationPayload`: usado em `POST /drivers/location` (frontend envia `Date.now()`).
- `DriverLocationResponse`: usado em `GET /trips/{trip_id}/driver-location`.

---

## 5. Endpoints Backend

### 5.1. Atualização de localização do motorista

Ficheiro: `backend/app/api/routers/drivers.py`

```python
router = APIRouter(prefix="/drivers", tags=["driver"])


@router.post(
    "/location",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Update current driver location",
)
async def update_location(
    payload: DriverLocationPayload,
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> None:
    """
    Receive the driver's current GPS location.

    Frontend: called every few seconds when driver is online.
    """
    upsert_driver_location(
        db=db,
        driver_id=user.user_id,
        lat=payload.lat,
        lng=payload.lng,
        timestamp_ms=payload.timestamp,
    )
```

- Rota: `POST /drivers/location`
- Auth: `Role.driver` (obrigatório).
- Corpo: `DriverLocationPayload`.
- Efeito: guarda/atualiza última posição em `driver_locations`.

### 5.2. Localização do motorista para o passageiro

Ficheiro: `backend/app/api/routers/passenger_trips.py`

```python
@router.get("/{trip_id}/driver-location", response_model=DriverLocationResponse)
async def get_driver_location(
    trip_id: str,
    user: UserContext = Depends(require_role(Role.passenger, Role.driver)),
    db: Session = Depends(get_db),
) -> DriverLocationResponse:
    """
    Latest known driver location for a given trip.
    - Passenger must own the trip.
    - Only available while trip is active and driver assigned.
    """
    lat, lng, ts = get_driver_location_for_trip(
        db=db,
        passenger_id=user.user_id,
        trip_id=trip_id.strip(),
    )
    return DriverLocationResponse(
        lat=lat,
        lng=lng,
        timestamp=int(ts.timestamp() * 1000),
    )
```

- Rota: `GET /trips/{trip_id}/driver-location`
- Auth: `Role.passenger` ou `Role.driver` (útil para debugging).
- Valida:
  - Trip existe.
  - Pertence ao passageiro.
  - Tem driver atribuído.
  - Estado da trip é ativo (`accepted`, `arriving`, `ongoing`).

### 5.3. Registo de router no FastAPI

Ficheiro: `backend/app/main.py`

```python
from app.api.routers import (
    admin,
    admin_ws,
    auth,
    dev_tools,
    driver_trips,
    drivers,
    health,
    logs,
    passenger_trips,
    ws,
)

...

app.include_router(passenger_trips.router)
app.include_router(driver_trips.router)
app.include_router(drivers.router)
```

---

## 6. Frontend – Fluxo de Localização

### 6.1. Driver: envio periódico

Ficheiro: `web-app/src/features/driver/DriverDashboard.tsx`

```tsx
const driverLocation = useGeolocation()

useEffect(() => {
  if (offline || !driverLocation) return

  let cancelled = false
  const interval = setInterval(() => {
    if (cancelled || !driverLocation) return
    void sendDriverLocation(driverLocation.lat, driverLocation.lng).catch((err) => {
      console.warn('Failed to send driver location', err)
    })
  }, 3000)

  return () => {
    cancelled = true
    clearInterval(interval)
  }
}, [offline, driverLocation])
```

- Só envia localização quando:
  - `offline === false`
  - `useGeolocation` já devolveu posição.
- Frequência: 3s.

### 6.2. Passenger: polling de localização do motorista

Ficheiro: `web-app/src/features/passenger/PassengerDashboard.tsx`

```tsx
const passengerLocation = useGeolocation()
const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null)

useEffect(() => {
  if (!activeTripId) {
    setDriverLocation(null)
    return
  }

  let cancelled = false
  const interval = setInterval(() => {
    if (cancelled) return
    void getDriverLocation(activeTripId)
      .then((loc) => {
        setDriverLocation({ lat: loc.lat, lng: loc.lng })
      })
      .catch((err) => {
        console.warn('Failed to fetch driver location', err)
      })
  }, 3000)

  return () => {
    cancelled = true
    clearInterval(interval)
  }
}, [activeTripId])
```

E na `MapView`:

```tsx
<MapView
  passengerLocation={ ... } // useGeolocation + origem
  driverLocation={driverLocation ?? undefined}
  route={...} // origem/destino (OSRM)
/>
```

---

## 7. Geolocation – Otimização e Anti-Jitter

Hook: `web-app/src/hooks/useGeolocation.ts`

- Filtro de ~5 metros com distância Haversine:
  - Reduz ruído de GPS e re-renders supérfluos.
- Mantém alta precisão (`enableHighAccuracy: true`) e `watchPosition`.

Isto reduz jitter do marcador, em combinação com:

- `DriverMarker`: `transition-transform duration-300 ease-out`
- `PassengerMarker`: `animate-ping` sobre o marcador.

---

## 8. Notas de Implementação & TODOs

- **Endpoints backend**:
  - `POST /drivers/location`
  - `GET /trips/{trip_id}/driver-location`
  - Já implementados e compilam (`python -m compileall app` sem erros).
- **DB**:
  - Nova tabela `driver_locations` criada via `Base.metadata.create_all` no startup.
  - Em ambientes já provisionados, garantir `CREATE TABLE driver_locations` ou deixar o `create_all` gerir (dev/BETA).
- **TODOs futuros**:
  - Emitir `DriverLocationEvent` em `emit(...)` para suportar tracking em tempo real via WebSocket.
  - Integrar distância real (OSRM) no cálculo de `distance_km` e `duration_min` na conclusão de viagem.

