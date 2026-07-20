# PARTNER-FLEET-2 — Vehicles + associação motorista↔viatura

**Estado:** PF2A backend **merged** (`7a5ca81` / [#427](https://github.com/frankbexxx/tvde/pull/427)) · PF2B frontend **em curso**  
**Pré-condição:** PARTNER-FLEET-1A **PASS** · Partner ops base.

**Handoff:** [`BACKLOG_POST_PILOTO.md`](../meta/BACKLOG_POST_PILOTO.md) · slice seguinte após 1A.

---

## Objectivo

Introduzir entidade **Vehicle** própria e permitir ao Partner gerir viaturas e associação **0/1 ↔ 0/1** com motoristas da frota — sem alterar matching, docs de viatura, Admin CRUD, Stripe.

---

## PF2A — Backend (feito)

| Item | Detalhe |
|------|---------|
| Tabela `vehicles` | `partner_id`, `plate`, `plate_normalized` **UNIQUE global**, make/model, year/color, `service_category`, status |
| `drivers.active_vehicle_id` | FK nullable + UNIQUE (Postgres: vários NULL) |
| API Partner | `GET/POST /partner/vehicles`, `GET/PATCH …/{id}`, `POST …/assign`, `POST …/unassign` |
| `PartnerDriverItem` | `active_vehicle_id`, `vehicle_plate/make/model/service_category` |
| Matching | **Intacto** — continua `drivers.vehicle_categories` |
| Docs viatura | Continuam em `drivers.documents` (`inspecao_viatura`) — fora deste slice |

### Regras assign

- Driver e vehicle do mesmo partner.
- Se vehicle já noutro driver → **409** `vehicle_already_assigned` (sem swap silencioso).
- Se driver já tinha outra viatura → desassocia a anterior e fica com a nova.
- Unassign idempotente.

---

## PF2B — Frontend Partner (este slice)

| Superfície | Comportamento |
|------------|----------------|
| Frota → **Viaturas** | Lista, criar, editar, associar/desassociar |
| Lista motoristas | Mostra matrícula quando associada; badge **Em viagem** (1A) intacto |
| Erros | 409 matrícula duplicada / viatura já atribuída — mensagem clara |

### Fora de scope (2B)

- Upload / docs de viatura · histórico · Admin CRUD · matching · Stripe · Passenger/Driver/NAV · migrations novas

---

## Smoke manual (após deploy PF2B)

| # | Passo | Esperado |
|---|--------|----------|
| 1 | Partner → Frota → Viaturas | Ecrã lista |
| 2 | Criar viatura | Aparece na lista |
| 3 | Associar a motorista da frota | Lista viaturas + lista motoristas com matrícula |
| 4 | Trip: aceitar/iniciar | **Em viagem** OK; matrícula continua |
| 5 | Desassociar | Matrícula some da lista motoristas |
| 6 | Matrícula duplicada | Erro claro |
| 7 | Regressão 1A | € hoje + CSV intactos |

---

## Próximo (após 2B PASS)

1. Documentos na entidade Vehicle (migrar `inspecao_viatura`)  
2. Relatórios por motorista / período  
3. Admin recovery assign (opcional)  
