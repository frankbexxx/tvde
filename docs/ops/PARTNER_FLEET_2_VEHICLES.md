# PARTNER-FLEET-2 — Vehicles + associação motorista↔viatura

**Estado:** **PASS** (smoke final 2026-07-21)  
**`main`:** `8921bd5` — [#427](https://github.com/frankbexxx/tvde/pull/427) PF2A · [#428](https://github.com/frankbexxx/tvde/pull/428) PF2B · [#429](https://github.com/frankbexxx/tvde/pull/429) PF2C.  
**Smoke:** [`PARTNER_FLEET_2_SMOKE_2026-07-21.md`](./PARTNER_FLEET_2_SMOKE_2026-07-21.md)  
**Pré-condição:** PARTNER-FLEET-1A **PASS** · Partner ops base · Admin ≠ dispatcher.

**Handoff:** [`BACKLOG_POST_PILOTO.md`](../meta/BACKLOG_POST_PILOTO.md)

---

## Objectivo

Introduzir entidade **Vehicle** própria e permitir ao Partner gerir viaturas e associação **0/1 ↔ 0/1** com motoristas da frota — sem alterar matching, docs de viatura, Admin CRUD, Stripe.

---

## Cadeia de PRs

| PR | Slice | Tema |
|----|--------|------|
| [#427](https://github.com/frankbexxx/tvde/pull/427) | **PF2A** | Vehicle model + migration + Partner API CRUD + assign/unassign · `plate_normalized` UNIQUE global · tenant-safe |
| [#428](https://github.com/frankbexxx/tvde/pull/428) | **PF2B** | UI Frota → Viaturas · lista/criar/editar · associar/desassociar · matrícula na lista motoristas · «Em viagem» intacto |
| [#429](https://github.com/frankbexxx/tvde/pull/429) | **PF2C** | `service_categories` multi (CSV, vocabulário Driver) · chips · sem texto livre · matching intacto |

---

## Resumo técnico

| Área | Detalhe |
|------|---------|
| Tabela `vehicles` | `partner_id`, `plate`, `plate_normalized` UNIQUE global, make/model, year/color, `service_categories`, status |
| Associação | `drivers.active_vehicle_id` FK nullable + UNIQUE (0/1 ↔ 0/1); sem histórico neste slice |
| API Partner | `GET/POST /partner/vehicles`, `GET/PATCH …/{id}`, `POST …/assign`, `POST …/unassign` |
| Categorias | Mesmos códigos que Driver (`x,xl,pet,comfort,black,electric,van`); CSV; UI chips |
| Matching | **Intacto** — continua `drivers.vehicle_categories` |

### Fora de scope (confirmado)

- Documentos de viatura / upload docs  
- Histórico de associações  
- Admin CRUD de viaturas  
- Matching por viatura  
- Stripe / payments  
- Passenger / Driver / NAV  
- env / secrets · DB cleanup  

---

## Smoke final

Ver checklist completo: [`PARTNER_FLEET_2_SMOKE_2026-07-21.md`](./PARTNER_FLEET_2_SMOKE_2026-07-21.md).

**PARTNER-FLEET-2 = PASS.**

---

## Próximos naturais

1. Vehicle documents  
2. Alertas de caducidade  
3. Compliance gates / bloqueios legais  
4. Turnos / check-in / check-out  
5. Relatórios por motorista / viatura / período  
