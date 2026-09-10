# PET — modelo e roadmap

**Actualização:** 2026-09-10  
**Estado:** **PET FEATURE = CLOSED** (PET-0 → PET-5C)

## Decisão de produto

- Pricing por categoria: **GO** (`x`) · **Comfort** · **XL** *(tarifário completo = A2.5 / ainda não)*
- Pet = atributo adicional; surcharge **€1,50**; **cão de assistência** **€0**
- Comissão 15% sobre total (fare + surcharge)
- Máximo **1 animal comum** por viagem (V1 operacional)
- Terminologia legal V1: **«Cão de assistência»** / EN **«Assistance dog»**

## Matching (PET-5A.1)

Sem opt-in Driver `pet` (legacy/non-enforcing). Fare + compliance + capacity.

## Motivo atendível (PET-5A.2)

Códigos canónicos + reject/cancel estruturado; Passenger só vê label segura; Partner/Admin vêem detail.

## Reporting Partner/Admin (PET-5B)

### Partner
- **Lista:** chips compactos — passageiros · Com animal / Cão de assistência · suplemento se >0
- **Detalhe:** passageiros · bloco animal · price breakdown · cancel audit · offer rejections · viatura/placa
- **CSV** (`GET /partner/trips/export`): colunas estáveis antigas + no fim:
  `passenger_count`, `has_pet`, `is_assistance_animal`, `pet_size`, `pet_transport`,
  `pet_occupies_seat`, `pet_surcharge_amount`, `cancellation_reason_code`,
  `cancellation_reason_detail`, `cancelled_by`, `vehicle_category`, `vehicle_plate`

### Admin
- **Lista activa/histórico:** passageiros · badge animal · suplemento · cancel label/`cancelled_by`
- **Support detail:** conjunto completo (size/transport/seat/surcharge/breakdown/plate/rejections)

Sem migration (campos já existentes). Sem alterar matching/pricing/capacity/Stripe.

## Capacidade (PET-4)

- Gate: `ENABLE_VEHICLE_CAPACITY_GATES`
- **PROD:** rollout **PASS** — flag **ON** (`true`)
- **CI web-e2e:** flag **ON** (espelha PROD; não altera PROD)
- Seed demo E2E: veículos com `max_passengers=4` (`/dev/seed` → `DEMO-E2E-01`)

## PET-0 → PET-5C — DONE

| ID | Item | Estado |
|----|------|--------|
| PET-0 | Model split (fare vs Pet attribute) | DONE |
| PET-1 | Surcharge €1,50 / assistência €0 | DONE |
| PET-2 | Passenger UX | DONE |
| PET-3 | Driver UX | DONE |
| PET-4 | Capacity enforcement | DONE (PROD ON) |
| PET-5A.1 | Legal matching (sem opt-in Pet) | DONE |
| PET-5A.2 | Motivos atendíveis estruturados | DONE |
| PET-5B | Partner/Admin reporting | DONE |
| PET-5C | E2E Playwright (API-first) + closure | DONE |

## PET-5C E2E

Suite: `web-app/e2e/pet-feature.spec.ts` (+ helpers `e2e/helpers/petApiFlow.ts`)

- E2E-1 baseline normal
- E2E-2 GO + animal pequeno + surcharge
- E2E-3 Comfort + animal ocupa lugar
- E2E-4 Cão de assistência (€0, sem opt-in)
- E2E-5 capacity exact (4/4)
- E2E-6 capacity blocked (5 required → list exclude + accept 409)
- Attendable reject + cancel (Passenger label segura)
- Partner/Admin reporting mínimos

Correr targeted: `npm run test:e2e:pet` (API com `ENABLE_VEHICLE_CAPACITY_GATES=true`).

## Fora de scope (não bloqueiam CLOSED)

| Item | Notas |
|------|-------|
| Taxa limpeza/danos | Fora do MVP |
| Upload ID cão de assistência | Fora desta fase |
| Dispute system / analytics / portagens | Fora |

**PET FEATURE = CLOSED**
