# PET — modelo e roadmap

**Actualização:** 2026-09-10  
**Estado:** **PET-0 + PET-1** (fundação + surcharge/breakdown) — **feature Pet NÃO concluída**

## Decisão de produto

- Pricing por categoria desde o lançamento: **GO** (`x`) · **Comfort** · **XL** *(tarifário por categoria = A2.5 / ainda não no código)*
- **Pet não é categoria tarifária principal**
- Pet é **atributo adicional** → `GO+Pet` / `Comfort+Pet` / `XL+Pet`
- Surcharge Pet normal: **€1,50** flat / viagem
- Animal de assistência: **€0** surcharge; **sem** opt-in Pet do Driver
- Comissão piloto **15%** calcula-se sobre o **total** (fare + Pet surcharge) — política actual

## PET-0 — DONE

Separação fare category vs atributos Pet · matching combinado · legacy `vehicle_category=pet` · migration `a9b0c1d2e3f4`

## PET-1 — DONE (esta entrega)

| Item | Estado |
|------|--------|
| Surcharge €1,50 / assistência €0 | DONE |
| Breakdown explícito (base/km/min/pet/tolls/total) | DONE |
| Snapshot `pet_surcharge_amount` + `pet_surcharge_rule` + `price_breakdown` | DONE |
| `estimated_price` / `final_price` incluem surcharge | DONE |
| Comissão sobre total (incl. surcharge) | DONE |
| Legacy sem snapshot → surcharge 0 (sem retroactivo) | DONE |
| Portagens / minimum fare por categoria | placeholder 0 / futuro |
| Passenger / Driver UX | **não** (PET-2 / PET-3) |

### Código canónico

- `backend/app/core/pricing.py` — `calculate_fare_breakdown` / `calculate_pet_surcharge`
- `backend/app/services/pet_trip.py` — `pet_surcharge_for_trip`
- Migration `b0c1d2e3f4a5_trip_pet_surcharge_snapshot`

### Regra

```text
pet_surcharge = 0 if assistance else (1.50 if has_pet else 0)
total = fare_subtotal + pet_surcharge + tolls(0)
```

## Etapas restantes

2. **PET-2** — Passenger UX  
3. **PET-3** — Driver UX  
4. **PET-4** — capacity  
5. **PET-5** — legal/copy/reporting/E2E  
