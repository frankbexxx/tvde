# A022 — Consolidação (hardening) TVDE

**Nome do ficheiro:** `A022_CONSOLIDACAO_HARDENING.md` (série A0xx, alinhado com `A021_VISUAL_SYSTEM.md`, `A020_…`, `A000_SYSTEM_RULES.md`).

**Tipo:** prompt executável — uma única fonte (fusão das duas versões informais).

---

## Objetivo

Passar de «funciona» a «previsível em produção» **sem**:

- novas features de produto
- refactors grandes
- mudanças de arquitetura
- novas dependências (PyPI)

---

## Princípios

- Bloquear estados e dados inválidos cedo (`HTTPException`, não `Exception` genérica).
- Tornar falhas **visíveis** (logs correlacionáveis, não silêncio).
- Reduzir dependência de memória humana (checklist operacional versionado).
- Respeitar invariantes existentes: webhook continua fonte de verdade para `payment.status`; `complete_trip` não marca `succeeded` manualmente.

---

## Escopo (4 eixos)

1. **Pricing** — integridade (`distance_km` / `duration_min` obrigatórios no `complete_trip`).
2. **Payments** — rastreabilidade (`log_event`) + confirmação operacional do webhook (manual/staging).
3. **Operação** — cron / admin documentados (`docs/ops/OPERATION_CHECKLIST.md`).
4. **Testes** — mínimo crítico: webhook simulado + fluxo `ongoing` → `completed` com `STRIPE_MOCK`.

---

## 1. Pricing — sem fallback sintético no `complete_trip`

**Problema:** `random.uniform` quando métricas são `None` gera preço final artificial.

**Ação:** Se `trip.distance_km` ou `trip.duration_min` for `None`, responder **`422`** com `detail="trip_metrics_required_before_completion"` (contrato estável para clientes).

**Nota:** `create_trip` preenche métricas via `_estimate_trip` (OSRM ou haversine); viagens criadas pelo fluxo normal estão cobertas. Dados legacy ou BD manual sem métricas **falham de forma explícita**.

---

## 2. Payments — visibilidade

### 2.1 Stuck payments

Usar **`GET /admin/system-health`** (JWT admin). Campo `stuck_payments`.

**Regra operacional:** se `len(stuck_payments) > 0` → investigar (Stripe dashboard, logs, webhook).

### 2.2 Logs do fluxo financeiro

Em `complete_trip`, após preço final calculado e antes/depois da captura:

- `payment_capture_started` — `trip_id`, `payment_id`, `payment_intent_id`
- `payment_capture_success` — mesmos identificadores (+ `stripe_mock` quando aplicável)
- `trip_completion_commit` — imediatamente antes de `db.commit()` da conclusão

Não remover `log_event` / `logger` existentes.

### 2.3 Webhook

Confirmar no ambiente: URL pública, `STRIPE_WEBHOOK_SECRET`, eventos `payment_intent.succeeded` e `payment_intent.payment_failed`.

Resposta **200** mesmo quando o PI não existe na BD é **correto para a Stripe** → exige monitorização interna.

---

## 3. Correlação em mais pontos

Garantir `trip_id` + `payment_id` (e `payment_intent_id` quando existir) em:

- `accept_trip` / `accept_offer` (`trip_accepted`)
- `stripe` webhook (eventos que alteram `Payment`)
- cancelamentos: reforçar `trip_state_change` com `payment_id` quando houver `trip.payment`

_(O `request_id` já pode existir via middleware; não obrigatório neste incremento.)_

---

## 4. Jobs / timeouts — operação

**Opção A (recomendada):** `GET /cron/jobs?secret=<CRON_SECRET>` — executa timeouts, expiração de ofertas e cleanup (ver `app/api/routers/cron.py`).

**Opção B:** `POST /admin/run-timeouts` e `POST /admin/run-offer-expiry` com JWT admin.

Frequência sugerida: **30–60 s** em produção (ajustar à carga).

Documentação canónica: **`docs/ops/OPERATION_CHECKLIST.md`** (stub; canónico em `docs/meta/PROXIMA_SESSAO.md` Seção F).

---

## 5. Testes mínimos

| Teste                                                      | Objetivo                                                                                       |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `test_stripe_webhook_marks_payment_succeeded`              | Simular `payment_intent.succeeded` sem API Stripe real (`unittest.mock` em `construct_event`). |
| `test_complete_trip_ongoing_to_completed_with_stripe_mock` | Serviço `complete_trip` com `STRIPE_MOCK`, métricas preenchidas, PI `pi_mock_*`.               |

Não exigir E2E browser neste incremento.

---

## 6. Proibido (A022)

- Filas/workers novos
- Alterar schema por migrations novas neste passo
- Refatorar serviços inteiros «de passagem»
- Otimizações prematuras

---

## 7. Definição de sucesso

- Nenhum fallback aleatório de métricas no `complete_trip`.
- Webhook continua a atualizar `payment.status` (teste verde).
- Logs permitem seguir `trip_id` / `payment_id` no aceite, complete e webhook.
- `OPERATION_CHECKLIST.md` descreve cron/admin e verificação de saúde.
- `pytest` nos novos testes + regressões conhecidas verdes.

---

## 8. Execução no Cursor

1. Ler este ficheiro e o código referenciado.
2. Implementar alterações pontuais.
3. Correr `pytest` no backend.
4. Commit com mensagem clara (ex.: `feat(A022): hardening pricing logs tests operation checklist`).
5. Registar o que foi feito num relatório de sessão (o antigo `docs/A022_RELATORIO_EXECUCAO.md` foi arquivado fora do Git — ver [HISTORICO_FORA_DO_GIT.md](../HISTORICO_FORA_DO_GIT.md)).

---

## Referências no repo

- `docs/PRICING_DECISION.md`
- `docs/DIAGNOSTICO_SISTEMA_TVDE.md`
- `docs/testing/GUIA_TESTES.md`
- `docs/meta/PROXIMA_SESSAO.md`

---

_Fim do prompt A022._
