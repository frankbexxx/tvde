# PROMPT — EXECUÇÃO A026 OPERAÇÃO

## CONTEXTO

Sistema FastAPI já funcional (A022–A025 completos).

Já existem:

- endpoint `/cron/jobs`
- endpoint `/admin/system-health`

Documento de referência: `docs/prompts/A026_OPERACAO_OPS.md`.

---

## MISSÃO

Implementar A026 — OPERAÇÃO REAL (mínimo de código, alinhado ao existente).

---

## REGRA CRÍTICA

**ADAPTAR AO CÓDIGO EXISTENTE**

- NÃO criar novos sistemas de jobs
- NÃO introduzir Celery / Redis
- NÃO refatorar arquitetura
- USAR apenas endpoints e lógica já existentes

---

## TAREFAS

### 1. Validar `/cron/jobs`

- confirmar que executa: timeouts, ofertas, redispatch, cleanup (já encadeados no router)

### 2. Garantir idempotência

- múltiplas chamadas seguras (sem efeitos duplicados indevidos)

### 3. Logging (mínimo)

- `log_event` para execução do cron (resumo de contagens) e, se fizer sentido, cleanup / timeouts

### 4. Validar `/admin/system-health`

- `stuck_payments` e restantes listas coerentes com o código (read-only)

### 5. Atualizar `OPERATION_CHECKLIST.md`

- secção A026: cron, frequência, verificações diárias, alertas

### 6. Testes automáticos (se possível)

- chamada dupla a `/cron/jobs` com secret válido → 200
- secret inválido → 401

---

## VALIDAÇÃO

- cron manual → funciona
- múltiplas execuções → seguro
- health reflete estado real

---

## RESTRIÇÕES

- não criar arquitetura nova
- não adicionar libs
- não mexer em Stripe
- não mexer em schema de BD

---

## OUTPUT

- código ajustado (mínimo)
- logs (se necessário)
- checklist atualizado
- testes leves

---

# EXECUTAR
