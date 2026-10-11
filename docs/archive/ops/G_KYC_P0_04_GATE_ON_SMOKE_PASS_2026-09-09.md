# G-KYC-P0-04 — Vehicle compliance gate ON (PROD) — Smoke PASS (2026-09-09)

**Estado:** **CLOSED / PASS**  
**Flag:** `ENABLE_VEHICLE_COMPLIANCE_GATES=true` (Render `tvde-api`)  
**Health:** `https://tvde-api-fd2z.onrender.com/health` → 200  
**Trip smoke:** `e9d31238-a76c-426a-aed6-98f927f7cf8f` (created → accepted → cancelled)

## Resumo da cadeia

| Passo | Resultado |
|-------|-----------|
| Seed demo local (4 Drivers) | PASS (#563) |
| Sync PROD non-wipe soft (roster 3) | PASS (#564 / #565) |
| Apply PROD demo | PASS (action_count=14) |
| Re-audit 3/3 compliant · would_block=0 | PASS |
| Controlled PROD smoke (gate ON) | **PASS** |
| Negative PROD mutation | **NÃO** — cobertura automatizada retida |

## Smoke (DEMO only)

| Check | Resultado |
|-------|-----------|
| go_online | PASS (`+351911111111` / Manel) |
| list_available_trips | PASS |
| matching | PASS (offers aos 2 compliant; **sem** oferta a Driver sem `active_vehicle`) |
| accept | PASS (`+351911111111` · `11-AA-22`) |
| compliance 409 inesperado | NÃO |
| trip cancelada | SIM |
| active trips demo finais | 0 |
| rollback flag | NÃO necessário |

## Lado a lado (não fechados)

- Docs pessoais Driver (FE gate / BE) — aberto  
- PF3D-4 UX rica Admin — aberto  
- IMT / A6 processo legal completo — aberto  
- M1 — **não** reabrir
