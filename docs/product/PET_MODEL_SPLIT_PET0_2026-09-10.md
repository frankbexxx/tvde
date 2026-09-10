# PET — modelo e roadmap

**Actualização:** 2026-09-10  
**Estado:** **PET-0 → PET-5A.1** — **feature Pet NÃO concluída** globalmente (falta PET-5A.2+ / 5B / 5C)

## Decisão de produto

- Pricing por categoria: **GO** (`x`) · **Comfort** · **XL** *(tarifário completo = A2.5 / ainda não)*
- Pet = atributo adicional; surcharge **€1,50**; **cão de assistência** **€0**
- Comissão 15% sobre total (fare + surcharge)
- Máximo **1 animal comum** por viagem (V1 operacional)
- Terminologia legal V1: **«Cão de assistência»** / EN **«Assistance dog»**  
  (campo interno `is_assistance_animal` mantido por compatibilidade)

## Matching (PET-5A.1)

Driver elegível para viagem com animal comum **ou** cão de assistência se:

- fare category compatível
- vehicle compliance OK
- capacity suficiente (quando gate ON)
- restantes gates normais

**Não** exige preferência Driver `pet`.

`pet` preference: **retained as legacy/non-enforcing state** (API/coluna podem existir; UI leave-out; matching ignora).

Legacy `vehicle_category=pet`: legível; matching como fare `x`; **sem** reescrita de histórico.

## Transporte / acondicionamento (PET-5A.1)

- `carrier` e `harness` = meios de acondicionamento/segurança (não obrigação legal específica na copy)
- Size + transport obrigatórios para animal comum
- **large + carrier permitido** (removido bloqueio absoluto)
- Copy neutra: animal deve viajar devidamente acondicionado e em segurança

## Capacidade (PET-4) — inalterada em PET-5A.1

```text
occupied_pet_seats =
  1 if pet_occupies_seat and (has_pet or is_assistance_animal)
  0 otherwise

required_passenger_capacity = passenger_count + occupied_pet_seats

Vehicle elegível se max_passengers >= required_passenger_capacity
```

- Gate: `ENABLE_VEHICLE_CAPACITY_GATES` (PROD: **ON** após rollout PET-4)

## PET-0 → PET-4 — DONE

Fundação · surcharge · Passenger/Driver UX · matching Pet (pré-5A.1) · capacity + PROD rollout PASS

## PET-5A.1 — DONE (esta entrega)

| Item | Estado |
|------|--------|
| Remover Pet opt-in do matching | DONE |
| Driver toggle «Aceito viagens com animais» fora da UI | DONE |
| `pet` preference legacy/non-enforcing | DONE |
| Copy «Cão de assistência» / Assistance dog | DONE |
| Remover bloqueio large+carrier | DONE |
| Validação passenger sem porte×transporte absoluto | DONE |
| Capacity / surcharge / Stripe | **não alterados** |
| Motivo atendível de recusa/cancel | **PET-5A.2** (não nesta PR) |

## Etapas restantes

| ID | Item | Notas |
|----|------|-------|
| PET-5A.2 | Fluxo recusa/cancel por motivo atendível (animal) | Discovery + reason codes |
| PET-5B | Reporting Partner/Admin (campos Pet) | |
| PET-5C | E2E Playwright Pet/capacity | |
| — | Taxa limpeza/danos | Fora do MVP |
| — | Upload ID cão de assistência | Fora desta fase |

**Não marcar feature Pet CLOSED.**
