# PET — modelo e roadmap

**Actualização:** 2026-09-10  
**Estado:** **PET-0 → PET-4** — **feature Pet NÃO concluída** globalmente (falta PET-5)

## Decisão de produto

- Pricing por categoria: **GO** (`x`) · **Comfort** · **XL** *(tarifário completo = A2.5 / ainda não)*
- Pet = atributo adicional; surcharge **€1,50**; assistência **€0**
- Comissão 15% sobre total (fare + surcharge)

## Política capacidade (PET-4)

```text
occupied_pet_seats =
  1 if pet_occupies_seat and (has_pet or is_assistance_animal)
  0 otherwise

required_passenger_capacity = passenger_count + occupied_pet_seats

Vehicle elegível se max_passengers >= required_passenger_capacity
```

- `passenger_count`: passageiros **sem** Driver; default **1**
- `max_passengers`: no Vehicle real (não inferido da categoria)
- NULL / unknown capacity com gate ON → **bloqueia**
- Gate: `ENABLE_VEHICLE_CAPACITY_GATES` (**default OFF**)

## PET-0 → PET-3 — DONE

Fundação · surcharge · Passenger UX · Driver UX + matching Pet

## PET-4 — DONE (esta entrega)

| Item | Estado |
|------|--------|
| `trips.passenger_count` | DONE |
| `vehicles.max_passengers` (nullable legacy) | DONE |
| Occupancy formula + matching/accept | DONE |
| Passenger selector 1–6 | DONE |
| Driver occupancy chips | DONE |
| Partner create/edit capacity | DONE |
| Admin KYC read-only capacity | DONE |
| Feature flag `ENABLE_VEHICLE_CAPACITY_GATES` default OFF | DONE |
| PROD fill / audit / enable | **pendente (rollout)** |

### Código canónico

- Migration `c1d2e3f4a5b6`
- `backend/app/services/vehicle_capacity.py`
- Flag em `app/core/config.py`
- Tests `backend/tests/test_vehicle_capacity_pet4.py`

### Rollout

1. Deploy com flag **OFF**
2. Partner preenche `max_passengers` nas viaturas
3. Readiness audit (como compliance)
4. Smoke com flag ON em ambiente controlado
5. Só então PROD ON

## Etapas restantes

5. **PET-5** — legal/copy completa · reporting Partner/Admin · E2E  
