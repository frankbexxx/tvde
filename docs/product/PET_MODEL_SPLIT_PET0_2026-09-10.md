# PET — modelo e roadmap

**Actualização:** 2026-09-10  
**Estado:** **PET-0 + PET-1 + PET-2** (fundação + surcharge/breakdown + Passenger UX) — **feature Pet NÃO concluída** globalmente

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

| Item | Estado |
|------|--------|
| Surcharge €1,50 / assistência €0 | DONE |
| Breakdown explícito (base/km/min/pet/tolls/total) | DONE |
| Snapshot `pet_surcharge_amount` + `pet_surcharge_rule` + `price_breakdown` | DONE |
| `estimated_price` / `final_price` incluem surcharge | DONE |
| Comissão sobre total (incl. surcharge) | DONE |
| Legacy sem snapshot → surcharge 0 (sem retroactivo) | DONE |

### Código canónico (pricing)

- `backend/app/core/pricing.py` — `calculate_fare_breakdown` / `calculate_pet_surcharge`
- `backend/app/services/pet_trip.py` — `pet_surcharge_for_trip`
- Migration `b0c1d2e3f4a5_trip_pet_surcharge_snapshot`

```text
pet_surcharge = 0 if assistance else (1.50 if has_pet else 0)
total = fare_subtotal + pet_surcharge + tolls(0)
```

## PET-2 — DONE (esta entrega)

Passenger UX no planner (confirming):

| Item | Estado |
|------|--------|
| Selector GO / Comfort / XL (`x` / `comfort` / `xl`) | DONE |
| `Viajo com animal` + config porte/transporte/lugar | DONE |
| `Animal de assistência` separado (€0 / copy sem suplemento) | DONE |
| Validação FE (incl. large → harness) | DONE |
| Payload create: `vehicle_category`, `has_pet`, `pet_size`, `pet_transport`, `is_assistance_animal`, `pet_occupies_seat` | DONE |
| Breakdown/surcharge da API após create (não recalcular €1,50 no FE) | DONE |
| Indicador curto active + histórico | DONE |
| Copy PT-PT (`Animal`, não “pet” como copy principal) | DONE |
| Driver UX / capacity / Partner reporting | **não** |

### Código canónico (Passenger)

- `web-app/src/features/passenger/petBooking.ts`
- `web-app/src/features/passenger/PassengerPetBookingPanel.tsx`
- `TripPlannerPanel` + `PassengerDashboard` (wire create/retry)
- i18n `passenger.pet.*` (pt/en)

### Copy / validação (PET-2)

- Erro large sem harness: *Para um animal de grande porte é necessário indicar arnês/cinto próprio.*
- Disclosure pré-create do suplemento é informativo; valor autoritativo = `pet_surcharge` / `price_breakdown` da API

## Etapas restantes

3. **PET-3** — Driver UX (opt-in Pet, preferências, oferta com animal)  
4. **PET-4** — capacity (`passengers + animal <= seats`)  
5. **PET-5** — legal/copy completa · reporting Partner/Admin · E2E  
