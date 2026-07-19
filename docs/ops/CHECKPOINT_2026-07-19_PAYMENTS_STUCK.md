# Checkpoint — pagamentos + O-SECURITY fechados (2026-07-19)

**`main` / `origin/main`:** `77ddfac` (docs #419; código 1A/1B em `2fc46b9`+)  
**PRs abertas:** **0** · **CI:** verde · **Saúde:** **ok**

**Handoff vivo:** [`TODOdoDIA.md`](../../TODOdoDIA.md) · [`PROXIMA_SESSAO.md`](../meta/PROXIMA_SESSAO.md) · [`FORWARD_PLAN_2026-07.md`](FORWARD_PLAN_2026-07.md) · [`O_STRIPE_1_RUNBOOK.md`](O_STRIPE_1_RUNBOOK.md) §§9–10

---

## 1. Fechado (PASS)

| ID | Entrega | Estado |
|----|---------|--------|
| **PAYMENTS-STUCK-1A** | #417 — mock settle no `complete_trip` | **PASS** |
| **PAYMENTS-STUCK-1B** | #418 — Admin close-mock + apply Render 41+10 | **PASS** |
| **PAYMENTS-EDGE-2** | trip `4b29c6c9-…` completed inválida → `failed` (ops cleanup) | **PASS** |
| **PAYMENTS-EDGE-1** | payment `c58c20d4-…` processing → `failed`; trip `591f6827-…` mantém `cancelled` | **PASS** |
| **O-SECURITY** | Password SA `+351924075365` rodada via `POST /auth/me/password` | **PASS** |

**Produto:** Stripe live fora de scope; `STRIPE_MOCK` em prod **intocado**. PI real em fluxo normal continua a depender de webhook/reconcile.

---

## 2. Apply 1B — mock stuck (API Admin)

| Fase | `to_succeeded` | `to_failed` | `count` |
|------|---------------:|------------:|--------:|
| Preview | 41 | 10 | 51 |
| Apply | 41 | 10 | 51 |
| Pós-preview | 0 | 0 | 0 |

Só `pi_mock_*` · sem SQL · sem Stripe API.

---

## 3. Edge cleanups (BD app, WHERE restritivo)

### EDGE-2
- Trip `4b29c6c9-…`: `completed` anómala (sem driver/payment/`completed_at`) → **`failed`**
- `cancellation_reason` = ops cleanup invalid test trip · `cancelled_by` = `admin`
- Sem criar payment · sem apagar user/trip

### EDGE-1
- Dashboard Stripe (humano): PI `pi_3Tsh1f8jcCqT4zTo0hYPTtFz` · `requires_payment_method` · `livemode=false` · `amount_received=0` · `amount_capturable=0` · `latest_charge=null` · **não** succeeded
- Payment `c58c20d4-…` → **`failed`** (trip continua `cancelled`)
- Audit `admin.payments_edge1_cleanup`
- **Sem** Stripe API · **sem** desligar `STRIPE_MOCK` · **sem** reconcile lote

---

## 4. Health final

| Sinal | Valor |
|-------|--------|
| `status` | **`ok`** |
| `stuck_payments` | **0** |
| `missing_payment_records` | **0** |
| `inconsistent_financial_state` | **0** |
| warnings | nenhum |

---

## 5. O-SECURITY (PASS)

| Check | Resultado |
|-------|-----------|
| Alvo | `+351924075365` · `super_admin` · `is_test_account=false` |
| Método | `POST /auth/me/password` (API app; bcrypt da app) |
| Login nova | **OK** |
| Login antiga | **FAIL** (esperado) |
| Sessão/token | limpos |
| Env | **sem** mexer `.env` / Render env / `TEST_ACCOUNT_PASSWORD` / JWT / OTP / CRON |

Sem password/hash em docs ou git.

---

## 6. Próximos carris (fora pagamentos / security)

1. Admin Ops seguinte  
2. PARTNER-FLEET-1  
3. Stripe live — só quando parceiro tiver conta + documentação  

Checkpoint pytest guard: [`CHECKPOINT_2026-07-19_POST_415.md`](CHECKPOINT_2026-07-19_POST_415.md).
