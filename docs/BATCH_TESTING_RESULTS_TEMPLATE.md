## Batch testing — resultados (template)

Ambiente:
- URL staging:
- Commit/branch deployado:
- Data:
- Quem testou:

Convenções:
- Impacto: **crítico** (dinheiro/estado), **médio** (UX/ops), **baixo** (cosmético)

---

### BLOCO 1 — Fluxo completo (baseline)
- **Status**: OK / FAIL
- **O que aconteceu**:
- **IDs**:
  - trip_id:
  - payment_intent_id:
  - request_id (se houve erro):
- **Logs relevantes (resumo)**:
  - trip_state_change: from→to (lista)
  - payment_capture_started / success:
  - stripe_webhook_*:
- **Impacto**:

---

### BLOCO 2 — Falhas de rede
- **Status**: OK / FAIL
- **Casos testados**:
  - offline antes de aceitar:
  - offline durante trip:
  - offline antes de terminar:
  - reload em momentos críticos:
- **Resultados**:
- **IDs**:
  - trip_id:
  - payment_intent_id:
  - request_id:
- **Logs relevantes**:
- **Impacto**:

---

### BLOCO 3 — Duplicação / retries
- **Status**: OK / FAIL
- **Casos testados**:
  - accept spam:
  - complete spam:
  - webhook replay:
- **Resultados**:
- **IDs**:
  - trip_id:
  - payment_intent_id:
  - stripe_event_id (evt_):
- **Logs relevantes**:
  - trip_state_guard_blocked:
  - stripe_webhook_duplicate_event / duplicate delivery:
- **Impacto**:

---

### BLOCO 4 — Cancelamentos
- **Status**: OK / FAIL
- **Casos testados**:
  - passenger cancel before accept:
  - passenger cancel after accept:
  - passenger cancel during trip:
  - driver cancel:
- **Resultados**:
- **IDs**:
  - trip_id:
  - payment_intent_id:
- **Logs relevantes**:
- **Impacto**:

---

### BLOCO 5 — Concorrência
- **Status**: OK / FAIL
- **Setup**:
  - drivers online:
  - passengers:
- **Resultados**:
- **IDs**:
  - trip_id(s):
  - offer_id(s):
- **Logs relevantes**:
- **Impacto**:

---

### BLOCO 6 — Cron sob pressão
- **Status**: OK / FAIL
- **Execuções**:
  - nº execuções:
  - alguma `partial_error`?
- **Resultados**:
- **Logs relevantes**:
  - cron_started / cron_finished (duration_ms):
  - cron_job_ok / cron_job_error:
- **Impacto**:

---

### BLOCO 7 — Pagamentos
- **Status**: OK / FAIL
- **Casos testados**:
  - pagamento normal:
  - falha de pagamento:
  - webhook duplicado:
  - webhook atrasado:
- **Resultados**:
- **IDs**:
  - trip_id:
  - payment_intent_id:
  - stripe_event_id:
- **Logs relevantes**:
- **Impacto**:

---

### BLOCO 8 — Logs & debug
- **Status**: OK / FAIL
- **Casos testados**:
  - 401:
  - 409 guard blocked:
  - 500:
- **Resultados**:
- **request_id(s)**:
- **Tempo para encontrar nos logs**:
- **Impacto**:

