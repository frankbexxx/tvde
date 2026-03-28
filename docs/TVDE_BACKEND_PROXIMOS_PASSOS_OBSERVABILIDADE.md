# TVDE backend — próximos passos (alinhado ao código)

Documento de planeamento: **observabilidade e garantias** sem alterar a separação **Trip** (operacional) / **Payment** (financeiro) / **webhook Stripe** (SoT só para `payments`).

---

## Estado atual (confirmado no código)

| Camada                                             | Comportamento                                                                                                                                                                         |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`complete_trip`** (`app/services/trips.py`)      | Após capture bem-sucedido: `Trip.status` → `TripStatus.completed`, `Trip.completed_at` preenchido; `Payment.status` mantém-se **`PaymentStatus.processing`** até o webhook confirmar. |
| **Webhook** (`app/api/routers/webhooks/stripe.py`) | `payment_intent.succeeded` → `Payment.status` → `PaymentStatus.succeeded`; falhas → `PaymentStatus.failed`. **Não altera** `Trip.status`.                                             |

**Conclusão:** o desenho está correto. O webhook **não** deve passar a atualizar `Trip` — evita races e mantém domínios separados.

**Enums reais** (`app/models/enums.py`): `TripStatus` (ex.: `completed`), `PaymentStatus` (`pending`, `processing`, `succeeded`, `failed`). Não existe `payment_failed` em viagem; falha de pagamento é **`PaymentStatus.failed`**.

**Modelos** (`Payment`: `trip_id`, `status`, `total_amount`, `updated_at`, …; `Trip`: `status`, `completed_at`, `updated_at`, relação `payment` 1:1).

---

## 1. Reconciliação (crítico) — já existe base; falta fechar o ciclo operacional

Grande parte do que pediste **já está implementada** em `app/services/system_health.py` → exposto em **`GET /admin/system-health`** (admin JWT).

| Deteção                                         | Implementação                  | Notas                                                                                                                                            |
| ----------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pagamento em **`processing`** “preso”           | `stuck_payments`               | `Payment.status == processing` e `Payment.updated_at` anterior a **`STUCK_PAYMENT_THRESHOLD_MINUTES` (10 min)** — constante no próprio ficheiro. |
| **`completed`** + pagamento **não** `succeeded` | `inconsistent_financial_state` | `issue`: **`trip_completed_but_payment_not_succeeded`** (inclui `processing` e `failed`).                                                        |
| **`succeeded`** + viagem **não** `completed`    | `inconsistent_financial_state` | `issue`: **`payment_succeeded_but_trip_not_completed`**.                                                                                         |
| Viagens `accepted`+ **sem** linha `Payment`     | `missing_payment_records`      | Usa `TRIP_STATUSES_REQUIRING_PAYMENT`.                                                                                                           |

**Próximo passo lógico (código / ops), não reinventar queries:**

1. **Threshold pós-`completed`:** hoje “stuck processing” é global (10 min). Opcional: para viagens já `TripStatus.completed`, usar janela mais curta (ex. 2–5 min) _só_ nesse subconjunto — exige extensão em `get_system_health` ou segundo contador.
2. **Alerta ativo (implementado):** `GET /cron/jobs` chama `run_system_health_check(db)` (`app/cron/system_health_check.py`) após os outros jobs. **`system_health_degraded`** e **`payment_stuck_processing_detected`** só na **transição** para estado degradado (evita spam enquanto o cron continua a correr com o mesmo problema). O segundo evento inclui `sample_payment_ids` (até 3 ids). A resposta JSON de `/cron/jobs` expõe `system_health` com **apenas contagens e `warnings`** — nunca listas completas de entidades. Agendar o endpoint (ex. cron-job.org / Render cron) na frequência desejada — não há scheduler in-process.
3. **Painel admin** (`AdminDashboard` já consome `/admin/system-health`): garantir que a equipa olha para **`inconsistent_financial_state`** e **`stuck_payments`** em produção.

---

## 2. Logs de negócio (alto ROI)

Padrão existente: **`log_event(event_name, **fields)`** em `app/utils/logging.py`(linha única tipo`key=value`).

No webhook já existem eventos como **`stripe_webhook_payment_succeeded`**, **`stripe_webhook_payment_failed`**, **`stripe_webhook_duplicate_event`**, com `trip_id`, `payment_id`, `payment_intent_id`, `stripe_event_id`.

**Melhorias alinhadas ao projeto:**

- Garantir sempre **`trip_id=str(payment.trip_id)`** (já derivável do `Payment` carregado).
- Acrescentar campos úteis sem mudar semântica: ex. **`total_amount`**, **`currency`** (campos do modelo `Payment`), mantendo nomes **snake_case**.
- Opcional: prefixo humano na mensagem só se o formato de `log_event` for estendido; caso contrário manter **nome do evento** descritivo (consistente com `payment_capture_success`, `trip_completion_commit`, etc.).

---

## 3. Idempotência Stripe `event.id` (opcional)

Hoje: idempotência por **estado** da linha `payments` (transições repetidas não duplicam efeito).

Opcional futuro: tabela dedicada (ex. **`stripe_webhook_events`** ou **`processed_stripe_events`**) com **`stripe_event_id` UNIQUE**, `event_type`, `received_at`, para auditoria e replays. Nomenclatura alinhada a **`payments`**, **`audit_events`**.

---

## 4. Alertas simples (sem infra pesada)

- **`logger.warning`** / **`log_event`** quando `get_system_health` devolver listas não vazias ou `status == "degraded"`.
- Casos já cobertos pela lógica atual: ver seção 1; acrescentar “orphan payment” só se existir `Payment` sem `Trip` válido — hoje **orphan_payments** no schema está **deprecated** e vazio; inconsistências úteis passam por **`missing_payment_records`** e **`inconsistent_financial_state`**.

---

## 5. Não fazer

- **Webhook alterar `Trip.status`** — quebra o modelo acordado e introduz races com `complete_trip`.
- **`raise` para o Stripe** no handler do webhook — o código atual tende a **200** mesmo em falhas de BD (evitar retries infinitos); manter essa filosofia.

---

## 6. Checklist de consistência (verificação)

- [ ] Viagem `TripStatus.completed` com fluxo normal → existe **`Payment`** (`uq_payments_trip_id`).
- [ ] `PaymentStatus.succeeded` → esperado **`TripStatus.completed`** (exceto janelas mínimas de corrida; ver `inconsistent_financial_state`).
- [ ] `PaymentStatus.processing` não indefinido após conclusão da viagem → monitorizar **`trip_completed_but_payment_not_succeeded`** e **`stuck_payments`**.

---

## Resumo executivo

| Item                                 | Estado                                                                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Arquitetura trip / payment / webhook | Correta; **não mudar** a fronteira.                                                                           |
| Reconciliação                        | **Grande parte feita** em `get_system_health`; evoluir thresholds pós-completed + **alertas** (cron ou logs). |
| Logs webhook                         | Base presente; **enriquecer** com campos do `Payment` / `Trip` já carregados.                                 |
| Tabela `event_id` Stripe             | Opcional, auditoria / futuro.                                                                                 |

**Prioridade sugerida:** (1) usar e, se necessário, apertar **system-health** + alertas; (2) enriquecer **`log_event`** no webhook; (3) tabela de eventos Stripe se precisares de trilho formal.

---

_Última revisão: alinhado a `app/services/system_health.py`, `app/services/trips.py` (`complete_trip`), `app/api/routers/webhooks/stripe.py`, `app/models/enums.py`, `app/utils/logging.py`._
