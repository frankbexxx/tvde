# ROADMAP — TVDE APP (ATÉ PRODUÇÃO)

## ESTADO ATUAL

- sistema funcional ✔
- A022 (hardening) ✔
- testes base ✔
- Docker + DB estável ✔

👉 fase: CONSOLIDAÇÃO → PRÉ-PRODUÇÃO

---

# 🔴 BLOCO 1 — INTEGRIDADE (CRÍTICO)

## A023_SECURITY_BASE_SEC

- JWT hardening (expiração, validação)
- CORS restrito
- desativar dev endpoints em produção

---

## A024_STRIPE_EDGE_CASES_EXEC

- rever fluxo requires_capture
- garantir consistência entre:
  - Trip.final_price
  - Payment.amount
- validar idempotência total

---

## A025_DB_CONSTRAINTS_DATA

- unicidade:
  - stripe_payment_intent_id (unique, nullable-safe)
- índices:
  - payments lookup
- limpeza de duplicados existentes

👉 alinhado com diagnóstico Cursor

---

# 🟠 BLOCO 2 — OPERAÇÃO

## A026_CRON_JOBS_OPS

- garantir execução automática:
  - timeouts
  - cleanup
- validar frequência (30–60s)

---

## A027_ENVIRONMENTS_OPS

- separar:
  - dev
  - staging
  - produção
- garantir:
  - STRIPE_MOCK só em dev

---

## A028_BACKUPS_OPS

- script backup DB
- guideline:
  - antes de deploy
  - regular

---

# 🟡 BLOCO 3 — OBSERVABILIDADE

## A029_LOG_CORRELATION_OBS

- garantir logs com:
  - trip_id
  - payment_intent_id
  - request_id (se possível)

---

## A030_SYSTEM_HEALTH_OBS

- reforçar:
  - stuck_payments
  - métricas básicas

---

# 🟢 BLOCO 4 — TESTES

## A031_TEST_EXPANSION_TEST

- manter poucos testes
- adicionar apenas:
  - flows com risco financeiro
- NÃO expandir indiscriminadamente

---

## A032_CI_PIPELINE_TEST

- correr testes com PostgreSQL
- eliminar skips em CI
- garantir:
  - regressões bloqueiam merge

---

# 🔵 BLOCO 5 — PREPARAÇÃO PRODUÇÃO

## A033_DEPLOYMENT_READY_OPS

- validar:
  - variáveis ambiente
  - secrets
  - configs Stripe

---

## A034_SECURITY_AUDIT_AUDIT

- revisão completa:
  - endpoints expostos
  - permissões
  - autenticação

---

## A035_FINAL_VALIDATION_AUDIT

- simulação completa:
  - trip real
  - payment real (Stripe test mode)
- validar:
  - logs
  - estados
  - consistência

---

# 🧠 NOTAS

- NÃO adicionar features antes do A035
- NÃO refatorar arquitetura
- foco total em previsibilidade

---

# 🎯 DEFINIÇÃO DE "PRONTO PARA PRODUÇÃO"

- pagamentos confiáveis
- sistema previsível
- erros visíveis
- operação clara

---

# FIM
