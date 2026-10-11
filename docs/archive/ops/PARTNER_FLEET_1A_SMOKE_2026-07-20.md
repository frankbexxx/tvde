# PARTNER-FLEET-1A — Smoke final (2026-07-20)

**Estado:** **PASS**  
**`main`:** `4152f77` (merge [#425](https://github.com/frankbexxx/tvde/pull/425); feature [#423](https://github.com/frankbexxx/tvde/pull/423) + CSV [#424](https://github.com/frankbexxx/tvde/pull/424) + FIX-2 [#425](https://github.com/frankbexxx/tvde/pull/425)).  
**Runbook:** [`PARTNER_FLEET_1A_ROSTER_REPORTS.md`](./PARTNER_FLEET_1A_ROSTER_REPORTS.md)  
**Pré-condição:** Partner ops base (D-DEMO-1) · Admin ≠ dispatcher.

**Handoff vivo:** [`BACKLOG_POST_PILOTO.md`](../meta/BACKLOG_POST_PILOTO.md) · PARTNER-FLEET-1 (slices seguintes: viaturas, docs, relatórios por período).

---

## Cadeia de PRs

| PR | Tema | Nota |
|----|------|------|
| [#423](https://github.com/frankbexxx/tvde/pull/423) | Roster «Em viagem» + métricas € + colunas CSV preço | Feature |
| [#424](https://github.com/frankbexxx/tvde/pull/424) | Blob download + feedback Relatórios | CSV-FIX |
| [#425](https://github.com/frankbexxx/tvde/pull/425) | `partnerTripsExportUrl` relativo/absoluto + feedback Export | CSV-FIX-2 |

---

## Checklist observado

| # | Passo | Resultado |
|---|--------|-----------|
| 1 | Partner Home / Relatórios — métricas | PASS |
| 2 | Driver em viagem na frota (mapa / lista) | PASS |
| 3 | Driver completa → sai de «Em viagem» | PASS |
| 4 | Receita hoje actualiza (ex.: **1.54**) | PASS |
| 5 | Relatórios → Descarregar CSV | PASS |
| 6 | Viagens → Exportar CSV | PASS |
| 7 | Ficheiros dos dois caminhos iguais | PASS |
| 8 | CSV com `estimated_price` / `final_price` | PASS |

---

## Fora de scope (confirmado)

| Item | Estado |
|------|--------|
| Viaturas / motorista↔viatura / docs viatura | Fora de scope |
| Comissão / edit / payouts Stripe | Fora de scope |
| Admin / Passenger / Driver / NAV / migrations | Sem alteração neste slice |

---

## Observações (não blockers)

| ID | Observação |
|----|------------|
| **CSV dois caminhos** | Relatórios e Viagens → Exportar OK e ficheiros iguais após #425 |
| **Receita** | Soma bruta app (`final_price` / `estimated_price`), não payout Stripe |

---

## Próximo Partner / Fleet (provável)

1. Viaturas / associação motorista↔viatura  
2. Documentos de viatura  
3. Relatórios por motorista / período  
4. Polish visual se necessário  

---

## Conclusão

**PARTNER-FLEET-1A = PASS.**

Roster «Em viagem», métricas € do dia, e export CSV (dois caminhos) validados em smoke real após #423–#425 em `4152f77`.
