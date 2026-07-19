# Checkpoint — PAYMENTS-STUCK-1A/1B PASS (2026-07-19)

**`main` / `origin/main`:** `2fc46b9`  
**PRs abertas:** **0** · **CI:** verde · **Working tree:** limpa (no momento do apply)

**Handoff vivo:** [`TODOdoDIA.md`](../../TODOdoDIA.md) · [`PROXIMA_SESSAO.md`](../meta/PROXIMA_SESSAO.md) · [`FORWARD_PLAN_2026-07.md`](FORWARD_PLAN_2026-07.md) · [`O_STRIPE_1_RUNBOOK.md`](O_STRIPE_1_RUNBOOK.md) §§9–10

---

## 1. Fechado

| ID | PR | Entrega | Estado |
|----|-----|---------|--------|
| **PAYMENTS-STUCK-1A** | **#417** | `complete_trip` com `STRIPE_MOCK` / `pi_mock_*` → `payment.succeeded` | **PASS** |
| **PAYMENTS-STUCK-1B** | **#418** | Admin API dry-run/apply close mock processing | **PASS** |
| **Apply Render** | — | Via API Admin (sem SQL manual) em `ride_db_wypz` | **PASS** |

**Produto inalterado:** Stripe live fora de scope; PI real continua `processing` até webhook/reconcile.

---

## 2. Apply 1B — resultados (API Admin)

| Fase | `to_succeeded` | `to_failed` | `count` | PI não-mock |
|------|---------------:|------------:|--------:|------------:|
| Preview | 41 | 10 | 51 | 0 |
| Apply (`dry_run=false`) | 41 | 10 | 51 | 0 |
| Pós-apply preview | 0 | 0 | 0 | — |

Regras aplicadas: completed+`pi_mock_*`→`succeeded`; cancelled+`pi_mock_*`→`failed`; trips inalteradas.

---

## 3. Health pós-apply

| Sinal | Valor | Nota |
|-------|--------|------|
| `status` | ainda **degraded** | **esperado** — já **não** é mock stuck |
| `stuck_payments` | **1** | trip `591f6827-…` cancelled + processing + PI real `pi_3Tsh…` |
| `inconsistent_financial_state` | **0** | mock completed limpos |
| `missing_payment_records` | **1** | trip `4b29c6c9-…` completed sem payment |

**Mock stuck antigo: limpo.**

---

## 4. Pendências abertas (carris separados)

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **PAYMENTS-EDGE-1** | cancelled + PI real processing | Por iniciar | trip `591f6827-…`; reconcile Stripe real / decisão ops — **não** close-mock |
| **PAYMENTS-EDGE-2** | completed sem payment | Por iniciar | trip `4b29c6c9-…` |
| **O-SECURITY** | Mudar password SA | Em curso | fim de sessão (credencial usada no apply API) |

---

## 5. Próximos carris recomendados

1. **O-SECURITY** — mudar password SA (já nesta sessão se possível)  
2. **PAYMENTS-EDGE-1** / **PAYMENTS-EDGE-2** — só se prioritário  
3. Admin Ops seguinte · PARTNER-FLEET-1  

Checkpoint anterior (pytest guard): [`CHECKPOINT_2026-07-19_POST_415.md`](CHECKPOINT_2026-07-19_POST_415.md).
