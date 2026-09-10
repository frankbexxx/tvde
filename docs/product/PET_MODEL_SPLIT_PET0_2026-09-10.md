# PET — modelo e roadmap (PET-0)

**Data:** 2026-09-10  
**Estado:** **PET-0 implementado** (fundação estrutural) — **feature Pet NÃO concluída**

## Decisão de produto

- Pricing por categoria desde o lançamento: **GO** (`x`) · **Comfort** · **XL**
- **Pet não é categoria tarifária principal**
- Pet é **atributo adicional** da viagem → `GO+Pet` / `Comfort+Pet` / `XL+Pet` devem ser possíveis
- Surcharge Pet normal: **€1,50** (aplicação em **PET-1**)
- Animal de assistência: **€0** surcharge; **sem** exigir opt-in Pet do Driver

## PET-0 (esta entrega)

| Item | Estado |
|------|--------|
| Separar fare category de atributos Pet | DONE |
| Colunas Trip `has_pet`, `pet_size`, `pet_transport`, `is_assistance_animal`, `pet_occupies_seat` | DONE |
| Create normaliza `vehicle_category=pet` → `x` + `has_pet` | DONE |
| Matching combinado fare + Pet opt-in | DONE |
| Assistance sem opt-in Pet | DONE |
| Legacy `vehicle_category=pet` legível sem rewrite | DONE |
| Surcharge / pricing breakdown | **não** (PET-1) |
| Passenger / Driver UX | **não** (PET-2 / PET-3) |
| Capacity enforcement | **não** (PET-4) |

### Legacy

- Histórico com `vehicle_category='pet'` **não** é reescrito
- Matching legacy: Driver com preferência `pet` continua a servir essas trips
- Novas trips **não** persistem `vehicle_category='pet'`

### Código canónico

- `backend/app/services/pet_trip.py`
- Migration `a9b0c1d2e3f4_trip_pet_attributes`

## Etapas restantes

1. **PET-1** — surcharge €1,50 + assistance 0 + breakdown/snapshot pricing  
2. **PET-2** — Passenger UX (categoria, Pet, porte, transporte, assistance, regras, estimate)  
3. **PET-3** — Driver UX (offer/active + detalhes Pet)  
4. **PET-4** — capacity (`passenger_count`, seats, `pet_occupies_seat`)  
5. **PET-5** — copy legal, Partner/Admin reporting, E2E  

Validação rigorosa “grande exige arnês” no create quando size+transport estão presentes (PET-0); UX completa e bloqueio de pedido sem transporte adequado → PET-2.
