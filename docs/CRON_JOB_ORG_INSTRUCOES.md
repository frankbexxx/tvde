# Instruções: cron-job.org para Background Workers

## 1. Configurar CRON_SECRET no servidor

No **Render** (ou outro host), adiciona a variável de ambiente:

```
CRON_SECRET=<uma_string_secreta_forte>
```

Exemplo: `CRON_SECRET=abc123xyz789` (usa algo aleatório e longo em produção).

---

## 2. Criar o cron no cron-job.org

1. Entra em [cron-job.org](https://cron-job.org) e faz login.
2. Clica em **Create cronjob**.
3. Preenche:

| Campo | Valor |
|-------|-------|
| **Title** | `APP Background Workers` |
| **URL** | `https://<TUA_API_BASE_URL>/cron/jobs?secret=<CRON_SECRET>` |
| **Schedule** | `Every minute` (ou `Every 2 minutes`) |
| **Request method** | `GET` |

**Exemplo de URL:**
```
https://api-tua-app.onrender.com/cron/jobs?secret=abc123xyz789
```

4. Guarda o cronjob.

---

## 3. Verificar que funciona

- O endpoint devolve `200 OK` com JSON, por exemplo:

```json
{
  "status": "ok",
  "timeouts": {
    "assigned_to_requested": 0,
    "accepted_to_cancelled": 0,
    "ongoing_to_failed": 0
  },
  "offers": {
    "expired_count": 0,
    "redispatch_created": 0
  }
}
```

- Se o `secret` estiver errado: `401 Unauthorized`.
- Se `CRON_SECRET` não estiver definido no servidor: `503 Service Unavailable`.

---

## 4. O que este cron faz

A cada execução, o endpoint `/cron/jobs` executa:

1. **Trip timeouts**
   - `assigned` > 2 min sem aceitar → volta a `requested`
   - `accepted` > 10 min sem iniciar → `cancelled`
   - `ongoing` > 6 h → `failed`

2. **Offer expiry + redispatch**
   - Ofertas expiradas (> 15 s) passam a `expired`
   - Trips em `requested` com todas as ofertas expiradas recebem novas ofertas para outros motoristas

---

## 5. Frequência recomendada

- **Every 1 minute** – ideal (offer timeout é 15 s).
- **Every 2 minutes** – aceitável se quiseres menos chamadas.

---

## 6. Segurança

- **Nunca** partilhes o `CRON_SECRET` publicamente.
- Usa um valor longo e aleatório (ex: 32+ caracteres).
- O endpoint só responde `ok` se o `secret` coincidir com `CRON_SECRET`.

---

## 7. Render Free Tier — spin-down

Se usares o plano gratuito do Render, a instância **desliga após inatividade**. O primeiro pedido após o spin-down pode demorar **~50 segundos** até o serviço voltar.

- O cron-job.org continua a chamar a cada minuto; quando a instância acordar, os jobs correm normalmente.
- Para evitar atrasos, considera um plano pago ou um serviço de "keep-alive" (ex: UptimeRobot a pingar `/health` a cada 5 min).
