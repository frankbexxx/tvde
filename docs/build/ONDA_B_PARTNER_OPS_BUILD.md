# Onda B — Partner ops (build)

**Branch:** `feat/onda-b-partner-ops`  
**PR título:** `feat(partner): onda B — remover motorista, trips enriquecidas, filtros`  
**Depende de:** merge `main` (Onda A mergeada ou não — independente)

---

## Objetivo

Partner consegue offboarding básico e operar viagens com dados úteis (coords, preço), sem mapa ainda.

---

## Checklist técnico

### P1 — Remover motorista da frota

| # | Tarefa | Ficheiros |
|---|--------|-----------|
| B1 | BE: `DELETE /partner/drivers/{user_id}/from-fleet` ou `POST .../remove-from-fleet` | `backend/app/api/routers/partner.py`, `backend/app/services/partners_admin.py` (reutilizar `unassign_driver_from_partner`) |
| B2 | BE: validar partner_id scope; 409 se motorista em viagem activa | service layer |
| B3 | BE: teste pytest (modelar em `test_partner_fleet_api.py`) | `backend/tests/` |
| B4 | FE: `removeDriverFromFleet()` em `api/partner.ts` | `web-app/src/api/partner.ts` |
| B5 | FE: botão «Remover da frota» + `confirm()` em detalhe motorista | `PartnerDriverDetail.tsx` |
| B6 | FE: mensagens erro PT (em viagem, não encontrado) | idem |

### P3 — Viagens enriquecidas

| # | Tarefa | Ficheiros |
|---|--------|-----------|
| B7 | BE: estender `PartnerTripItem`: `origin_lat/lng`, `destination_lat/lng`, `estimated_price`, `final_price?`, `cancel_reason?` | `backend/app/schemas/partner.py`, `partner.py` router `_trip_item` |
| B8 | FE: tipos `PartnerTripRow` | `api/partner.ts` |
| B9 | FE: detalhe viagem mostra coords, preço, link mapa externo opcional | `PartnerTripDetail.tsx` |
| B10 | FE: reverse geocode opcional (reutilizar `geocoding.ts`) para moradas legíveis | `PartnerTripDetail.tsx` |

### P3 — Filtros e pesquisa

| # | Tarefa | Ficheiros |
|---|--------|-----------|
| B11 | FE: filtros motorista (select), estado (chips existentes ok), data (input date from/to client-side) | `PartnerHome.tsx` |
| B12 | FE: corrigir placeholder pesquisa — «ID viagem, nome ou telefone motorista» só se implementado; senão «ID viagem ou filtrar motorista» | `PartnerHome.tsx` |
| B13 | FE: reassign UX — mensagem clara quando não `assigned`; disable select | `PartnerTripDetail.tsx` |

### P6 parcial — KPIs motorista

| # | Tarefa | Ficheiros |
|---|--------|-----------|
| B14 | FE: secção no detalhe motorista — viagens concluídas/canceladas (contar de lista trips client-side ou endpoint se já existir) | `PartnerDriverDetail.tsx` |

---

## Testes / validação

```bash
cd backend && pytest tests/test_partner_fleet_api.py tests/test_partner_c001_c008.py -v
cd web-app && npm run build
cd web-app && npx playwright test partner-shell  # se existir
```

---

## Não fazer (Onda B)

- Mapa live (Onda C)
- Inbox (Onda D)
- Reassign fora de `assigned` (sem alterar `partner_trip_ops.py`)
- Upload documentos
- Pagamentos / comissões

---

## PROMPT — executar Onda B

```
Implementa ONDA B — Partner ops conforme docs/build/ONDA_B_PARTNER_OPS_BUILD.md

Regras:
- Branch feat/onda-b-partner-ops → commit + PR
- P1: endpoint partner remove-from-fleet + UI confirm
- P3: PartnerTripItem com coords/preço/cancel_reason; detalhe viagem; filtros; pesquisa honesta
- Reassign: melhorar UX; backend mantém só assigned
- KPIs simples no detalhe motorista
- pytest partner; build web-app
- Não mapa, inbox, docs upload, Stripe, auth
- Resumo curto no fim
```
