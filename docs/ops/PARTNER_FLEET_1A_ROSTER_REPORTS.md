# PARTNER-FLEET-1A — Fleet roster + CSV/relatório €

**Estado:** **PASS** (smoke final 2026-07-20)  
**`main`:** `4152f77` — [#423](https://github.com/frankbexxx/tvde/pull/423) feature · [#424](https://github.com/frankbexxx/tvde/pull/424) CSV-FIX · [#425](https://github.com/frankbexxx/tvde/pull/425) CSV-FIX-2.  
**Smoke:** [`PARTNER_FLEET_1A_SMOKE_2026-07-20.md`](./PARTNER_FLEET_1A_SMOKE_2026-07-20.md)  
**Pré-condição:** Partner ops base (D-DEMO-1) · Admin ≠ dispatcher.

**Handoff:** [`BACKLOG_POST_PILOTO.md`](../meta/BACKLOG_POST_PILOTO.md) · PARTNER-FLEET-1 (slice A fechado; viaturas / docs / associação ficam para slices seguintes).

---

## Objectivo

Melhorar o Partner como ferramenta operacional **normal** da frota: ver quem está em viagem, totais € completed hoje, CSV com preços — **sem migrations** e sem redesign.

---

## Scope

| # | Item | Notas |
|---|------|--------|
| 1 | Roster «Em viagem» | `active_trip_id` / `active_trip_status` em `GET /partner/drivers` (statuses: assigned, accepted, arriving, ongoing); badge + filtro na lista |
| 2 | Relatórios / Home € | `trips_completed_today` + `revenue_completed_today` em `GET /partner/metrics` (receita bruta app: `final_price` ou `estimated_price`) |
| 3 | CSV | Append `estimated_price`, `final_price` no fim; colunas antigas intactas; sem PII passageiro (só `passenger_id`) |
| 4 | Docs / smoke | Este ficheiro + smoke PASS |

### Fora de scope

- Vehicle / motorista↔viatura / docs viatura  
- Editar `commission_percent` · Stripe / payouts  
- Admin · Passenger · Driver · NAV · matching · migrations · env · cleanup DB  

---

## Tenant-safety

- Drivers e trips sempre filtrados por `Driver.partner_id == ctx.partner_id` (`get_current_partner`).  
- Metrics e CSV usam o mesmo JOIN Trip→Driver.  
- Motorista de outro partner **não** aparece nem contribui para €.

## Migrations

**Nenhuma.** Apenas serialização/API read-only + UI.

---

## Smoke manual (resultado final)

| # | Passo | Resultado |
|---|--------|-----------|
| 1 | Login Partner · Home / Relatórios métricas | **PASS** |
| 2 | Driver em viagem na frota (mapa / lista) | **PASS** |
| 3 | Driver completa → sai de «Em viagem» | **PASS** |
| 4 | Receita hoje actualiza (ex.: 1.54) | **PASS** |
| 5 | Relatórios → Descarregar CSV | **PASS** |
| 6 | Viagens → Exportar CSV | **PASS** |
| 7 | Dois caminhos → ficheiros iguais; colunas preço | **PASS** |

Detalhe: [`PARTNER_FLEET_1A_SMOKE_2026-07-20.md`](./PARTNER_FLEET_1A_SMOKE_2026-07-20.md).

### CSV download (cadeia de fixes)

| PR | Fix |
|----|-----|
| #424 | `triggerBlobDownload` — append `<a>` + `revokeObjectURL` atrasado; feedback em Relatórios |
| #425 | `partnerTripsExportUrl` — string + `URLSearchParams` (não `new URL` sem base); feedback em Viagens → Exportar; funciona com `API_BASE='/api'` e absoluto |
| BE (micro, #424) | Query param interno `status` → `status_filter` (alias HTTP `status` inalterado) |

---

## Notas

- «Receita» = soma bruta da app, **não** payout Stripe.  
- `passenger_id` no CSV é UUID (já existia); não se exporta telefone/nome do passageiro.

## Próximo Partner / Fleet

1. **PARTNER-FLEET-2** — viaturas + associação → **PASS** ([`PARTNER_FLEET_2_SMOKE_2026-07-21.md`](./PARTNER_FLEET_2_SMOKE_2026-07-21.md))  
2. Documentos de viatura / caducidade / compliance  
3. Relatórios por motorista / viatura / período  
4. Turnos / check-in / check-out (futuro)  
