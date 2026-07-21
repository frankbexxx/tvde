# PARTNER-FLEET-2 — Smoke final (2026-07-21)

**Estado:** **PASS**  
**`main`:** `8921bd5` (merge [#429](https://github.com/frankbexxx/tvde/pull/429); cadeia [#427](https://github.com/frankbexxx/tvde/pull/427) + [#428](https://github.com/frankbexxx/tvde/pull/428) + [#429](https://github.com/frankbexxx/tvde/pull/429)).  
**Runbook:** [`PARTNER_FLEET_2_VEHICLES.md`](./PARTNER_FLEET_2_VEHICLES.md)  
**Pré-condição:** PARTNER-FLEET-1A **PASS** · Partner ops base.

**Handoff vivo:** [`BACKLOG_POST_PILOTO.md`](../meta/BACKLOG_POST_PILOTO.md)

---

## Cadeia de PRs

| PR | Slice | Nota |
|----|--------|------|
| [#427](https://github.com/frankbexxx/tvde/pull/427) | PF2A backend | Vehicle · API · assign · plate UNIQUE global |
| [#428](https://github.com/frankbexxx/tvde/pull/428) | PF2B UI | Frota → Viaturas · lista motoristas com placa |
| [#429](https://github.com/frankbexxx/tvde/pull/429) | PF2C categorias | `service_categories` multi + chips Driver |

---

## Checklist observado

| # | Passo | Resultado |
|---|--------|-----------|
| 1 | Criar viatura | PASS |
| 2 | Editar viatura | PASS |
| 3 | Categorias multi / chips | PASS |
| 4 | Sem texto livre em categoria | PASS |
| 5 | Associar motorista | PASS |
| 6 | Lista motoristas mostra matrícula | PASS |
| 7 | «Em viagem» continua OK | PASS |
| 8 | Completar viagem: mantém matrícula + remove badge | PASS |
| 9 | CSV continua OK | PASS |
| 10 | CSV com `estimated_price` / `final_price` | PASS |
| 11 | Matrícula duplicada bloqueia | PASS |
| 12 | Desassociação: remove do motorista, viatura permanece | PASS |

---

## Fora de scope (confirmado)

| Item | Estado |
|------|--------|
| Documentos de viatura / upload | Fora de scope |
| Histórico de associações | Fora de scope |
| Admin CRUD de viaturas | Fora de scope |
| Matching por viatura | Fora de scope (matching = `drivers.vehicle_categories`) |
| Stripe / payments | Fora de scope |
| Passenger / Driver / NAV | Sem alteração neste slice |
| env / secrets · DB cleanup | Fora de scope |

---

## Observações (não blockers)

| ID | Observação |
|----|------------|
| **Smoke intermédio 2026-07-20** | PASS funcional pré-PF2C; bloqueador leve = categorias input livre → resolvido em #429 |
| **Receita / CSV 1A** | Regressão OK após PF2 |

---

## Próximos naturais

1. Vehicle documents  
2. Alertas de caducidade  
3. Compliance gates / bloqueios legais  
4. Turnos / check-in / check-out  
5. Relatórios por motorista / viatura / período  

---

## Conclusão

**PARTNER-FLEET-2 = PASS.**

Viaturas Partner (CRUD, associação 0/1, categorias multi alinhadas com Driver) validadas em smoke real após #427–#429 em `8921bd5`.
