# Instruções: cron-job.org para Background Workers

Fonte de verdade do lote: `backend/app/api/routers/cron.py` (`GET /cron/jobs`).
TTL de ofertas: `OFFER_TIMEOUT_SECONDS` em `backend/app/core/config.py` (default **60**).

---

## 1. Configurar `CRON_SECRET` no servidor

No **Render** (ou outro host), define a variável de ambiente:

```
CRON_SECRET=<uma_string_secreta_forte>
```

Usa um valor longo e aleatório (ex.: 32+ caracteres). **Nunca** commits nem partilhas o valor real.

Sem `CRON_SECRET` no servidor, o endpoint responde **503** (`CRON_SECRET not configured`).

---

## 2. Criar o cron no cron-job.org

1. Entra em [cron-job.org](https://cron-job.org) e faz login.
2. Clica em **Create cronjob**.
3. Preenche:

| Campo | Valor |
|-------|-------|
| **Title** | `APP Background Workers` |
| **URL** | `https://<TUA_API_BASE_URL>/cron/jobs` (**sem** secret na URL) |
| **Schedule** | `Every minute` (ou `Every 2 minutes`) |
| **Request method** | `GET` |
| **Request headers** | `X-Cron-Secret: <CRON_SECRET>` |

**Exemplo de URL (sem secret):**
```
https://api-tua-app.onrender.com/cron/jobs
```

### Auth

| Método | Uso |
|--------|-----|
| **Header `X-Cron-Secret`** | **Preferido** — evita secret em access logs / Referer |
| Query `?secret=<CRON_SECRET>` | **Legado** — ainda aceite pelo código; não usar em setups novos |

4. Guarda o cronjob.

### Alertas (cron-job.org)

- Qualquer resposta **non-2xx** é tratada como falha do job (inclui HTTP **500** em `partial_error`).
- Podes activar notificações **onFailure** no painel do cron-job.org se quiseres email em falhas.
- O serviço **não** promete retry imediato após falha: a próxima execução segue o schedule configurado.

---

## 3. Verificar que funciona

Pedido manual (preferido):

```bash
curl -sS -w "\nHTTP %{http_code}\n" \
  "https://<API_HOST>/cron/jobs" \
  -H "X-Cron-Secret: <CRON_SECRET>"
```

### Semântica HTTP — `GET /cron/jobs`

| HTTP | Significado | Body |
|------|-------------|------|
| **200** | Todos os sub-jobs concluíram sem excepções | `status: "ok"`, `errors: {}` |
| **500** | Um ou mais sub-jobs lançaram excepção (`partial_error`) | Mesmo schema: `status: "partial_error"`, `errors`, contagens, `duration_ms` |
| **401** | Secret inválido / em falta no pedido | `detail: invalid_secret` |
| **503** | `CRON_SECRET` não configurado no servidor | `detail: CRON_SECRET not configured` |

Notas:

- Sub-jobs são **isolados**: um falha, os outros continuam (não é fail-fast).
- `system_health.status == "degraded"` **não** implica HTTP 500 por si — só excepções capturadas em `errors`.
- O monitor externo (cron-job.org) considera **2xx = sucesso**; por isso o partial failure usa **500**.

Exemplo de sucesso (campos parciais):

```json
{
  "status": "ok",
  "errors": {},
  "timeouts": {
    "assigned_to_requested": 0,
    "accepted_to_cancelled": 0,
    "ongoing_to_failed": 0
  },
  "offers": {
    "expired_count": 0,
    "redispatch_created": 0
  },
  "cleanup": {
    "audit_events_deleted": 0
  },
  "system_health": {
    "status": "ok",
    "stuck_payments": 0,
    "warnings": []
  },
  "driver_zones": {
    "expired_sessions": 0
  },
  "rotacional": {
    "external_items_stored": 0
  }
}
```

### Painel Admin — `POST /admin/cron/run`

Corre o **mesmo lote**, com JWT `super_admin` + `governance_reason`.

- Continua a responder **HTTP 200** mesmo com `status: "partial_error"`.
- A UI deve ler `status`, `error_count` e `errors` no body (não depender só do código HTTP).

---

## 4. O que este cron faz

A cada execução, `GET /cron/jobs` corre (por ordem):

1. **Trip timeouts** (`run_trip_timeouts`)
   - `assigned` > **2 min** sem aceitar → `requested`
   - `accepted` > **10 min** sem iniciar → `cancelled`
   - `ongoing` > **6 h** → `failed`
2. **Expire stale offers** (`expire_stale_offers`)
   - Ofertas `pending` com `expires_at` passado → `expired`
   - TTL efectivo: `OFFER_TIMEOUT_SECONDS` (default **60** s; override via env)
3. **Redispatch** (`redispatch_expired_trips`)
   - Viagens `requested` com todas as ofertas expiradas/rejeitadas → novas ofertas
4. **Cleanup** (`run_cleanup`)
   - Apaga `audit_events` mais antigos que `AUDIT_EVENTS_RETENTION_DAYS` (default **730**)
5. **System health snapshot** (`run_system_health_check`)
   - Read-only; logs na transição para `degraded` (sem spam a cada tick)
6. **Driver zone sessions** (`expire_open_zone_sessions_past_deadline`)
   - Sessões abertas com `deadline_at` passado → `expired`
7. **Rotacional v3 cache** (`refresh_rotacional_external_cache`)
   - Se `ROTACIONAL_V3_FETCH_URL` estiver definida: fetch + grava cache; caso contrário no-op

---

## 5. Frequência recomendada

- **Every 1 minute** — ideal (TTL de oferta default **60** s).
- **Every 2 minutes** — aceitável se quiseres menos chamadas.

Não há scheduler in-process na API: o host externo é obrigatório em produção.

---

## 6. Segurança

- **Nunca** partilhes o `CRON_SECRET` publicamente.
- Preferir **header** `X-Cron-Secret` (não colocar o secret na URL).
- Secret errado → **401**; não configurado → **503**.

---

## 7. Render Free Tier — spin-down

Se usares o plano gratuito do Render, a instância **desliga após inatividade**. O primeiro pedido após o spin-down pode demorar **~50 segundos** até o serviço voltar.

- O cron-job.org continua a chamar a cada minuto; quando a instância acordar, os jobs correm normalmente.
- Para evitar atrasos, considera um plano pago ou um keep-alive (ex.: UptimeRobot a pingar `/health` a cada 5 min).
