# PET — modelo e roadmap

**Actualização:** 2026-09-10  
**Estado:** **PET-0 → PET-5B** — **feature Pet NÃO concluída** globalmente (falta PET-5C E2E)

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

Gate: `ENABLE_VEHICLE_CAPACITY_GATES` (PROD: **ON**)

## PET-0 → PET-5B — DONE

## Etapas restantes

| ID | Item | Notas |
|----|------|-------|
| PET-5C | E2E Playwright Pet/capacity/motivos | |
| — | Taxa limpeza/danos | Fora do MVP |
| — | Upload ID cão de assistência | Fora desta fase |

**Não marcar feature Pet CLOSED.**
