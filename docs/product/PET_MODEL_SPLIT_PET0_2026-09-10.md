# PET — modelo e roadmap

**Actualização:** 2026-09-10  
**Estado:** **PET-0 → PET-5A.2** — **feature Pet NÃO concluída** globalmente (falta PET-5B / PET-5C)

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

`pet` preference: **retained as legacy/non-enforcing state**.

## Motivo atendível (PET-5A.2)

Códigos canónicos (backend source of truth):

- `animal_safety_risk`
- `animal_hygiene_issue`
- `animal_health_concern`
- `inadequate_accommodation`
- `other_attendable_reason` (free text obrigatório, max 280, uso interno/audit)

### Pré-accept
Viagens com animal / cão de assistência: reject formal **exige** `reason_code` (+ detail se other).  
Viagens sem animal: reject legado sem body.

### Pós-accept
Cancel Driver com animal: `reason_code` obrigatório.  
Cancel normal: presets legacy (`reason` string) mantidos.

### Visibilidade
- **Passenger:** só label segura (nunca free text do Driver)
- **Partner/Admin:** code + label + detail interno + `cancelled_by` + flag Pet / cão de assistência
- Sem fotos/evidência / disputa nesta fase

Campos: `trips.cancellation_reason_code`; `trip_offers.rejection_reason_code` + `rejection_reason_detail`; `cancellation_reason` guarda detail/legacy.

## Capacidade (PET-4)

Gate: `ENABLE_VEHICLE_CAPACITY_GATES` (PROD: **ON**)

## PET-0 → PET-5A.2 — DONE

Fundação · surcharge · Passenger/Driver UX · matching · capacity · legal copy PET-5A.1 · motivos atendíveis PET-5A.2

## Etapas restantes

| ID | Item | Notas |
|----|------|-------|
| PET-5B | Reporting Partner/Admin Pet (CSV / listagens amplas) | audit mínimo já em 5A.2 |
| PET-5C | E2E Playwright Pet/capacity | |
| — | Taxa limpeza/danos | Fora do MVP |
| — | Upload ID cão de assistência | Fora desta fase |

**Não marcar feature Pet CLOSED.**
