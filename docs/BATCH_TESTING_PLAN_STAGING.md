## Batch testing (1–2 dias) — STAGING (Stripe TEST)

Objetivo: simular mundo real (rede má, concorrência, duplicações, cron) e **registar** resultados.  
Regra: **não corrigir durante os testes** — apenas observar e registar.

Pré‑requisitos (antes do dia 1)

- **Ambiente**: staging com config equivalente a produção, mas **Stripe test**.
- **Health**: `GET /health` deve dar 200 e responder rápido.
- **Cron**: `GET /cron/jobs` disponível via `X-Cron-Secret` (não usar query string).
- **Logs**: ter acesso aos logs do backend (Render / agregador).
- **Webhooks**: acesso ao Stripe test para **replay** de eventos.

### O que observar sempre (mínimo)

Para cada ação importante, registar:

- **trip_id**
- **payment_intent_id** (pi\_…) quando existir
- **from_status → to_status** (em `trip_state_change`)
- **request_id** (header `X-Request-ID` no response; no frontend fica em `ApiError.request_id` em caso de erro)
- timestamps aproximados

Eventos/log_event úteis (nomes atuais)

- `trip_state_change` (tem `from_status`, `to_status`, `trip_id`, e `payment_intent_id` quando aplicável)
- `trip_state_guard_blocked` (tem `action`, `expected`, `actual`, `trip_id`)
- `payment_capture_started`, `payment_capture_success`
- `stripe_webhook_payment_succeeded`, `stripe_webhook_payment_failed`
- `stripe_webhook_duplicate_event` e `stripe_webhook_payment_not_found_ack`
- cron: `cron_started`, `cron_finished`, `cron_job_ok`, `cron_job_error`, `cron_jobs_run`

---

## BLOCO 1 — Fluxo completo (baseline)

### Passos

1. Passenger pede viagem (origem → destino)
2. Driver aceita
3. Driver chega (arriving)
4. Driver inicia (ongoing)
5. Driver termina (completed)
6. Stripe captura (backend)
7. Webhook processa (1x)

### Validar

- Sequência de estados sem saltos inesperados.
- `payment_intent_id` existe após accept.
- Em complete: `payment_capture_started` → `payment_capture_success`.
- Webhook:
  - `stripe_webhook_payment_succeeded` ocorre 1x por PI.
  - Re-delivery do mesmo `evt_` → log idempotente (sem reaplicar).

### Falhas a procurar

- `trip completed` mas payment fica stuck.
- webhook processado mais do que 1x (sem dedupe).
- `trip_state_guard_blocked` em flow normal.

---

## BLOCO 2 — Falhas de rede (realidade)

### Testes

- Desligar internet:
  - antes de aceitar
  - durante trip
  - antes de terminar
- Reload da página em momentos críticos (passenger e driver).

### Validar

- UI recupera estado por polling (sem caos).
- Ações duplicadas são bloqueadas (409/erro explícito + `trip_state_guard_blocked` quando aplicável).

### Procurar

- divergência passenger vs driver por longos períodos
- erros silenciosos (sem request_id / sem log útil)

---

## BLOCO 3 — Duplicação / retries (idempotência)

### Testes

- clicar “aceitar” várias vezes
- clicar “terminar viagem” várias vezes
- replay de webhook manualmente (Stripe test)

### Validar

- apenas 1 driver “ganha”
- sem double capture
- logs mostram dedupe:
  - `stripe_webhook_duplicate_event` / “duplicate delivery”
  - `trip_state_guard_blocked` quando bloqueia

---

## BLOCO 4 — Cancelamentos (edge humano)

### Testes

- cancelar antes de aceitar
- cancelar depois de aceitar
- cancelar durante viagem
- driver cancela

### Validar

- estados corretos
- PaymentIntent cancelado quando aplicável (quando PI está em estado cancelável)
- logs com `trip_id`, `payment_intent_id` e transição

### Procurar

- pagamento capturado indevidamente
- trip “fantasma” (sem driver, mas com payment)

---

## BLOCO 5 — Concorrência (crítico)

### Setup

- 2–3 drivers online
- 2 passageiros pedem ao mesmo tempo

### Testes

- aceitar quase simultâneo (drivers diferentes)

### Validar

- só 1 driver aceita
- outros recebem rejeição clara (409) e não ficam com trip ativa
- sem estado duplicado

---

## BLOCO 6 — Cron sob pressão

### Testes

- deixar trips “a meio”
- não aceitar offers
- não terminar trips
- correr cron manualmente várias vezes

### Validar

- endpoint nunca “rebenta”
- `cron_started` + `cron_finished` sempre presentes
- `cron_job_error` aparece quando algo falha, mas os outros jobs continuam
- resposta `status=partial_error` quando há erros

---

## BLOCO 7 — Pagamentos (máximo crítico)

### Testes (Stripe TEST)

- pagamento normal
- falha de pagamento (simular cenário test — ex.: PaymentIntent em estado não capturável / ou forçar falha via replay de evento `payment_intent.payment_failed` se aplicável ao flow atual)
- webhook duplicado (replay mesmo evt\_)
- webhook atrasado (replay mais tarde)

### Validar

- sem double capture (idempotency keys + guardas)
- webhook não aplica duas vezes
- logs permitem reconstruir 100%

---

## BLOCO 8 — Logs & debug (obrigatório)

### Testes

- provocar 401 (token inválido/expirado) e verificar que o frontend expõe `request_id` no erro quando existir
- provocar 409 (ação inválida) e procurar `trip_state_guard_blocked` no backend

### Validar

- encontrar o erro nos logs em < 2 min com `request_id` + `trip_id`
