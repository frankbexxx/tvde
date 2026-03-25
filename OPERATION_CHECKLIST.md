# Operação — TVDE (checklist)

Documento operacional mínimo. Complementa `GUIA_TESTES.md`, `docs/prompts/A022_CONSOLIDACAO_HARDENING.md` e **`docs/prompts/A026_OPERACAO_OPS.md`** (A026).

---

## 1. Jobs agendados (timeouts + ofertas + cleanup)

### Opção recomendada — um único endpoint

- **Método / URL:** `GET /cron/jobs?secret=<CRON_SECRET>`
- **Auth:** query `secret` deve coincidir com variável de ambiente `CRON_SECRET` (configurar em produção).
- **Efeito:** executa `run_trip_timeouts`, expiração de ofertas + redispatch, e `run_cleanup`.
- **Frequência sugerida:** cada **30–60 s** (ajustar à carga; 60 s é aceitável na maioria dos MVPs).

Se `CRON_SECRET` não estiver definido, o endpoint responde **503** — configurar antes de confiar no agendador.

### Opção alternativa — JWT admin

- `POST /admin/run-timeouts`
- `POST /admin/run-offer-expiry`

Ambos requerem token de **admin**.

---

## 2. Verificações diárias (ou após deploy)

1. **`GET /admin/system-health`** (admin JWT)  
   - Rever `stuck_payments`, avisos e listas de viagens/pagamentos anómalos.
2. **Regra:** se `stuck_payments.length > 0` → investigar **já** (Stripe Dashboard, logs com `payment_intent_id`, webhook).

---

## 3. Stripe webhook

- URL pública apontando para `POST /webhooks/stripe`.
- `STRIPE_WEBHOOK_SECRET` igual ao secret do endpoint no Stripe.
- Eventos mínimos: `payment_intent.succeeded`, `payment_intent.payment_failed`.

O handler devolve **200** mesmo quando o PaymentIntent não existe na BD (comportamento esperado para a Stripe) — usar logs e `system-health` para detetar anomalias.

---

## 4. Logs correlacionados (A022)

Procurar por eventos (buffer / consola):

- `payment_capture_started`, `payment_capture_success`, `trip_completion_commit`
- `stripe_webhook_payment_succeeded`, `stripe_webhook_payment_failed`
- `trip_accepted` (inclui `payment_id`, `payment_intent_id`)
- `trip_state_change` em cancelamentos e conclusão (inclui `payment_id` quando existe)

---

## 5. Testes automatizados (backend)

Com PostgreSQL a correr e `DATABASE_URL` válido:

```bash
cd backend
.\venv\Scripts\activate
pytest tests/test_consolidacao_tvde.py tests/test_a025_db_constraints.py tests/test_a026_cron_ops.py -q
```

Sem PostgreSQL, estes testes fazem **skip** explícito.

---

## 6. Migração A025 — `payments.stripe_payment_intent_id` UNIQUE

Antes de aplicar: **backup** (`pg_dump`). Script em `backend/sql/a025_payments_stripe_pi_unique.sql` (detetar duplicados, limpar, `ALTER TABLE` + índice em `status`).

Em produção/staging: correr o SQL na BD correta após validar que não há duplicados (ou após limpeza). Novas instalações com `metadata.create_all` herdam o `UniqueConstraint` do modelo.

### Validação manual (só operador)

1. **Contagem de linhas** — antes do `DELETE` de duplicados e depois (não automatizado no repo):
   - `SELECT COUNT(*) FROM payments;`
   - Esperado: após limpeza, `COUNT` desce apenas pelo número de linhas duplicadas removidas (ex.: 36), não por apagar viagens inteiras.
2. **Duplicados zero** — antes do `ALTER TABLE`:
   - `SELECT stripe_payment_intent_id, COUNT(*) FROM payments WHERE stripe_payment_intent_id IS NOT NULL GROUP BY 1 HAVING COUNT(*) > 1;`
   - Deve devolver 0 linhas.
3. **Testes automáticos** (com Postgres + migração aplicada):
   - `pytest tests/test_consolidacao_tvde.py tests/test_a025_db_constraints.py tests/test_a023_security.py -q`

---

## 7. A026 — Operação (cron + runtime real)

Especificação completa: `docs/prompts/A026_OPERACAO_OPS.md`.  
Testes: `docs/TESTES_A026_OPERACAO.md`.

### CRON

- **Endpoint:** `GET /cron/jobs?secret=<CRON_SECRET>`
- **Frequência:** **30 s** (ideal) ou **60 s** (aceitável) via agendador externo (ex. cron-job.org).
- **Regra:** em produção o cron **não** pode depender só de chamadas manuais.
- **Logs:** após cada execução com sucesso aparecem eventos `cron_jobs_run`, e quando aplicável `trip_timeouts_applied`, `cron_cleanup_audit_events`.

### Verificação diária

- `GET /admin/system-health` (JWT admin).
- Em condições normais: **`stuck_payments`** deve estar **vazio** (lista vazia).
- Rever também `trips_accepted_too_long`, `trips_ongoing_too_long`, `inconsistent_financial_state` se existirem entradas.

### Alertas (operador)

- Pagamento em `processing` **> ~10 min** → aparece em `stuck_payments` (investigar Stripe / webhook).
- Viagens que **não evoluem** dentro dos limiares de `trip_timeouts` + listas do system-health.

### Teste manual (resumo)

1. Trip em `assigned` sem aceitar → após **> 2 min** e com cron a correr → deve passar a `requested` (timeout).
2. Pagamento preso em processing → confirmar entrada em `stuck_payments` até resolução.

---

## 8. Pricing no `complete_trip`

Se aparecer resposta **422** com `trip_metrics_required_before_completion`, a viagem não tem `distance_km` / `duration_min` na BD — corrigir dados ou fluxo que cria a viagem (o fluxo normal de `create_trip` preenche métricas).
