# ADMIN-OPS-1 — Smoke Fase 0 B/C (2026-07-19)

**Estado:** **PASS**  
**`main`:** `590aea3` (inclui #413 passenger active-trip recovery).  
**Ambiente:** app via `backend/.env` → Render `ride_db_wypz`; 3 janelas (Passenger · Driver · Admin).  
**Pré-condição:** BD limpa de trips activas (cleanup pontual da órfã pytest `8cf0d094-…`); baseline sem trips activas.

**Handoff vivo:** [`TODOdoDIA.md`](../../TODOdoDIA.md) · [`PROXIMA_SESSAO.md`](../meta/PROXIMA_SESSAO.md) · [`BACKLOG_POST_PILOTO.md`](../meta/BACKLOG_POST_PILOTO.md)

**Decisão produto (prévia):** Admin ≠ dispatcher — [`BACKLOG_POST_PILOTO.md`](../meta/BACKLOG_POST_PILOTO.md) · ADMIN-OPS-1. **1B Assign** = SKIP (recovery SA, não ops normal).

---

## Trip do smoke

| Campo | Valor |
|-------|--------|
| **id** | `bd904271-…` (prefixo observado) |
| **Preço** | estimado/final ~**1.59 €** |
| **Fluxo** | requested → accepted → (Admin) arriving → (Admin) ongoing → completed (Driver) |

---

## Checklist observado

| # | Passo | Resultado |
|---|--------|-----------|
| 1 | Passenger cria viagem | PASS |
| 2 | Driver aceita | PASS |
| 3 | Admin > Viagens > Activas mostra `accepted` | PASS |
| 4 | Admin força `accepted → arriving` | PASS |
| 5 | Passenger: «Motorista quase a chegar» | PASS |
| 6 | Driver: «No local de recolha» | PASS |
| 7 | Admin mostra `arriving` | PASS |
| 8 | Admin força `arriving → ongoing` | PASS |
| 9 | Passenger: «Viagem em curso» | PASS |
| 10 | Driver: «Em viagem» | PASS |
| 11 | Admin mostra `ongoing` | PASS |
| 12 | Em `ongoing`, Admin **sem** complete/cancel/fail — só detalhe | PASS (gap real confirmado) |
| 13 | Driver termina normalmente | PASS |
| 14 | Passenger painel de avaliação | PASS |
| 15 | Driver «Viagem concluída» → idle | PASS |
| 16 | Admin > Histórico: `completed` | PASS |

---

## SKIP / não confirmado

| Item | Estado | Notas |
|------|--------|-------|
| Nota operacional (payment ops note) | **SKIP** | Não validada neste smoke |
| Reconcile apply / dry-run | **N/A** | Fora de scope (não feito) |
| 1B Assign Admin | **SKIP** | Decisão produto: não é ops normal |
| Playbook Saúde mismatch (texto vs UI) | **Não bloqueante** | Saúde API `degraded` por pagamentos presos antigos — dívida separada |

---

## Observações (não blockers)

| ID | Observação |
|----|------------|
| **R-ADMIN-ORPHAN-PANEL** | Após `completed`, Admin mostrou «Viagem aberta fora da lista de activas» — UX futura; não bloqueia Fase 0 |
| **Saúde degraded** | Pagamentos stuck antigos no system-health — não bloqueia este smoke; follow-up payments/ops separado |
| **Payment mock / processing antigo** | Dívida separada (não coberta aqui) |

---

## Conclusão

**ADMIN-OPS-1 Fase 0 B/C = PASS.**

Admin serve como ferramenta de **excepção** para desbloquear `accepted`/`arriving` com coerência Pax/Driver; o buraco `ongoing` (sem complete/cancel/fail admin) está **confirmado** e o fecho correcto é pelo Driver. Próximos passos naturais: runbook/docs playbook; UI honesty (Atribuir); PARTNER-FLEET-1 para assign diário; payments stuck / Saúde como carril à parte.
