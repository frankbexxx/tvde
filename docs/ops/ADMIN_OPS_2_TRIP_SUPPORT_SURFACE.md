# ADMIN-OPS-2 — Admin trip support surface

**Estado:** implementação (branch `feat/admin-trip-support-surface`)  
**Pré-condição:** ADMIN-OPS-1 Fase 0 B/C **PASS**; Admin ≠ dispatcher diário.

**Handoff:** [`TODOdoDIA.md`](../../TODOdoDIA.md) · [`BACKLOG_POST_PILOTO.md`](../meta/BACKLOG_POST_PILOTO.md)

---

## Objectivo

Melhorar a capacidade do Admin de perceber **o que aconteceu** numa trip e actuar só dentro dos limites já seguros (suporte, correcção, auditoria, recuperação).

**Não** transformar o Admin em dispatcher nem fechar `ongoing` pelo Admin.

---

## Scope entregue

| # | Item | Notas |
|---|------|--------|
| 1 | Trip detail legível | `payment_status`, `cancelled_by`, `cancellation_reason`, timestamps (`created` / `updated` / `started` / `completed`; `cancelled_at` só se a API o enviar — BD sem coluna) |
| 2 | Linha temporal | `GET /admin/audit-trail?entity_type=trip&entity_id=` — assign, transition, cancel, ops note, reconcile trip-scoped |
| 3 | Playbook ongoing | Texto honesto: Driver fecha; cron/timeouts/recover; nota ops; escalamento — **sem** «cancelar via Admin» em ongoing |
| 4 | Assign copy | «Atribuir (recuperação)» + tooltip; lógica de assign **inalterada** |
| 5 | Docs / smoke | Este runbook |

### Fora de scope (continua)

- Admin complete / cancel / fail em **ongoing**
- Mudança de máquina de estados, matching, Stripe writes, migrations, Passenger/Driver/NAV/Partner
- Dispatch diário pelo Admin

---

## Smoke manual proposto

| # | Passo | Esperado |
|---|--------|----------|
| 1 | Passenger cria trip; Driver aceita | Activas: `accepted` |
| 2 | Admin força `accepted → arriving` | Detalhe + timeline com transição |
| 3 | Admin força `arriving → ongoing` | Estado `ongoing`; **sem** botões complete/cancel/fail Admin |
| 4 | Saúde → playbook ongoing longo | Texto pede Driver / cron / nota ops — sem cancel Admin |
| 5 | Driver termina | Histórico `completed` com `payment_status` visível |
| 6 | (opc.) Nota ops no detalhe | Aparece na linha temporal |

---

## Notas técnicas

- `cancelled_by` exposto em `TripDetailResponse` (read-only; já existia na BD).
- Notas `payment_ops_note` passam a gravar `entity_type=trip` para aparecerem na timeline da viagem (`payment_id` no payload).
- Timeline só lista eventos `admin.*` — não substitui o histórico de domínio Driver/Passenger.
