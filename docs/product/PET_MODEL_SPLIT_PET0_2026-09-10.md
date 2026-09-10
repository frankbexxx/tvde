# PET — modelo e roadmap

**Actualização:** 2026-09-10  
**Estado:** **PET-0 → PET-3** (fundação + surcharge + Passenger UX + Driver UX) — **feature Pet NÃO concluída** globalmente

## Decisão de produto

- Pricing por categoria desde o lançamento: **GO** (`x`) · **Comfort** · **XL** *(tarifário por categoria = A2.5 / ainda não no código)*
- **Pet não é categoria tarifária principal**
- Pet é **atributo adicional** → `GO+Pet` / `Comfort+Pet` / `XL+Pet`
- Surcharge Pet normal: **€1,50** flat / viagem
- Animal de assistência: **€0** surcharge; **sem** opt-in Pet do Driver
- Comissão piloto **15%** calcula-se sobre o **total** (fare + Pet surcharge) — política actual

## Política Pet V1 (produto)

- Máximo **1 animal** por viagem
- Portes: `small` | `medium` | `large`
- Transporte: `carrier` | `harness`
- Pequeno/médio: transportadora **ou** arnês/cinto
- Grande: **só** arnês/cinto (senão bloquear pedido)
- Pet normal ≠ animal de assistência (mutuamente coerentes na UX)
- `pet_occupies_seat` informativo; capacity completa = **PET-4**

## PET-0 — DONE

Separação fare category vs atributos Pet · matching combinado · legacy `vehicle_category=pet` · migration `a9b0c1d2e3f4`

## PET-1 — DONE

Surcharge €1,50 / assistência €0 · breakdown · snapshot · commission on total · legacy sem retroactivo

## PET-2 — DONE

Passenger UX: selector GO/Comfort/XL · Viajo com animal · assistência · validação FE · payload · breakdown pós-create · badges active/history

## PET-3 — DONE (esta entrega)

Driver UX + matching combinado validado:

| Item | Estado |
|------|--------|
| Preferência existente `pet` (copy «Aceito viagens com animais») | DONE — sem storage/API nova |
| Offer / available cards: Com animal + porte/transporte/lugar | DONE |
| Assistance: copy separada + «Sem suplemento» | DONE |
| Surcharge só Pet normal (valor API `pet_surcharge`) | DONE |
| Active trip mantém detalhes após accept | DONE |
| Matching GO/Comfort/XL + Pet + assistance (helpers PET-0) | VALIDADO + testes `list_available_trips` |
| Legacy `vehicle_category=pet` legível sem inventar size/transport | DONE |
| Capacity / seats / passenger_count | **não** (PET-4) |

### Código canónico (Driver)

- `web-app/src/features/driver/driverTripPetDisplay.ts`
- `web-app/src/features/driver/DriverPetTripInfo.tsx`
- `RequestCard` + `DriverDashboard` (offers / available / active)
- i18n `driver.pet.*` / `opsMenu.categories.petAccept`
- Backend: `pet_trip.driver_matches_trip_fare_and_pet` (inalterado) + `tests/test_pet_list_available_matching.py`

### Matching (regra)

```text
GO+Pet     → driver: x + pet
Comfort+Pet→ driver: comfort + pet
XL+Pet     → driver: xl + pet
Assistance → driver: fare category only (sem pet opt-in)
```

## Etapas restantes

4. **PET-4** — capacity (`passengers + animal <= seats`)  
5. **PET-5** — legal/copy completa · reporting Partner/Admin · E2E  
