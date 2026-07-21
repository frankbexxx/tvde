# PARTNER-FLEET-2 — Vehicles + associação motorista↔viatura

**Estado:** PF2A+2B **merged** · smoke funcional **PASS** (2026-07-20) · **PF2C** categorias multi (em curso)  
**`main` (pré-2C):** `a22df10` ([#427](https://github.com/frankbexxx/tvde/pull/427) + [#428](https://github.com/frankbexxx/tvde/pull/428))  
**Pré-condição:** PARTNER-FLEET-1A **PASS** · Partner ops base.

**Handoff:** [`BACKLOG_POST_PILOTO.md`](../meta/BACKLOG_POST_PILOTO.md)

---

## Objectivo

Introduzir entidade **Vehicle** própria e permitir ao Partner gerir viaturas e associação **0/1 ↔ 0/1** com motoristas da frota — sem alterar matching, docs de viatura, Admin CRUD, Stripe.

---

## Smoke PF2 (2026-07-20) — PASS funcional

| # | Passo | Resultado |
|---|--------|-----------|
| 1 | Criar viatura | PASS |
| 2 | Associar motorista | PASS |
| 3 | Lista motoristas mostra matrícula | PASS |
| 4 | «Em viagem» mantém matrícula | PASS |
| 5 | Completed / remove badge mantém matrícula | PASS |
| 6 | CSV | PASS |
| 7 | Matrícula duplicada | PASS |
| 8 | Desassociação | PASS |

**Bloqueador leve (antes do fecho documental):** categorias da viatura eram input livre → **PF2C**.

---

## PF2A — Backend

| Item | Detalhe |
|------|---------|
| Tabela `vehicles` | `partner_id`, `plate`, `plate_normalized` UNIQUE global, make/model, year/color, status |
| `drivers.active_vehicle_id` | FK nullable + UNIQUE |
| API Partner | CRUD + assign/unassign |
| Matching | **Intacto** — `drivers.vehicle_categories` |

## PF2B — Frontend

Frota → Viaturas: lista / criar / editar / associar; lista motoristas com placa; erros 409.

## PF2C — Categorias multi (este slice)

| Decisão | Detalhe |
|---------|---------|
| Fonte Driver | `VALID_DRIVER_CATEGORIES` + CSV (`encode/decode_driver_categories_csv`) · FE `DRIVER_VEHICLE_CATEGORIES` |
| Persistência Vehicle | `service_categories` Text CSV (mesmo vocabulário: x, xl, pet, comfort, black, electric, van) |
| API | `service_categories: list[str]`; rejeita inválidas (`invalid_service_category`) |
| UI | Chips multi-select (mesmo padrão Driver); sem texto livre |
| Matching | Continua **só** em `drivers.vehicle_categories` |

---

## Próximo (após 2C)

1. Documentos na entidade Vehicle  
2. Relatórios por motorista / período  
3. Admin recovery assign (opcional)  
