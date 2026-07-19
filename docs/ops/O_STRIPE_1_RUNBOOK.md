# O-STRIPE-1 — webhook Stripe assertivo (Fase A local)

Validação **local** do webhook Stripe em **test mode**: assinatura, entrega, `payment_intent.succeeded` → `Payment.succeeded`, fluxo PI real com `STRIPE_MOCK=false`.

**Complementa:** [`W1_PROD_SMOKE.md`](W1_PROD_SMOKE.md) §4 · [`TESTE_STRIPE_COMPLETO.md`](../testing/TESTE_STRIPE_COMPLETO.md) · [`diagrams/03_PAYMENTS.md`](../diagrams/03_PAYMENTS.md) · [`FORWARD_PLAN_2026-07.md`](FORWARD_PLAN_2026-07.md)

**Fora de scope deste gate:** `sk_live_*`, conta Stripe do parceiro, `STRIPE_MOCK=false` em produção.

---

## Regras

| Permitido | Proibido |
|-----------|----------|
| `STRIPE_MOCK=false` só na **sessão** PowerShell local | Alterar Render / produção |
| `sk_test_*` e `whsec_*` do `stripe listen` (password manager) | `sk_live_*` |
| BD local Docker `ride_postgres` / `ride_db` | Escrever na BD Render via `.env` esquecido |
| Registar `trip_id`, prefixos `pi_` / `evt_` mascarados | Secrets no repo, chat ou commits |

---

## 0. Incidente conhecido — `.env` aponta para Render

`backend/.env` pode conter **External Database URL** do Render. Se uvicorn arrancar **sem** `$env:DATABASE_URL` local no **mesmo** terminal, a API escreve na BD remota.

### Diagnóstico seguro (antes de uvicorn)

```powershell
cd C:\dev\APP\backend
$env:DATABASE_URL = "postgresql+psycopg2://postgres:postgres@127.0.0.1:5432/ride_db"
# … resto das vars de sessão …

python -c @"
from urllib.parse import urlparse
from app.core.config import settings
u = urlparse(settings.DATABASE_URL.replace('+psycopg2', ''))
h = u.hostname or ''
print({'host': h, 'port': u.port or 5432, 'database': (u.path or '').lstrip('/').split('?')[0],
       'is_localhost': h in ('localhost', '127.0.0.1'), 'looks_render': 'onrender.com' in h,
       'stripe_mock': settings.STRIPE_MOCK})
"@
```

**Esperado Fase A:** `host` = `127.0.0.1` · `database` = `ride_db` · `looks_render` = `false`.

**Registo 2026-07-13:** execução inválida detectada com `looks_render: true` (host Render, DB `ride_db_wypz`); corrigido com reset de sessão e confirmação antes do novo uvicorn.

---

## 1. Pré-requisitos

| Item | Verificação |
|------|-------------|
| Stripe CLI | `stripe --version` |
| Docker Postgres | `docker start ride_postgres` · porta 5432 |
| Python venv | `cd backend` · dependências instaladas |
| Conta Stripe | **test mode** (`stripe login`) |
| `alembic` | `alembic upgrade head` · head `b5c6d7e8f9a0` |

---

## 2. Terminal 1 — `stripe listen`

```powershell
stripe listen --forward-to http://127.0.0.1:8000/webhooks/stripe
```

Copiar `whsec_…` para `$env:STRIPE_WEBHOOK_SECRET` no Terminal 2 — **não** commitar nem colar em chat.

---

## 3. Terminal 2 — backend

```powershell
cd C:\dev\APP\backend

$env:DATABASE_URL = "postgresql+psycopg2://postgres:postgres@127.0.0.1:5432/ride_db"
$env:ENV = "dev"
$env:ENABLE_DEV_TOOLS = "true"
$env:STRIPE_MOCK = "false"
$env:STRIPE_SECRET_KEY = "sk_test_..."       # Dashboard test mode
$env:STRIPE_WEBHOOK_SECRET = "whsec_..."     # stripe listen
$env:JWT_SECRET_KEY = "dev-jwt-secret-key-at-least-32-characters-long"
$env:OTP_SECRET = "dev-otp-secret-key-at-least-32-characters-long"

# Confirmar §0 antes de arrancar
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Health: `Invoke-RestMethod http://127.0.0.1:8000/health`

---

## 4. Testes obrigatórios

| ID | Teste | Critério OK |
|----|-------|-------------|
| **T0** | POST `/webhooks/stripe` sem `stripe-signature` | HTTP **422** |
| **T1** | Header `stripe-signature: v1=invalid` | HTTP **401** |
| **T2** | `stripe trigger payment_intent.succeeded` (PI aleatório) | 200 · log «Payment not found ack» · BD inalterada |
| **T3** | `stripe trigger … --override "payment_intent:id=…"` | **N/A** — CLI: `Received unknown parameter: id` |
| **T3b** | Fluxo completo local (§5) | `payment.succeeded` via webhook real |
| **T4** | Resend manual `evt_*` | **Opcional** — coberto em pytest/CI |

---

## 5. T3b — fluxo completo (API local)

Base URL: `http://127.0.0.1:8000`

```powershell
$base = "http://127.0.0.1:8000"
Invoke-RestMethod -Method POST -Uri "$base/dev/seed"
$tok = Invoke-RestMethod -Method POST -Uri "$base/dev/tokens"
$hdrP = @{ Authorization = "Bearer $($tok.passenger)" }
$hdrA = @{ Authorization = "Bearer $($tok.admin)" }
$hdrD = @{ Authorization = "Bearer $($tok.driver)" }

$trip = Invoke-RestMethod -Method POST -Uri "$base/trips" -Headers $hdrP `
  -ContentType "application/json" -Body (@{
    origin_lat=38.7169; origin_lng=-9.1399
    destination_lat=38.7369; destination_lng=-9.1427
  } | ConvertTo-Json)
$tripId = $trip.trip_id

Invoke-RestMethod -Method POST -Uri "$base/admin/trips/$tripId/assign" -Headers $hdrA `
  -ContentType "application/json" -Body '{"governance_reason":"O-STRIPE-1 teste local assign"}'

$tsMs = [int][double]::Parse((Get-Date -UFormat %s)) * 1000
Invoke-RestMethod -Method POST -Uri "$base/drivers/location" -Headers $hdrD `
  -ContentType "application/json" -Body (@{ lat=38.7169; lng=-9.1399; timestamp=$tsMs } | ConvertTo-Json)

Invoke-RestMethod -Method POST -Uri "$base/driver/trips/$tripId/accept" -Headers $hdrD
Invoke-RestMethod -Method POST -Uri "$base/driver/trips/$tripId/arriving" -Headers $hdrD
Invoke-RestMethod -Method POST -Uri "$base/driver/trips/$tripId/start" -Headers $hdrD
Invoke-RestMethod -Method POST -Uri "$base/driver/trips/$tripId/complete" -Headers $hdrD `
  -ContentType "application/json" -Body '{"final_price":5.50}'
```

**Esperado:** Terminal 1 recebe `payment_intent.succeeded`; log `stripe_webhook_payment_succeeded`; após 1–2 s `payments.status = succeeded`.

> **Nota:** `stripe_payment_intent_id` pode vir `null` na resposta JSON do motorista (`include_stripe_pi=false`). Validar na BD.

> **Obs. técnica (2026-07-13):** `final_price` no body de `complete` pode não alterar o valor persistido (pricing actual); não bloqueia o gate webhook.

---

## 6. Queries de validação

```sql
SELECT p.status AS payment_status, t.status AS trip_status,
       LEFT(p.stripe_payment_intent_id, 14) || '…' AS pi_partial,
       t.final_price, p.total_amount
FROM payments p
JOIN trips t ON t.id = p.trip_id
WHERE t.id = '<trip_id>';

SELECT LEFT(stripe_event_id, 12) || '…' AS evt_partial, created_at
FROM stripe_webhook_events
ORDER BY created_at DESC
LIMIT 10;
```

---

## 7. Limpeza

```powershell
# Ctrl+C uvicorn e stripe listen
Remove-Item Env:STRIPE_SECRET_KEY, Env:STRIPE_WEBHOOK_SECRET, Env:DATABASE_URL -ErrorAction SilentlyContinue
$env:STRIPE_MOCK = "true"
```

Produção: manter `STRIPE_MOCK=true` no Render; não alterar env Stripe prod neste gate.

---

## 8. Registo de execução — 2026-07-13

| Campo | Resultado |
|-------|-----------|
| Ambiente | API local · BD Docker `ride_db` · Stripe test mode |
| Incidente prévio | `.env` Render detectado; corrigido (`looks_render: false`) |
| T0 / T1 / T2 | OK |
| T3 override | N/A |
| T3b | OK — trip `5629c3fa-cfe2-4f4b-a307-cd2852897a5f` · PI `pi_3TsjUJ8jcCq…` · payment **succeeded** |
| T4 manual | N/A (pytest/CI) |
| Produção | Não alterada · `STRIPE_MOCK=true` mantido |

**Estado:** **O-STRIPE-1 Fase A = OK**

---

## 9. STRIPE_MOCK — `complete_trip` settle (PAYMENTS-STUCK-1A)

Com `STRIPE_MOCK=true` **ou** PI `pi_mock_*`, `complete_trip` marca `payment.status = succeeded` após gravar montantes finais. Não há webhook mock; sem isto a Saúde fica `degraded` (`stuck_payments` / `trip_completed_but_payment_not_succeeded`).

Com `STRIPE_MOCK=false` e PI real: comportamento inalterado — payment fica `processing` até webhook / reconcile Stripe. **Não** inventar sucesso em Stripe real.

Dívida legada (`completed`/`cancelled` + `pi_mock_*` já na BD) limpa-se com **PAYMENTS-STUCK-1B** (§10) — não por este settle no `complete_trip`.

---

## 10. PAYMENTS-STUCK-1B — close mock processing (Admin API)

Fecha **só** payments com `stripe_payment_intent_id LIKE 'pi_mock_%'`:

| Trip | Payment antes | Payment depois | Trip depois |
|------|---------------|----------------|-------------|
| `completed` | `processing` | `succeeded` | `completed` (inalterada) |
| `cancelled` | `processing` | `failed` | `cancelled` (inalterada) |

**Não toca:** PI real / não-mock · `succeeded` · trips sem payment · Stripe API.

### Preview (read-only)

```http
GET /admin/ops/reconcile-payments/close-mock-processing/preview?limit=200
Authorization: Bearer <super_admin>
```

Resposta: `dry_run=true`, `to_succeeded`, `to_failed`, `count`, `items[]` (`trip_id`, `payment_id`, `pi_prefix`, …).

### Dry-run (default) / Apply

```http
POST /admin/ops/reconcile-payments/close-mock-processing
Content-Type: application/json

{
  "governance_reason": "PAYMENTS-STUCK-1B cleanup mock stuck após diagnóstico",
  "dry_run": true,
  "limit": 200
}
```

Apply **só** com `"dry_run": false` (explícito) + `governance_reason` (≥10 chars). Super_admin. Auditoria batch `admin.close_mock_processing`.

### Verificação pós-apply

1. Preview de novo → `count=0` (ou só rows novas, se houver).
2. SELECT: `completed`+`processing`+`pi_mock_%` = 0; `cancelled`+`processing`+`pi_mock_%` = 0.
3. Saúde: `stuck_payments` / inconsistent completed devem cair (pode restar PI real stuck fora de scope).
4. Segunda apply → `to_succeeded=0`, `to_failed=0`, `count=0`.

**Avisos:** não usar `stripe-sync` contra `pi_mock_*` (pode falhar trips). Não misturar com o caso `completed` sem payment (`4b29c6c9-…`).

### Estado apply app (2026-07-19) — **PASS**

| Fase | `to_succeeded` | `to_failed` | `count` |
|------|---------------:|------------:|--------:|
| Preview | 41 | 10 | 51 |
| Apply | 41 | 10 | 51 |
| Pós-preview | 0 | 0 | 0 |

API Admin em `tvde-api` / BD `ride_db_wypz` — **sem SQL manual**. PI não-mock no lote: **0**.

Pós-1B health ficou `degraded` só por EDGE-1/2; ambos **PASS** depois (cleanup pontual). Health final **`ok`**. Checkpoint: [`CHECKPOINT_2026-07-19_PAYMENTS_STUCK.md`](CHECKPOINT_2026-07-19_PAYMENTS_STUCK.md).

### EDGE-1/2 (fecho 2026-07-19)

| Edge | Acção | Resultado |
|------|--------|-----------|
| **EDGE-2** | trip `4b29c6c9-…` → `failed` (órfã teste) | `missing_payment_records` 0 |
| **EDGE-1** | payment `c58c20d4-…` → `failed`; trip cancelled; Dashboard PI `requires_payment_method`, €0 | `stuck_payments` 0 |

Sem Stripe API · `STRIPE_MOCK` intocado · sem reconcile lote.

---

## 11. Próximos passos (fora deste gate)

| Item | Quando |
|------|--------|
| **O-SECURITY** | **PASS** 2026-07-19 — password SA rodada via `/auth/me/password` (sem env) |
| Webhook endpoint **produção** com `STRIPE_MOCK=true` | Smoke opcional (Send test event → 200) |
| `STRIPE_MOCK=false` + `sk_live_*` em prod | Futuro — conta Stripe do parceiro + docs |
| Fase B staging | [`STAGING_A2-02_RUNBOOK.md`](STAGING_A2-02_RUNBOOK.md) |
| Revisão `final_price` em `complete_trip` | Backlog produto/técnico |
| Admin Ops / PARTNER-FLEET-1 | Próximos carris produto |
