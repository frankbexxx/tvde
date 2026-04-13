# 🧪 Guia Completo de Testes Stripe - Ride Sharing Backend

## 📋 Pré-requisitos

### 1. Verificar Instalações

- ✅ Python 3.12+ com venv ativado
- ✅ PostgreSQL a correr (Docker: `docker start ride-postgres`)
- ✅ Stripe CLI instalado
- ✅ Backend a correr (`uvicorn app.main:app --reload`)

### 2. Verificar `.env`

```env
DATABASE_URL=postgresql+psycopg2://ride:ride@localhost:5432/ride_db
JWT_SECRET_KEY=dev-secret-super-inseguro-muito-maior-123
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_MINUTES=60
ENV=dev
OTP_SECRET=dev-otp-secret
OTP_EXPIRATION_MINUTES=5
STRIPE_SECRET_KEY=sk_test_51Szgpi8jcCqT4zToVowvVLwZ8VxZo66bsTpyIVgOLJmgZhRpeVIIYaxcSN2dhsOt8UEJMN7D98tC3WvMI4EUeBqi00EM98T9eW
STRIPE_WEBHOOK_SECRET=whsec_xxxxx  # ← Obter do Stripe CLI
```

---

## 🚀 Setup Inicial

### Passo 1: Iniciar Stripe CLI

Abrir **nova janela PowerShell** e executar:

```bash
stripe listen --forward-to localhost:8000/webhooks/stripe
```

**Resultado esperado:**
```
> Ready! Your webhook signing secret is whsec_xxxxx
```

**⚠️ IMPORTANTE:** Copiar o `whsec_xxxxx` e atualizar no `.env` se ainda não tiveres.

### Passo 2: Verificar Backend

Backend deve estar a correr em `http://127.0.0.1:8000`

Verificar health:
```bash
curl http://127.0.0.1:8000/health
```

**Resultado esperado:** `{"status":"ok"}`

### Passo 3: Verificar Base de Dados

```bash
docker exec -it ride-postgres psql -U ride -d ride_db
```

Verificar se existem utilizadores:
```sql
SELECT id, role, phone, status FROM users LIMIT 5;
```

Se não existir nenhum, não há problema — serão criados no primeiro OTP.

---

## 🧪 TESTE 1: Fluxo Completo (Sucesso)

### 1.1 Criar Utilizador Passageiro (OTP)

**Swagger:** `http://127.0.0.1:8000/docs`

**Endpoint:** `POST /auth/otp/request`

**Body:**
```json
{
  "phone": "+351912345678"
}
```

**Verificar:**
- ✅ Resposta: `request_id` + expires_at`
- ✅ **Console backend:** `[DEV OTP] phone=+351912345678 code=123456`

**Endpoint:** `POST /auth/otp/verify`

**Body:**
```json
{
  "phone": "+351912345678",
  "code": "123456"
}
```

**Verificar:**
- ✅ Resposta: `access_token`, `user_id`, `role=passenger`
- ✅ **Copiar `access_token`** para próximo passo

### 1.2 Autorizar Swagger

1. Clicar em **🔐 Authorize** (topo direito)
2. Colar: `Bearer <access_token>`
3. Clicar **Authorize**

### 1.3 Criar Trip (Passageiro)

**Endpoint:** `POST /trips`

**Body:**
```json
{
  "origin_lat": 38.7169,
  "origin_lng": -9.1399,
  "destination_lat": 38.7369,
  "destination_lng": -9.1427
}
```

**Verificar:**
- ✅ Resposta: `trip_id`, `status=requested`, `estimated_price=0.0`
- ✅ **DB:** `SELECT id, status FROM trips ORDER BY created_at DESC LIMIT 1;`
- ✅ **Audit:** `SELECT event_type, entity_id FROM audit_events WHERE entity_id = '<trip_id>';`

**Guardar `trip_id`** para próximos passos.

### 1.4 Criar Utilizador Admin (para Assign)

**Opção A - Via DB:**
```sql
INSERT INTO users (id, role, name, phone, status, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'admin',
    'admin',
    '+351900000000',
    'active',
    now(),
    now()
);
```

**Opção B - Via OTP:**
1. `POST /auth/otp/request` com `phone: "+351900000000"`
2. `POST /auth/otp/verify` com o código
3. **Atualizar role manualmente:**
   ```sql
   UPDATE users SET role = 'admin' WHERE phone = '+351900000000';
   ```

### 1.5 Assign Trip (Admin)

**Autorizar Swagger com token admin**

**Endpoint:** `POST /admin/trips/{trip_id}/assign`

**Verificar:**
- ✅ Resposta: `status=assigned`
- ✅ **DB:** `SELECT status FROM trips WHERE id = '<trip_id>';` → `assigned`
- ✅ **Audit:** Evento `trip.status_changed` com `status=assigned`

### 1.6 Criar Utilizador Driver

**Opção A - Via DB:**
```sql
-- Criar user
INSERT INTO users (id, role, name, phone, status, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'driver',
    'driver',
    '+351911111111',
    'active',
    now(),
    now()
)
RETURNING id;

-- Criar driver profile (substituir <user_id> pelo ID retornado)
INSERT INTO drivers (user_id, status, commission_percent, created_at, updated_at)
VALUES (
    '<user_id>',
    'approved',
    15.00,
    now(),
    now()
);
```

**Opção B - Via OTP + Update:**
1. `POST /auth/otp/request` com `phone: "+351911111111"`
2. `POST /auth/otp/verify`
3. **Criar driver:**
   ```sql
   UPDATE users SET role = 'driver' WHERE phone = '+351911111111';
   INSERT INTO drivers (user_id, status, commission_percent, created_at, updated_at)
   SELECT id, 'approved', 15.00, now(), now()
   FROM users WHERE phone = '+351911111111';
   ```

### 1.7 Accept Trip (Driver) ⚡ **CRÍTICO - STRIPE**

**Autorizar Swagger com token driver**

**Endpoint:** `POST /driver/trips/{trip_id}/accept`

**Verificar:**
- ✅ Resposta: `status=accepted`
- ✅ **DB Trip:** `SELECT status, driver_id FROM trips WHERE id = '<trip_id>';` → `accepted`
- ✅ **DB Payment:** 
  ```sql
  SELECT id, status, stripe_payment_intent_id, total_amount, commission_amount, driver_amount
  FROM payments
  WHERE trip_id = '<trip_id>';
  ```
  - ✅ `status = 'processing'`
  - ✅ `stripe_payment_intent_id` preenchido (ex: `pi_xxxxx`)
- ✅ **Stripe Dashboard:** 
  - Ir a https://dashboard.stripe.com/test/payments
  - Procurar PaymentIntent com ID `pi_xxxxx`
  - ✅ Status: `Requires capture`
- **Nota (cartão):** No Dashboard do Stripe **não existe** sítio para inserir um cartão — o pagamento é confirmado no frontend (Stripe.js) ou via API. Com **ENV=dev**, o backend confirma automaticamente com cartão de teste (4242...), por isso não precisas de fazer nada no Dashboard.
- ✅ **Audit:** Evento `trip.status_changed` com `status=accepted`
- ✅ **Logs backend:** `accept_trip: PaymentIntent created ...` e (em dev) `accept_trip: PaymentIntent confirmed with test card ...`

### 1.8 Arriving (Driver)

**Endpoint:** `POST /driver/trips/{trip_id}/arriving`

**Verificar:**
- ✅ Resposta: `status=arriving`
- ✅ **DB:** `SELECT status FROM trips WHERE id = '<trip_id>';` → `arriving`

### 1.9 Start Trip (Driver)

**Endpoint:** `POST /driver/trips/{trip_id}/start`

**Verificar:**
- ✅ Resposta: `status=ongoing`
- ✅ **DB:** 
  ```sql
  SELECT status, started_at FROM trips WHERE id = '<trip_id>';
  ```
  - ✅ `status = 'ongoing'`
  - ✅ `started_at` preenchido (timestamp)

### 1.10 Complete Trip (Driver) ⚡ **CRÍTICO - STRIPE CAPTURE**

**Endpoint:** `POST /driver/trips/{trip_id}/complete`

**Body:**
```json
{
  "final_price": 0.0
}
```

**Verificar:**
- ✅ Resposta: `status=completed`
- ✅ **DB Trip:**
  ```sql
  SELECT status, started_at, completed_at FROM trips WHERE id = '<trip_id>';
  ```
  - ✅ `status = 'completed'`
  - ✅ `completed_at` preenchido
- ✅ **DB Payment:**
  ```sql
  SELECT status FROM payments WHERE trip_id = '<trip_id>';
  ```
  - ✅ `status = 'processing'` (ainda não mudou — webhook vai atualizar)
- ✅ **Stripe Dashboard:**
  - PaymentIntent `pi_xxxxx` agora com status `Succeeded`
- ✅ **Stripe CLI (janela separada):**
  - Deve mostrar evento `payment_intent.succeeded`
- ✅ **Logs backend:**
  - `complete_trip: PaymentIntent captured trip_id=..., payment_intent_id=...`
  - `webhook: Payment marked as succeeded event_type=payment_intent.succeeded, ...`

### 1.11 Verificar Webhook Processado

**Aguardar 1-2 segundos** após complete_trip.

**DB Payment:**
```sql
SELECT status, stripe_payment_intent_id FROM payments WHERE trip_id = '<trip_id>';
```

**Verificar:**
- ✅ `status = 'succeeded'` (atualizado pelo webhook)

**Audit:**
```sql
SELECT event_type, entity_id, payload->>'status', occurred_at
FROM audit_events
WHERE entity_id = '<trip_id>'
ORDER BY occurred_at;
```

**Verificar sequência:**
- ✅ `requested`
- ✅ `assigned`
- ✅ `accepted`
- ✅ `arriving`
- ✅ `ongoing`
- ✅ `completed`

---

## 🧪 TESTE 2: Falha de Autorização (Stripe)

### 2.1 Simular Falha Stripe

**Opção A - Cartão Inválido (se tiveres frontend):**
- Usar cartão de teste: `4000000000000002` (card_declined)

**Opção B - Desligar Stripe temporariamente:**
- Comentar `stripe.api_key` em `stripe_service.py` temporariamente
- Ou usar chave inválida no `.env`

### 2.2 Tentar Accept Trip

**Endpoint:** `POST /driver/trips/{trip_id}/accept`

**Verificar:**
- ✅ Resposta: HTTP 402 `Payment authorization failed`
- ✅ **DB Trip:** `SELECT status FROM trips WHERE id = '<trip_id>';` → `assigned` (não mudou)
- ✅ **DB Payment:** 
  ```sql
  SELECT COUNT(*) FROM payments WHERE trip_id = '<trip_id>';
  ```
  - ✅ `0` (nenhum Payment criado)
- ✅ **Logs backend:** `accept_trip: Stripe authorization failed trip_id=..., error=...`

---

## 🧪 TESTE 3: Double Accept (Idempotência)

### 3.1 Accept Trip (Primeira Vez)

**Endpoint:** `POST /driver/trips/{trip_id}/accept`

**Verificar:** Sucesso (como em 1.7)

### 3.2 Tentar Accept Novamente

**Endpoint:** `POST /driver/trips/{trip_id}/accept` (mesmo trip_id)

**Verificar:**
- ✅ Resposta: HTTP 409 `Payment already exists for this trip`
- ✅ **DB Payment:** Ainda existe apenas 1 Payment
- ✅ **Logs backend:** `accept_trip: Payment already exists for trip_id=..., driver_id=...`

---

## 🧪 TESTE 4: Double Complete (Idempotência)

### 4.1 Complete Trip (Primeira Vez)

**Endpoint:** `POST /driver/trips/{trip_id}/complete`

**Verificar:** Sucesso (como em 1.10)

### 4.2 Tentar Complete Novamente

**Endpoint:** `POST /driver/trips/{trip_id}/complete` (mesmo trip_id)

**Verificar:**
- ✅ Resposta: HTTP 409 `Payment status is succeeded, expected processing`
- ✅ **DB Payment:** Status permanece `succeeded` (não duplicado)
- ✅ **Logs backend:** `complete_trip: Payment not in processing state trip_id=..., payment_status=succeeded`

---

## 🧪 TESTE 5: Webhook Duplicado (Idempotência)

### 5.1 Reenviar Webhook Manualmente

**Stripe Dashboard:**
1. Ir a https://dashboard.stripe.com/test/events
2. Encontrar evento `payment_intent.succeeded` do teste anterior
3. Clicar em **"Send test webhook"** ou **"Replay"**

**Ou via Stripe CLI:**
```bash
stripe trigger payment_intent.succeeded
```

### 5.2 Verificar Webhook Processado

**Logs backend:**
- ✅ `webhook: Payment already succeeded (idempotent) event_type=payment_intent.succeeded, ...`

**DB Payment:**
```sql
SELECT status FROM payments WHERE trip_id = '<trip_id>';
```
- ✅ `status = 'succeeded'` (não mudou, mas também não deu erro)

---

## ✅ Checklist Final de Validação

### Estado Final Esperado

**Trip:**
- ✅ `status = 'completed'`
- ✅ `started_at` preenchido
- ✅ `completed_at` preenchido
- ✅ `driver_id` preenchido

**Payment:**
- ✅ `status = 'succeeded'`
- ✅ `stripe_payment_intent_id` preenchido
- ✅ `total_amount`, `commission_amount`, `driver_amount` corretos
- ✅ `commission_amount = total_amount * 0.15` (ou percentagem do driver)

**Stripe Dashboard:**
- ✅ PaymentIntent com status `Succeeded`
- ✅ Amount correto
- ✅ Metadata com `trip_id`

**Audit Events:**
- ✅ Sequência completa de estados
- ✅ Todos os eventos com timestamps corretos

**Logs:**
- ✅ Sem erros críticos
- ✅ Logs estruturados presentes

---

## 🐛 Troubleshooting

### Problema: Webhook não recebido

**Soluções:**
1. Verificar Stripe CLI está a correr
2. Verificar `STRIPE_WEBHOOK_SECRET` no `.env` corresponde ao CLI
3. Verificar backend está acessível em `localhost:8000`
4. Verificar firewall não está a bloquear

### Problema: Payment status não atualiza

**Soluções:**
1. Verificar webhook está a ser recebido (logs backend)
2. Verificar `payment_intent_id` no DB corresponde ao Stripe
3. Verificar webhook secret está correto

### Problema: HTTP 402 no accept

**Soluções:**
1. Verificar `STRIPE_SECRET_KEY` no `.env` está correto
2. Verificar chave é de test mode (`sk_test_...`)
3. Verificar logs backend para erro específico do Stripe

### Problema: "Não vejo sítio para inserir cartão" no Stripe Dashboard

O **Dashboard do Stripe não tem** campo para inserir cartão na página do PaymentIntent. O método de pagamento é adicionado no **frontend** (Stripe.js / Payment Element) ou via **API**. Com **ENV=dev**, o backend confirma o PaymentIntent automaticamente com o cartão de teste 4242 4242 4242 4242, pelo que o fluxo completo (accept → complete) funciona sem frontend e sem usar o Dashboard para pagar.

---

## 📊 Resumo de Endpoints Testados

| Endpoint | Método | Role | Teste |
|----------|--------|------|-------|
| `/auth/otp/request` | POST | - | ✅ |
| `/auth/otp/verify` | POST | - | ✅ |
| `/trips` | POST | passenger | ✅ |
| `/admin/trips/{id}/assign` | POST | admin | ✅ |
| `/driver/trips/{id}/accept` | POST | driver | ✅ **STRIPE** |
| `/driver/trips/{id}/arriving` | POST | driver | ✅ |
| `/driver/trips/{id}/start` | POST | driver | ✅ |
| `/driver/trips/{id}/complete` | POST | driver | ✅ **STRIPE** |
| `/webhooks/stripe` | POST | - | ✅ **WEBHOOK** |

---

**Boa sorte com os testes! 🚀**

