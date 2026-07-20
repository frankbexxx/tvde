# PARTNER-FLEET-1A — Fleet roster + CSV/relatório €

**Estado:** merged (#423) · smoke parcial PASS (roster + €) · CSV download fix em `fix/partner-csv-download`  
**Base:** `main` `eb49cc2` (+ CSV-FIX).  
**Pré-condição:** Partner ops base (D-DEMO-1) · Admin ≠ dispatcher.

**Handoff:** [`BACKLOG_POST_PILOTO.md`](../meta/BACKLOG_POST_PILOTO.md) · PARTNER-FLEET-1 (slice A; viaturas ficam para slice maior).

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
| 4 | Docs / smoke | Este ficheiro |

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

## Smoke manual proposto

| # | Passo | Esperado |
|---|--------|----------|
| 1 | Login Partner | Frota carrega |
| 2 | Passenger cria trip; Driver da frota aceita / ongoing | Lista frota: badge **Em viagem** |
| 3 | Driver completa | Badge some |
| 4 | Home / Relatórios | Concluídas hoje + receita € actualizam |
| 5 | Export CSV | Download `partner_trips_export.csv` com `estimated_price` / `final_price` |
| 5b | Feedback Relatórios | «A exportar…» / erro visível / «CSV descarregado» |
| 6 | Admin / Passenger / Driver | Sem regressão intencional |

### CSV download (PARTNER-FLEET-1A-CSV-FIX)

- FE: `triggerBlobDownload` — append `<a>` ao DOM + `revokeObjectURL` atrasado (1s).
- FE: erro/sucesso visíveis no ecrã Relatórios (não só `sr-only`).
- BE micro: query param interno `status` → `status_filter` (alias HTTP `status` inalterado).

---

## Notas

- «Receita» = soma bruta da app, **não** payout Stripe.  
- `passenger_id` no CSV é UUID (já existia); não se exporta telefone/nome do passageiro.
