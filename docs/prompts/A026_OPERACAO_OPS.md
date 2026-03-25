# A026 — OPERAÇÃO (CRON + RUNTIME REAL)

## OBJETIVO

Garantir que o sistema funciona de forma autónoma em produção.

Eliminar dependência de:

- chamadas manuais
- intervenção do developer
- estados “presos”

---

## PRINCÍPIOS

- operação > código
- previsibilidade > inteligência
- simples > distribuído
- adaptar ao código existente (NÃO reinventar)

---

## ESCOPO

1. Execução de jobs (cron)
2. Timeouts de trips
3. Limpeza de estados inválidos
4. Verificação de saúde do sistema

---

# 1. CRON — EXECUÇÃO REAL

## Ação

Usar endpoint existente:

`GET /cron/jobs?secret=<CRON_SECRET>`

## Jobs executados (código atual)

1. `run_trip_timeouts` — timeouts de estado de viagem  
2. `expire_stale_offers` — ofertas expiradas  
3. `redispatch_expired_trips` — nova ronda de ofertas quando todas expiraram  
4. `run_cleanup` — remoção de `audit_events` antigos (retenção configurável)

## Frequência

- ideal: **30 s**
- aceitável: **60 s**

## Regra

- nunca confiar só em execução manual
- cron externo (ex. cron-job.org) é **obrigatório** em produção

---

# 2. TIMEOUTS — GARANTIA (ESTADOS REAIS NO CÓDIGO)

O modelo usa `TripStatus`: `requested`, `assigned`, `accepted`, `arriving`, `ongoing`, etc. (não existe `searching`).

## `trip_timeouts.py` (atual)

| Situação | Ação |
|----------|------|
| `assigned` há > **2 min** (por `updated_at`) | → `requested` |
| `accepted` há > **10 min** (por `updated_at`) | → `cancelled` (+ motorista disponível) |
| `ongoing` com `started_at` há > **6 h** | → `failed` (+ motorista disponível) |

**Nota:** `arriving` não tem linha dedicada em `trip_timeouts`; o `updated_at` em `accepted` deixa de avançar quando passa a `arriving`, pelo que cenários “presos” em `arriving` devem ser monitorizados via `GET /admin/system-health` (viagens accepted/arriving/ongoing há muito tempo).

## Resultado esperado

- nenhuma viagem em `assigned`/`accepted`/`ongoing` indefinidamente além dos limiares acima

---

# 3. LIMPEZA DE ESTADO

- **Cron:** `run_cleanup` remove `audit_events` mais antigos que `AUDIT_EVENTS_RETENTION_DAYS` (default 90).

---

# 4. HEALTH CHECK

## Endpoint

`GET /admin/system-health` (JWT **admin**)

## Campos úteis

- `stuck_payments` — lista de pagamentos em `processing` há mais de 10 min (vazio = OK)
- `trips_accepted_too_long`, `trips_ongoing_too_long`, `drivers_unavailable_too_long`, `inconsistent_financial_state`, etc.

**Operação:** objetivo operacional é `len(stuck_payments) == 0` em condições normais; listas de aviso devem ser revistas diariamente.

---

# 5. OPERATION_CHECKLIST

Ver `OPERATION_CHECKLIST.md` na raiz do repo — secção **A026 — Operação**.

Testes (automáticos + manuais): `docs/TESTES_A026_OPERACAO.md`.

---

# 6. TESTE MANUAL (OPERADOR)

## Caso 1 — timeout `assigned`

1. Criar trip até ficar `assigned` (ou forçar estado em staging).
2. **Não** aceitar; esperar **> 2 min**.
3. Garantir que `/cron/jobs` corre (30–60 s).
4. **Esperado:** viagem volta a `requested` (ou evolui conforme ofertas).

## Caso 2 — `stuck_payments`

1. Identificar pagamento em `processing` antigo (ou simular em staging).
2. `GET /admin/system-health` deve listar em `stuck_payments` até o webhook Stripe resolver.

---

# 7. NÃO FAZER

- não introduzir Celery
- não usar Redis
- não criar scheduler complexo dentro da app
- não alterar arquitetura de domínio

---

# 8. DEFINIÇÃO DE SUCESSO

- [ ] cron executa automaticamente em produção
- [ ] trips não ficam presas além dos limiares configurados
- [ ] `system-health` reflete estado real
- [ ] intervenção manual não é necessária para rotina diária

---

# RESULTADO

Sistema:

- autónomo
- previsível
- operável em produção

---

# FIM
