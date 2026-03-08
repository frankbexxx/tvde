# Prompt Completa — Ferramentas Operacionais para Beta TVDE

Especificação para adicionar observabilidade, guardrails e ferramentas administrativas ao sistema TVDE, preparando-o para um beta público pequeno e controlado.

---

## OBJETIVO

O backend já foi validado com:
- simulador concorrente
- flash crowd
- heavy load
- integração Stripe funcional
- consistência DB validada

Agora precisamos adicionar ferramentas operacionais mínimas para observar e controlar o sistema em ambiente real.

**O objetivo NÃO é alterar o comportamento do sistema.**  
**O objetivo é adicionar observabilidade, guardrails e ferramentas administrativas.**

---

## PRINCÍPIO FUNDAMENTAL

**Não modificar lógica crítica existente.**

Especialmente NÃO alterar:
- state machine de Trip
- fluxo Stripe
- atomicidade de complete_trip
- webhook Stripe
- models principais
- services de pagamento

Esses componentes já foram validados por testes concorrentes.

---

## CONTEXTO DO SISTEMA

**Stack:** FastAPI, PostgreSQL, SQLAlchemy 2, Stripe PaymentIntent manual capture

**Fluxo financeiro:**
- `accept_trip` → create PaymentIntent (confirm=False)
- `complete_trip` → update amount → confirm → capture
- Webhook Stripe: fonte de verdade para payment.status

**State machine Trip:** requested → assigned → accepted → arriving → ongoing → completed | cancelled | failed

---

## ESTADO ATUAL (o que já existe)

| Componente | Estado | Localização |
|------------|--------|-------------|
| System Health | Existe | `GET /admin/system-health`, `services/system_health.py` |
| Trip Detail (admin) | Existe | `GET /admin/trips/{trip_id}` |
| Interaction Logging | Existe | `interaction_logs`, `log_interaction()`, falha silenciosa |
| Admin auth | Existe | `require_role(Role.admin)` em `/admin/*` |
| Export logs | Existe | `GET /admin/export-logs` |
| Run timeouts | Existe | `POST /admin/run-timeouts` |

---

## IMPLEMENTAÇÕES A REALIZAR

### 1️⃣ System Health — Ajustar e expandir

**Endpoint existente:** `GET /admin/system-health`

**Alterações:**

1. **Ajustar thresholds** conforme spec:
   - Trips em `accepted` há **> 30 min** (usar `updated_at`) → novo campo `trips_accepted_too_long`
   - Trips em `ongoing` há **> 6 horas** (usar `started_at`; atual: 4 h) → alterar threshold, campo `trips_ongoing_too_long`
   - Payments em `processing` há **> 10 min** (usar `created_at` ou `updated_at`; atual: 2 h) → alterar threshold

2. **Adicionar verificação:** Trips sem payment associado (já existe como `missing_payment_records`)

3. **Adicionar:** Driver Activity Check — drivers com `is_available=False` sem trip ativa há **> 10 min** → novo campo `drivers_unavailable_too_long`

**Schema de resposta (ajustar):**

```json
{
  "status": "ok",
  "stuck_trips": [],
  "trips_accepted_too_long": [],
  "trips_ongoing_too_long": [],
  "stuck_payments": [],
  "drivers_unavailable_too_long": [],
  "missing_payment_records": [],
  "inconsistent_financial_state": [],
  "warnings": []
}
```

`status`: `"ok"` se todos os arrays vazios; `"degraded"` se algum array não vazio.

---

### 2️⃣ Trip Debug — Novo endpoint enriquecido

**Criar:** `GET /admin/trip-debug/{trip_id}`

O endpoint atual `GET /admin/trips/{trip_id}` retorna apenas trip detail. O novo endpoint deve retornar:

- `trip` — dados completos da viagem
- `payment` — dados do pagamento associado (se existir)
- `driver` — dados do motorista (se atribuído)
- `passenger` — dados do passageiro
- `interaction_logs` — eventos associados a esta trip (últimos N, ex.: 20)

**Objetivo:** Debug rápido durante beta.

**Manter** `GET /admin/trips/{trip_id}` para compatibilidade.

---

### 3️⃣ Driver Recovery Tool

**Criar:** `POST /admin/recover-driver/{driver_id}`

**Nota:** `driver_id` é o `user_id` do driver (UUID), PK da tabela drivers.

**Função:** Se o driver estiver "stuck" (is_available=False, sem trip ativa), forçar `is_available=True`.

**Regras:**
- Verificar que o driver existe
- Verificar que está `is_available=False`
- Verificar que não tem trip em estado active (accepted, arriving, ongoing)
- Atualizar `is_available=True`
- Retornar estado atual do driver

**Resposta:** `{ "driver_id": "...", "is_available": true }`

---

### 4️⃣ Trip Force Cancel (Admin)

**Criar:** `POST /admin/cancel-trip/{trip_id}`

**Regra:** Só pode cancelar trips em:
- `requested`
- `assigned`
- `accepted`

**NÃO cancelar:** `arriving`, `ongoing`, `completed`, `cancelled`, `failed`

**Implementação:** Criar `cancel_trip_by_admin(db, trip_id)` em services/trips.py que:
- Obtém a trip
- Verifica status permitido (requested, assigned, accepted)
- Atualiza status para `cancelled`
- Chama `_set_driver_available` se trip tinha driver
- Se existir Payment com stripe_payment_intent_id e status cancelável: chamar Stripe cancel no PaymentIntent (libertar autorização). Reutilizar funções existentes do stripe_service se houver.
- Não alterar lógica de cancel_trip_by_passenger ou cancel_trip_by_driver

**Resposta:** TripStatusResponse

---

### 5️⃣ Driver Activity Check

Integrado no System Health (ver ponto 1). Drivers com `is_available=False` e sem trip em accepted/arriving/ongoing há mais de 10 minutos → listar em `drivers_unavailable_too_long`.

---

### 6️⃣ Rate Limiting Básico

**Regra:** Máximo **5 requests** de `request_trip` (POST /trips) **por minuto** por utilizador.

**Implementação:**
- Middleware simples ou dependency
- Usar estrutura em memória: `dict[user_id, list[timestamp]]` — limpar timestamps > 1 min
- Se excedido: retornar `429 Too Many Requests`
- **Só ativo quando BETA_MODE=True**

**Não usar dependências pesadas** (ex.: slowapi, redis). Implementação mínima em código.

---

### 7️⃣ Event Logging

**Já existe.** Tabela `interaction_logs` com: timestamp, user_id, role, action, trip_id, previous_state, new_state, latency_ms, payment_status.

`log_interaction()` já falha silenciosamente (try/except, não quebra request).

**Verificar:** Que todos os eventos críticos estão a ser logados:
- trip_created (request_trip)
- trip_accepted
- trip_started
- trip_completed
- trip_cancelled

Se algum faltar, adicionar.

---

### 8️⃣ Admin Metrics Endpoint

**Criar:** `GET /admin/metrics`

**Resposta:**

```json
{
  "active_trips": 0,
  "drivers_available": 0,
  "drivers_busy": 0,
  "trips_requested": 0,
  "trips_ongoing": 0,
  "trips_completed_today": 0
}
```

**Definições:**
- `active_trips`: trips em accepted, arriving ou ongoing
- `drivers_available`: drivers com is_available=True
- `drivers_busy`: drivers com is_available=False (ocupados ou stuck)
- `trips_requested`: trips em requested
- `trips_ongoing`: trips em ongoing
- `trips_completed_today`: trips completed com completed_at no dia atual (UTC)

---

### 9️⃣ BETA_MODE Flag

**Adicionar em** `app/core/config.py`:

```python
BETA_MODE: bool = False
```

**Variável de ambiente:** `BETA_MODE=true` ou `BETA_MODE=false`

**Quando BETA_MODE=True:**
- Ativar rate limiting em request_trip
- Endpoints admin já existem; garantir que estão protegidos
- Logging já está sempre ativo (não depende de BETA_MODE)

**Quando BETA_MODE=False:**
- Rate limiting desativado
- Sistema comporta-se como antes

---

## ESTRUTURA DE CÓDIGO

**Manter estrutura existente:**
- `app/api/routers/admin.py` — adicionar novos endpoints
- `app/services/system_health.py` — expandir verificações
- `app/services/trips.py` — adicionar `cancel_trip_by_admin`
- `app/core/config.py` — adicionar BETA_MODE

**Novos ficheiros (se necessário):**
- `app/services/admin_metrics.py` — lógica para GET /admin/metrics
- `app/middleware/rate_limit.py` ou `app/api/deps.py` — rate limit para request_trip

**Não criar** pasta `app/admin/` separada — manter coesão com routers existentes.

---

## SEGURANÇA

- Todos os endpoints `/admin/*` devem requerer `role=admin`
- Nunca expor estes endpoints publicamente (não listar em docs públicos se aplicável)
- Rate limit aplica-se a utilizadores autenticados (por user_id do token)

---

## TESTES

Adicionar testes simples (pytest):

1. `system-health` retorna estrutura esperada quando OK
2. `trip-debug` retorna dados corretos para trip existente
3. `recover-driver` altera is_available quando driver está stuck
4. `cancel-trip` respeita estados (aceita requested/assigned/accepted, rejeita ongoing/completed)
5. `metrics` retorna contagens coerentes
6. Rate limit retorna 429 quando excedido (com BETA_MODE=True)

---

## RESULTADO ESPERADO

O sistema deve continuar a funcionar exatamente como antes.

As novas funcionalidades apenas permitem:
- observar o sistema
- recuperar estados raros (driver stuck)
- cancelar trips presas em estados iniciais
- monitorizar o beta com métricas e health checks

**Nenhuma lógica crítica deve ser alterada.**

---

## CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Ajustar system_health: thresholds (30 min accepted, 6 h ongoing, 10 min payments)
- [ ] Adicionar drivers_unavailable_too_long em system_health
- [ ] Criar GET /admin/trip-debug/{trip_id}
- [ ] Criar POST /admin/recover-driver/{driver_id}
- [ ] Criar POST /admin/cancel-trip/{trip_id} + cancel_trip_by_admin
- [ ] Criar GET /admin/metrics
- [ ] Adicionar BETA_MODE em config
- [ ] Implementar rate limit (5 request_trip/min por user) condicionado a BETA_MODE
- [ ] Verificar logging em todos os eventos críticos
- [ ] Testes pytest
