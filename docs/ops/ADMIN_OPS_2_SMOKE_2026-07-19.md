# ADMIN-OPS-2 — Smoke trip support surface (2026-07-19)

**Estado:** **PASS**  
**`main`:** `61ad836` (merge [#421](https://github.com/frankbexxx/tvde/pull/421)).  
**Versão na app:** `v1.0.0 · 61ad836`.  
**Ambiente:** 3 janelas (Passenger · Driver · Admin).  
**Health Admin (antes/durante):** `ok` · sem linhas de anomalia · pagamentos presos **0**.

**Runbook:** [`ADMIN_OPS_2_TRIP_SUPPORT_SURFACE.md`](./ADMIN_OPS_2_TRIP_SUPPORT_SURFACE.md)  
**Pré-condição:** ADMIN-OPS-1 Fase 0 B/C **PASS** · Admin ≠ dispatcher diário.

**Handoff vivo:** [`TODOdoDIA.md`](../../TODOdoDIA.md) · [`BACKLOG_POST_PILOTO.md`](../meta/BACKLOG_POST_PILOTO.md)

---

## Fluxo

| Campo | Valor |
|-------|--------|
| **Fluxo** | requested → accepted → (Admin) arriving → (Admin) ongoing → completed (Driver) |
| **Pagamento** | `processing` durante a viagem (esperado) → `succeeded` após complete |

---

## Checklist observado

| # | Passo | Resultado |
|---|--------|-----------|
| 1 | Passenger cria viagem | PASS |
| 2 | Driver aceita | PASS |
| 3 | Admin vê trip `accepted` | PASS |
| 4 | Detalhe suporte: estado lista/API, `payment_status`, preço, timestamps, PI mock/teste | PASS |
| 5 | Admin força `accepted → arriving` | PASS |
| 6 | Timeline / Acções Admin: «Transição de estado» | PASS |
| 7 | Admin força `arriving → ongoing` | PASS |
| 8 | Passenger: «Viagem em curso» | PASS |
| 9 | Driver: «Em viagem» | PASS |
| 10 | Admin mostra `ongoing` | PASS |
| 11 | Em `ongoing`, Admin **sem** complete/cancel/fail | PASS (fora de scope confirmado) |
| 12 | Driver termina normalmente | PASS |
| 13 | Passenger: painel de avaliação | PASS |
| 14 | Driver: «Viagem concluída» | PASS |
| 15 | Admin: `completed` | PASS |
| 16 | Payment `succeeded` | PASS |
| 17 | Histórico/detalhe: `payment_status` succeeded + timestamps | PASS |

---

## SKIP / não confirmado

| Item | Estado | Notas |
|------|--------|-------|
| Assign copy «Atribuir (recuperação)» | **SKIP** (smoke) | Coberto por RTL / labels; validação visual parcial se aplicável |
| Nota operacional (payment ops note) na timeline | **SKIP** | Não exercitada neste smoke |
| Playbook Saúde ongoing longo (texto na UI Saúde) | **N/A** | Health limpa — sem anomalia ongoing para abrir o playbook |

---

## Observações (não blockers)

| ID | Observação |
|----|------------|
| **R-ADMIN-TIMELINE-JSON** | Timeline ainda mostra payload JSON cru — melhoria futura de legibilidade |
| **Payment processing mid-trip** | Esperado em mock/fluxo actual; após complete ficou `succeeded` |
| **Ongoing close Admin** | Continua fora de scope; fecho correcto = Driver |

---

## Conclusão

**ADMIN-OPS-2 smoke = PASS.**

Surface de suporte no detalhe da trip (campos + timeline + honesty de limites) validada em fluxo real Pax/Driver/Admin em `61ad836`. Assign recovery copy e polish da timeline ficam como rasto não bloqueante.
